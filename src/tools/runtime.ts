import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss';

const DEFAULT_READY_TIMEOUT = 20_000;

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'launch_start',
        {
            description: [
                'Start a real Launch runtime instance of the current scene (the editor\'s Launch button) so scripts, physics, animation and input actually run.',
                'Opens the launch page in a new browser window with debug logging on; that page connects back automatically as the runtime peer.',
                'Returns { url, sceneId, ready } where ready=true means the runtime is connected and capture_runtime / read_runtime_logs are usable.',
                'This is the prerequisite for all runtime tools. If ready=false, the page may still be loading or popups were blocked; poll read_runtime_logs or retry.',
                'When NOT to use: to screenshot the editor (use capture_viewport); to change the scene (edit-time tools).'
            ].join(' '),
            annotations: {
                title: 'Launch Runtime',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: true
            },
            inputSchema: {
                device: z.enum(['webgpu', 'webgl2', 'webgl1']).optional().describe('Graphics device to launch with (default: project setting)'),
                waitMs: z.number().int().min(0).max(60000).optional().describe('How long to wait for the runtime to connect before returning (default 20000)')
            }
        },
        async ({ device, waitMs }) => {
            try {
                const opened = await wss.raw('launch:start', { device });
                if (!opened || typeof opened !== 'object') {
                    // The editor returned nothing for this method — almost always
                    // an outdated extension that predates the runtime tools.
                    return wss.fail('launch_start', 'The connected editor extension does not support launch_start (it looks outdated). Reload the unpacked extension at chrome://extensions, then DISCONNECT → CONNECT in the popup, and retry.');
                }
                if (opened.error) {
                    return wss.fail('launch_start', opened.error);
                }
                const ready = await wss.waitForRuntime(waitMs ?? DEFAULT_READY_TIMEOUT);
                const data = { ...(opened.data as object || {}), ready };
                return wss.ok(
                    'launch_start',
                    data,
                    ready ? undefined : { _hint: 'Runtime did not connect in time. The launch page may still be loading (poll read_runtime_logs), or popups are blocked for the editor origin.' }
                );
            } catch (err: any) {
                return wss.fail('launch_start', err.message);
            }
        }
    );

    server.registerTool(
        'launch_stop',
        {
            description: [
                'Stop the running Launch instance started by launch_start (closes the launch window). Returns { stopped }.',
                'When NOT to use: there is no need to call this between captures — keep the instance running and re-capture.'
            ].join(' '),
            annotations: {
                title: 'Stop Runtime',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: true,
                openWorldHint: false
            }
        },
        () => {
            return wss.call('launch_stop', 'launch:stop');
        }
    );

    server.registerTool(
        'capture_runtime',
        {
            description: [
                'Screenshot the RUNNING Launch instance (not the editor preview) as a downscaled WebP image — the agent\'s "eye" for visually verifying play-mode behavior.',
                'Requires launch_start first. Captures the live frame buffer, so what you see reflects scripts/physics/animation actually running.',
                'When NOT to use: before launch_start (use capture_viewport for edit-time visuals).'
            ].join(' '),
            annotations: {
                title: 'Capture Runtime',
                readOnlyHint: true,
                openWorldHint: false
            }
        },
        () => {
            return wss.callImage('capture_runtime', 'runtime:capture');
        }
    );

    server.registerTool(
        'read_runtime_logs',
        {
            description: [
                'Read console output (log/info/warn/error), uncaught exceptions and unhandled rejections from the RUNNING Launch instance — the first-line signal for runtime bugs.',
                'Requires launch_start first. Returns the most recent entries first, paginated (meta has total/count/_has_more/_next_cursor).',
                'Defaults to warnings + errors; set level="all" (or debug/info/warn/error as a minimum severity) to widen, and keyword to filter. An empty result is success, not an error.',
                'When NOT to use: to read edit-time editor logs (this is the launched app only).'
            ].join(' '),
            annotations: {
                title: 'Read Runtime Logs',
                readOnlyHint: true,
                openWorldHint: false
            },
            inputSchema: {
                level: z.enum(['all', 'debug', 'info', 'warn', 'error']).optional().describe('Minimum severity to include (default: warn)'),
                keyword: z.string().optional().describe('Only include entries whose text contains this (case-insensitive)'),
                limit: z.number().int().min(1).max(1000).optional().describe('Max entries to return (default 100)'),
                offset: z.number().int().min(0).optional().describe('Entries to skip from the newest (use _next_cursor)')
            }
        },
        (options) => {
            return wss.call('read_runtime_logs', 'runtime:logs', {
                level: options.level ?? 'warn',
                keyword: options.keyword,
                limit: options.limit,
                offset: options.offset
            });
        }
    );

    const KeyEventSchema = z.object({
        type: z.literal('key'),
        key: z.string().describe('Key name: a single char ("w", "1"), or a named key ("Space", "Enter", "ArrowUp", "Shift", "Escape")'),
        action: z.enum(['press', 'down', 'up']).optional().describe('press = down+up (default); use down/up to hold across calls'),
        holdMs: z.number().int().min(0).max(10000).optional().describe('For action=press, hold the key down this long before releasing'),
        repeat: z.number().int().min(1).max(50).optional().describe('Repeat this key event N times')
    });
    const MouseEventSchema = z.object({
        type: z.literal('mouse'),
        action: z.enum(['move', 'down', 'up', 'click']),
        x: z.number().optional().describe('X in CSS pixels from the canvas top-left'),
        y: z.number().optional().describe('Y in CSS pixels from the canvas top-left'),
        button: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional().describe('0=left (default), 1=middle, 2=right')
    });
    const TouchEventSchema = z.object({
        type: z.literal('touch'),
        action: z.enum(['start', 'move', 'end', 'tap']),
        x: z.number().describe('X in CSS pixels from the canvas top-left'),
        y: z.number().describe('Y in CSS pixels from the canvas top-left'),
        id: z.number().int().optional().describe('Touch identifier (for multi-touch sequences)')
    });

    server.registerTool(
        'inject_input',
        {
            description: [
                'Dispatch keyboard / mouse / touch input to the RUNNING Launch instance so you can drive end-to-end interactions ("press W to move", "click a button", "tap the screen").',
                'Requires launch_start first. Events run in order; coordinates are CSS pixels from the canvas top-left (match capture_runtime\'s framing). Returns { dispatched }.',
                'Patterns: key press with holdMs to move for a duration; mouse click at (x,y); a down→move…→up sequence for dragging; touch tap for mobile UI.',
                'After injecting, use capture_runtime / read_runtime_logs / query the scene to observe the effect.',
                'When NOT to use: to change entity data directly (use modify_entities) or before launch_start.'
            ].join(' '),
            annotations: {
                title: 'Inject Runtime Input',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                events: z.array(z.discriminatedUnion('type', [KeyEventSchema, MouseEventSchema, TouchEventSchema])).nonempty().describe('Ordered list of input events to dispatch'),
                betweenMs: z.number().int().min(0).max(10000).optional().describe('Delay between consecutive events (default 0)')
            }
        },
        ({ events, betweenMs }) => {
            return wss.call('inject_input', 'runtime:input', { events, betweenMs });
        }
    );
};

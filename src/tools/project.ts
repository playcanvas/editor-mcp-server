import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../wss.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'modify_project_settings',
        {
            description: [
                'Modify project-wide settings such as physics engine, rendering device (WebGL2/WebGPU), layers, loading screen, script loading order, input, and resolution.',
                'Pass a partial object of setting path/value pairs (nested objects or dot-paths, e.g. { enableWebGpu: true, "layers.0.name": "World" }); only the provided fields change. Returns the full resulting project settings snapshot.',
                'When NOT to use: to change per-scene settings like fog or gravity (use modify_scene_settings) or a single entity (use modify_entities).'
            ].join(' '),
            annotations: {
                title: 'Modify Project Settings',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                settings: z.record(z.unknown()).describe('Partial project settings to change (path/value pairs); only provided fields are modified')
            }
        },
        ({ settings }) => {
            return wss.call('project:settings:modify', settings);
        }
    );

    server.registerTool(
        'query_project_settings',
        {
            description: [
                'Read the current project-wide settings (physics, rendering device, layers, loading screen, script loading order, input, resolution). Returns the full settings object.',
                'When NOT to use: to change settings (use modify_project_settings) or to read per-scene settings (use query_scene_settings).'
            ].join(' '),
            annotations: {
                title: 'Query Project Settings',
                readOnlyHint: true,
                openWorldHint: false
            }
        },
        () => {
            return wss.call('project:settings:query');
        }
    );
};

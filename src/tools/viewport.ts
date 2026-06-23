import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss';
import { EntityIdSchema } from './schema/common';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'capture_viewport',
        {
            description: [
                'Capture a screenshot of the editor viewport (the current editing camera view) as a downscaled WebP image, for visual verification of edit-time state.',
                'Tip: call focus_viewport first to frame the entities you care about.',
                'Note: this renders the editor preview only (scripts/physics/animation are NOT running). When NOT to use: to verify play-mode/runtime behavior (runtime capture is not yet available).'
            ].join(' '),
            annotations: {
                title: 'Capture Viewport',
                readOnlyHint: true,
                openWorldHint: false
            }
        },
        () => {
            return wss.callImage('capture_viewport', 'viewport:capture');
        }
    );

    server.registerTool(
        'focus_viewport',
        {
            description: [
                'Frame the editor camera on the given entities, optionally from a preset view (top/front/etc.) or a custom yaw/pitch. Useful before capture_viewport.',
                'Returns { focused: <count> }. When NOT to use: to move an in-scene camera entity (use modify_entities on its transform).'
            ].join(' '),
            annotations: {
                title: 'Focus Viewport',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                ids: z.array(EntityIdSchema).nonempty().describe('Entity resource_ids to frame'),
                view: z.enum(['top', 'bottom', 'front', 'back', 'left', 'right', 'perspective']).optional().describe('Preset camera orientation'),
                yaw: z.number().min(-180).max(180).optional().describe('Custom horizontal angle (degrees); ignored if view is set'),
                pitch: z.number().min(-90).max(90).optional().describe('Custom vertical angle (degrees); ignored if view is set')
            }
        },
        ({ ids, view, yaw, pitch }) => {
            return wss.call('focus_viewport', 'viewport:focus', ids, { view, yaw, pitch });
        }
    );
};

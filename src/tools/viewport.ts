import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss';
import { EntityIdSchema } from './schema/common';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'capture_viewport',
        {
            description: 'Capture a screenshot of the Editor viewport. Use this to visually verify what you have built.'
        },
        () => {
            return wss.callImage('viewport:capture');
        }
    );

    server.registerTool(
        'focus_viewport',
        {
            description: 'Select entities and focus the Editor viewport camera on them. Optionally specify a camera viewpoint.',
            inputSchema: {
                ids: z.array(EntityIdSchema).nonempty().describe('Array of entity IDs to select and focus on'),
                view: z.enum(['top', 'bottom', 'front', 'back', 'left', 'right', 'perspective']).optional().describe('Preset camera view. Mutually exclusive with yaw/pitch.'),
                yaw: z.number().min(-180).max(180).optional().describe('Horizontal angle in degrees (-180 to 180). 0=front, 90=right, -90=left, 180=back'),
                pitch: z.number().min(-90).max(90).optional().describe('Vertical angle in degrees (-90 to 90). 0=level, -90=top-down, 90=bottom-up')
            }
        },
        ({ ids, view, yaw, pitch }) => {
            return wss.call('viewport:focus', ids, { view, yaw, pitch });
        }
    );
};

import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss';
import { EntityIdSchema } from './schema/common';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'capture_viewport',
        {
            description: 'Capture viewport screenshot'
        },
        () => {
            return wss.callImage('viewport:capture');
        }
    );

    server.registerTool(
        'focus_viewport',
        {
            description: 'Focus viewport on entities',
            inputSchema: {
                ids: z.array(EntityIdSchema).nonempty().describe('Entity IDs to focus'),
                view: z.enum(['top', 'bottom', 'front', 'back', 'left', 'right', 'perspective']).optional(),
                yaw: z.number().min(-180).max(180).optional().describe('Horizontal angle'),
                pitch: z.number().min(-90).max(90).optional().describe('Vertical angle')
            }
        },
        ({ ids, view, yaw, pitch }) => {
            return wss.call('viewport:focus', ids, { view, yaw, pitch });
        }
    );
};

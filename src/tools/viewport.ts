import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss';
import { EntityIdSchema } from './schema/common';

export const register = (mcp: McpServer, wss: WSS) => {
    mcp.tool(
        'capture_viewport',
        'Capture a screenshot of the Editor viewport. Use this to visually verify what you have built.',
        {},
        () => {
            return wss.callImage('viewport:capture');
        }
    );

    mcp.tool(
        'focus_viewport',
        'Select entities and focus the Editor viewport camera on them',
        {
            ids: z.array(EntityIdSchema).nonempty().describe('Array of entity IDs to select and focus on')
        },
        ({ ids }) => {
            return wss.call('viewport:focus', ids);
        }
    );
};

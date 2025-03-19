import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'asset_list',
        'List all assets',
        {},
        async () => {
            try {
                const res = await wss.send('asset:list');
                if (res === undefined) {
                    throw new Error('Failed to list assets');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Assets: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: err.message
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        'asset_delete',
        'Delete an asset',
        {
            id: z.number()
        },
        async ({ id }) => {
            try {
                const res = await wss.send('asset:delete', id);
                if (res === undefined) {
                    throw new Error('Failed to delete asset');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Deleted asset ${id}: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: err.message
                    }],
                    isError: true
                };
            }
        }
    );
};

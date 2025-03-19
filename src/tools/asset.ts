import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'list_assets',
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
        'delete_assets',
        'Delete one or more assets',
        {
            ids: z.array(z.number())
        },
        async ({ ids }) => {
            try {
                const res = await wss.send('asset:delete', ids);
                if (res === undefined) {
                    throw new Error('Failed to delete asset');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Deleted assets: ${JSON.stringify(res)}`
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
        'instantiate_assets',
        'Instantiate one or more asset',
        {
            ids: z.array(z.number())
        },
        async ({ ids }) => {
            try {
                const res = await wss.send('asset:instantiate', ids);
                if (res === undefined) {
                    throw new Error('Failed to instantiate asset');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Instantiated assets: ${JSON.stringify(res)}`
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

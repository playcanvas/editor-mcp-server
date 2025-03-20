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
                const { data, error } = await wss.send('assets:list');
                if (error) {
                    throw new Error(error);
                }
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(data)
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
                const { data, error } = await wss.send('assets:delete', ids);
                if (error) {
                    throw new Error(error);
                }
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(data)
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
                const { data, error } = await wss.send('assets:instantiate', ids);
                if (error) {
                    throw new Error(error);
                }
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(data)
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

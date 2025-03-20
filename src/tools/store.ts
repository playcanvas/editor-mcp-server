import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss.ts';

const orderEnum = {
    'asc': 1,
    'desc': -1
};

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'store_search',
        'Search for an asset in the store',
        {
            // store: z.enum(['playcanvas', 'sketchfab']).optional(),
            search: z.string(),
            order: z.enum(['asc', 'desc']).optional(),
            skip: z.number().optional(),
            limit: z.number().optional()
        },
        async ({ search, order, skip, limit }) => {
            try {
                const { data, error } = await wss._send('store:playcanvas:list', {
                    search,
                    order: order ? orderEnum[order] : undefined,
                    skip,
                    limit
                });
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
        'store_get',
        'Get an asset from the store',
        {
            // store: z.enum(['playcanvas', 'sketchfab']).optional(),
            id: z.string()
        },
        ({ id }) => {
            return wss.call('store:playcanvas:get', id);
        }
    );

    server.tool(
        'store_download',
        'Download an asset from the store',
        {
            // store: z.enum(['playcanvas', 'sketchfab']).optional(),
            id: z.string(),
            name: z.string(),
            license: z.object({
                author: z.string(),
                authorUrl: z.string().url(),
                license: z.string()
            })
        },
        ({ id, name, license }) => {
            return wss.call('store:playcanvas:download', id, name, license);
        }
    );
};

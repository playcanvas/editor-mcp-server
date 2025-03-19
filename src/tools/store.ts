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
            store: z.enum(['playcanvas', 'sketchfab']).optional(),
            search: z.string(),
            order: z.enum(['asc', 'desc']).optional(),
            skip: z.number().optional(),
            limit: z.number().optional()
        },
        async ({ store, search, order, skip, limit }) => {
            try {
                const res = await wss.send(`store:${store}:list`, {
                    search,
                    order: order ? orderEnum[order] : undefined,
                    skip,
                    limit
                });
                if (res === undefined) {
                    throw new Error('Failed to search for assets');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Search results: ${JSON.stringify(res)}`
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
            store: z.enum(['playcanvas', 'sketchfab']).optional(),
            id: z.string()
        },
        async ({ store, id }) => {
            try {
                const res = await wss.send(`store:${store}:get`, id);
                if (res === undefined) {
                    throw new Error('Failed to get asset');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Asset: ${JSON.stringify(res)}`
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
        'store_download',
        'Download an asset from the store',
        {
            store: z.enum(['playcanvas', 'sketchfab']).optional(),
            id: z.string(),
            name: z.string(),
            license: z.object({
                author: z.string(),
                authorUrl: z.string().url(),
                license: z.string()
            })
        },
        async ({ store, id, name, license }) => {
            try {
                const res = await wss.send(`store:${store}:clone`, id, name, license);
                if (res === undefined) {
                    throw new Error('Failed to download asset');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Downloaded asset: ${JSON.stringify(res)}`
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

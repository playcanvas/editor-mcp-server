import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../wss';

const orderEnum = {
    'asc': 1,
    'desc': -1
};

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'store_search',
        {
            description: [
                'Search the public PlayCanvas asset store by keyword. Results are paginated via skip + limit.',
                'Reaches an external service over the network. Use store_get for full details of a result, then store_download to import it.',
                'When NOT to use: to search assets already in this project (use list_assets).'
            ].join(' '),
            annotations: {
                title: 'Search Store',
                readOnlyHint: true,
                openWorldHint: true
            },
            inputSchema: {
                search: z.string().describe('Search keywords'),
                order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
                skip: z.number().int().min(0).optional().describe('Number of results to skip (pagination)'),
                limit: z.number().int().min(1).optional().describe('Max results to return')
            }
        },
        ({ search, order, skip, limit }) => {
            return wss.call('store:playcanvas:list', {
                search,
                order: order ? orderEnum[order] : undefined,
                skip,
                limit
            });
        }
    );

    server.registerTool(
        'store_get',
        {
            description: [
                'Get full details (including license info needed to download) for a single public store asset by id.',
                'Reaches an external service over the network. When NOT to use: to fetch a project-local asset (use list_assets).'
            ].join(' '),
            annotations: {
                title: 'Get Store Asset',
                readOnlyHint: true,
                openWorldHint: true
            },
            inputSchema: {
                id: z.string().describe('Store asset id (from store_search)')
            }
        },
        ({ id }) => {
            return wss.call('store:playcanvas:get', id);
        }
    );

    server.registerTool(
        'store_download',
        {
            description: [
                'Clone/import a public store asset into the current project. Requires the license fields returned by store_get.',
                'Reaches an external service over the network and adds new assets to the project. When NOT to use: for assets already in the project.'
            ].join(' '),
            annotations: {
                title: 'Download Store Asset',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: true
            },
            inputSchema: {
                id: z.string().describe('Store asset id (from store_search)'),
                name: z.string().describe('Name for the imported asset'),
                license: z.object({
                    author: z.string(),
                    authorUrl: z.string().url(),
                    license: z.string()
                }).describe('License info from store_get')
            }
        },
        ({ id, name, license }) => {
            return wss.call('store:playcanvas:clone', id, name, license);
        }
    );
};

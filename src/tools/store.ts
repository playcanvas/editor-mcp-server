import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../wss.ts';

import { AssetIdSchema } from './schema/common.ts';

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
                }).describe('License info from store_get'),
                folder: AssetIdSchema.optional()
            }
        },
        ({ id, name, license, folder }) => {
            return wss.call('store:playcanvas:clone', id, name, license, folder);
        }
    );

    server.registerTool(
        'list_store_licenses',
        {
            description: 'List valid Store licenses for project imports.',
            annotations: { title: 'List Store Licenses', readOnlyHint: true, openWorldHint: true }
        },
        () => wss.call('store:licenses:list')
    );

    server.registerTool(
        'sketchfab_search',
        {
            description: 'Search downloadable Sketchfab models.',
            annotations: { title: 'Search Sketchfab', readOnlyHint: true, openWorldHint: true },
            inputSchema: {
                search: z.string().optional(),
                order: z.string().optional(),
                cursor: z.string().optional(),
                limit: z.number().int().min(1).max(24).optional()
            }
        },
        ({ search, order, cursor, limit }) =>
            wss.call('store:sketchfab:list', { search, order, skip: cursor, limit })
    );

    server.registerTool(
        'sketchfab_get',
        {
            description: 'Get a Sketchfab model by uid.',
            annotations: { title: 'Get Sketchfab Model', readOnlyHint: true, openWorldHint: true },
            inputSchema: { uid: z.string().min(1) }
        },
        ({ uid }) => wss.call('store:sketchfab:get', uid)
    );

    server.registerTool(
        'sketchfab_import',
        {
            description: 'Import a downloadable Sketchfab model into the current project.',
            annotations: {
                title: 'Import Sketchfab Model',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: true
            },
            inputSchema: {
                uid: z.string().min(1),
                name: z.string().min(1),
                license: z.string().min(1),
                folder: AssetIdSchema.optional()
            }
        },
        ({ uid, name, license, folder }) => wss.call('store:sketchfab:clone', uid, name, license, folder)
    );

    server.registerTool(
        'my_assets_search',
        {
            description: 'Search assets owned by the current user.',
            annotations: { title: 'Search My Assets', readOnlyHint: true, openWorldHint: true },
            inputSchema: {
                search: z.string().optional(),
                skip: z.number().int().min(0).optional(),
                limit: z.number().int().min(1).optional()
            }
        },
        (options) => wss.call('store:myassets:list', options)
    );

    server.registerTool(
        'my_assets_import',
        {
            description: 'Import an asset owned by the current user into the current project.',
            annotations: {
                title: 'Import My Asset',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                id: z.string().min(1),
                name: z.string().min(1),
                folder: AssetIdSchema.optional()
            }
        },
        ({ id, name, folder }) => wss.call('store:myassets:clone', id, name, folder)
    );
};

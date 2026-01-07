import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss';
import { CssCreateSchema, FolderCreateSchema, HtmlCreateSchema, MaterialCreateSchema, ScriptCreateSchema, ShaderCreateSchema, TemplateCreateSchema, TextCreateSchema } from './schema/asset';
import { AssetIdSchema } from './schema/common';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'create_assets',
        {
            description: 'Create one or more assets',
            inputSchema: {
                assets: z.array(
                    z.union([
                        CssCreateSchema,
                        FolderCreateSchema,
                        HtmlCreateSchema,
                        MaterialCreateSchema,
                        ScriptCreateSchema,
                        ShaderCreateSchema,
                        TemplateCreateSchema,
                        TextCreateSchema
                    ])
                ).nonempty().describe('Array of assets to create.')
            }
        },
        ({ assets }) => {
            return wss.call('assets:create', assets);
        }
    );

    server.registerTool(
        'list_assets',
        {
            description: 'List all assets with the option to filter by type',
            inputSchema: {
                type: z.enum(['css', 'cubemap', 'folder', 'font', 'html', 'json', 'material', 'render', 'script', 'shader', 'template', 'text', 'texture']).optional().describe('The type of assets to list. If not specified, all assets will be listed.')
            }
        },
        ({ type }) => {
            return wss.call('assets:list', type);
        }
    );

    server.registerTool(
        'delete_assets',
        {
            description: 'Delete one or more assets',
            inputSchema: {
                ids: z.array(AssetIdSchema).nonempty().describe('The asset IDs of the assets to delete')
            }
        },
        ({ ids }) => {
            return wss.call('assets:delete', ids);
        }
    );

    server.registerTool(
        'instantiate_template_assets',
        {
            description: 'Instantiate one or more template assets',
            inputSchema: {
                ids: z.array(AssetIdSchema).nonempty().describe('The asset IDs of the template assets to instantiate')
            }
        },
        ({ ids }) => {
            return wss.call('assets:instantiate', ids);
        }
    );
};

import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss';
import { CssCreateSchema, FolderCreateSchema, HtmlCreateSchema, MaterialCreateSchema, ScriptCreateSchema, ShaderCreateSchema, TemplateCreateSchema, TextCreateSchema } from './schema/asset';
import { AssetIdSchema } from './schema/common';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'create_assets',
        {
            description: 'Create assets',
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
                ).nonempty()
            }
        },
        ({ assets }) => {
            return wss.call('assets:create', assets);
        }
    );

    server.registerTool(
        'list_assets',
        {
            description: 'List assets. Returns summary by default (id, name, type, folder, tags). Use full=true for complete asset data.',
            inputSchema: {
                full: z.boolean().optional().describe('Return full asset JSON instead of summary'),
                type: z.enum(['css', 'cubemap', 'folder', 'font', 'html', 'json', 'material', 'render', 'script', 'shader', 'template', 'text', 'texture']).optional().describe('Filter by type'),
                name: z.string().optional().describe('Filter by name (case-insensitive contains)'),
                tag: z.string().optional().describe('Filter by tag')
            }
        },
        (options) => {
            return wss.call('assets:list', options);
        }
    );

    server.registerTool(
        'delete_assets',
        {
            description: 'Delete assets',
            inputSchema: {
                ids: z.array(AssetIdSchema).nonempty()
            }
        },
        ({ ids }) => {
            return wss.call('assets:delete', ids);
        }
    );

    server.registerTool(
        'instantiate_template_assets',
        {
            description: 'Instantiate templates',
            inputSchema: {
                ids: z.array(AssetIdSchema).nonempty().describe('Template asset IDs')
            }
        },
        ({ ids }) => {
            return wss.call('assets:instantiate', ids);
        }
    );
};

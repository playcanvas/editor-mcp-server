import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss';
import { CssCreateSchema, FolderCreateSchema, HtmlCreateSchema, MaterialCreateSchema, ScriptCreateSchema, ShaderCreateSchema, TemplateCreateSchema, TextCreateSchema } from './schema/asset';
import { AssetIdSchema } from './schema/common';

export const register = (mcp: McpServer, wss: WSS) => {
    mcp.tool(
        'create_assets',
        'Create one or more assets',
        {
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
            ).min(1).describe('Array of assets to create.')
        },
        ({ assets }) => {
            return wss.call('assets:create', assets);
        }
    );
    mcp.tool(
        'list_assets',
        'List all assets with the option to filter by type',
        {
            type: z.enum(['css', 'cubemap', 'folder', 'font', 'html', 'json', 'material', 'render', 'script', 'template', 'text', 'texture']).optional().describe('The type of assets to list. If not specified, all assets will be listed.')
        },
        ({ type }) => {
            return wss.call('assets:list', type);
        }
    );

    mcp.tool(
        'delete_assets',
        'Delete one or more assets',
        {
            ids: z.array(AssetIdSchema).describe('The asset IDs of the assets to delete')
        },
        ({ ids }) => {
            return wss.call('assets:delete', ids);
        }
    );

    mcp.tool(
        'instantiate_template_assets',
        'Instantiate one or more template assets',
        {
            ids: z.array(AssetIdSchema).describe('The asset IDs of the template assets to instantiate')
        },
        ({ ids }) => {
            return wss.call('assets:instantiate', ids);
        }
    );
};

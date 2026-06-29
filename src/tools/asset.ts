import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss';
import { CssCreateSchema, FolderCreateSchema, HtmlCreateSchema, MaterialCreateSchema, ScriptCreateSchema, ShaderCreateSchema, TemplateCreateSchema, TextCreateSchema } from './schema/asset';
import { AssetIdSchema } from './schema/common';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'create_assets',
        {
            description: [
                'Create one or more project assets: material, script, template, text, html, css, shader, or folder.',
                'Each asset is { type, options }; options vary by type (e.g. material takes data, script takes filename/text, template takes an entity id).',
                'Returns the created asset summaries (id, name, type, folder) inline.',
                'When NOT to use: to add an existing asset to an entity (use add_components/modify_entities) or to change a material\'s look after creation (use set_material_properties).'
            ].join(' '),
            annotations: {
                title: 'Create Assets',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            },
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
            description: [
                'List project assets, returning compact summaries by default (id, name, type, folder, tags).',
                'Results are paginated: use limit (default 50) and offset; the response meta includes total, count, hasMore and nextCursor.',
                'Filter with type, name (case-insensitive contains) and/or tag. Use full=true only when you need the complete asset JSON (large).',
                'An empty result is a successful, empty list (not an error).',
                'When NOT to use: to search the public asset store (use store_search).'
            ].join(' '),
            annotations: {
                title: 'List Assets',
                readOnlyHint: true,
                openWorldHint: false
            },
            inputSchema: {
                full: z.boolean().optional().describe('Return full asset JSON instead of the compact summary (much larger)'),
                type: z.enum(['css', 'cubemap', 'folder', 'font', 'html', 'json', 'material', 'render', 'script', 'shader', 'template', 'text', 'texture']).optional().describe('Filter by asset type'),
                name: z.string().optional().describe('Filter by name (case-insensitive contains)'),
                tag: z.string().optional().describe('Filter by tag'),
                limit: z.number().int().min(1).max(500).optional().describe('Max assets to return (default 50)'),
                offset: z.number().int().min(0).optional().describe('Number of assets to skip (use nextCursor from a previous page)')
            }
        },
        (options) => {
            return wss.call('assets:list', options);
        }
    );

    server.registerTool(
        'delete_assets',
        {
            description: [
                'Permanently delete assets by id. This is destructive; entities referencing the deleted assets will lose those references.',
                'Returns { deleted: <count> }.',
                'When NOT to use: to remove an asset reference from an entity without deleting the asset itself (use modify_entities).'
            ].join(' '),
            annotations: {
                title: 'Delete Assets',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: true,
                openWorldHint: false
            },
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
            description: [
                'Instantiate template assets into the scene, creating entity hierarchies from them. Returns the created entity summaries.',
                'When NOT to use: for non-template assets (only type="template" assets can be instantiated) or to build an entity from scratch (use create_entities).'
            ].join(' '),
            annotations: {
                title: 'Instantiate Template Assets',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                ids: z.array(AssetIdSchema).nonempty().describe('Template asset ids to instantiate')
            }
        },
        ({ ids }) => {
            return wss.call('assets:instantiate', ids);
        }
    );
};

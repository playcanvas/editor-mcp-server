import { readFile, stat, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../wss.ts';

import {
    AnimStateGraphCreateSchema,
    BundleCreateSchema,
    CssCreateSchema,
    CubemapCreateSchema,
    FolderCreateSchema,
    HtmlCreateSchema,
    I18nCreateSchema,
    JsonCreateSchema,
    MaterialCreateSchema,
    ScriptCreateSchema,
    ShaderCreateSchema,
    SpriteCreateSchema,
    TemplateCreateSchema,
    TextCreateSchema
} from './schema/asset.ts';
import { AssetIdSchema, EntityIdSchema } from './schema/common.ts';

// ponytail: base64 keeps one transport; add streaming if 20 mib imports are common
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const AssetOverrideSchema = z.object({
    resource_id: EntityIdSchema,
    override_type: z.string().min(1),
    path: z.string().optional()
}).passthrough();

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'create_assets',
        {
            description: [
                'Create one or more native data/text assets. Imported binary assets use upload_assets.',
                'Each asset is { type, options }; options vary by type (e.g. material takes data, script takes filename/text, template takes an entity id).',
                'Successful batches return the existing asset-summary array. Failed batches retain error status and expose succeeded and failed entries in response metadata.',
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
                        AnimStateGraphCreateSchema,
                        BundleCreateSchema,
                        CssCreateSchema,
                        CubemapCreateSchema,
                        FolderCreateSchema,
                        HtmlCreateSchema,
                        I18nCreateSchema,
                        JsonCreateSchema,
                        MaterialCreateSchema,
                        ScriptCreateSchema,
                        ShaderCreateSchema,
                        SpriteCreateSchema,
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
                type: z.enum(['animation', 'animstategraph', 'audio', 'binary', 'bundle', 'container', 'css', 'cubemap', 'folder', 'font', 'gsplat', 'html', 'json', 'material', 'model', 'render', 'scene', 'script', 'shader', 'sprite', 'template', 'text', 'texture', 'textureatlas', 'wasm']).optional().describe('Filter by asset type'),
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
                ids: z.array(AssetIdSchema).nonempty().describe('Template asset ids to instantiate'),
                parentId: EntityIdSchema.optional().describe('Parent entity resource_id; defaults to the scene root'),
                index: z.number().int().min(0).optional().describe('Insertion index under the parent')
            }
        },
        ({ ids, parentId, index }) => {
            return wss.call('templates:instantiate', { assetIds: ids, parentId, index });
        }
    );

    server.registerTool(
        'upload_assets',
        {
            description: `Upload local files into the designated project, or replace an existing asset source by providing its id. Files are limited to ${MAX_FILE_BYTES / 1024 / 1024} MiB each; the result separates succeeded and failed entries.`,
            annotations: {
                title: 'Upload Assets',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                assets: z.array(z.object({
                    id: AssetIdSchema.optional().describe('Existing asset id whose source file should be replaced'),
                    path: z.string().min(1).describe('Local file path'),
                    type: z.enum(['animation', 'audio', 'binary', 'css', 'font', 'gsplat', 'html', 'json', 'scene', 'script', 'shader', 'text', 'texture', 'textureatlas', 'wasm']).describe('PlayCanvas import type; use scene for model source files such as GLB or FBX'),
                    folder: AssetIdSchema.optional(),
                    name: z.string().optional(),
                    tags: z.array(z.string()).optional(),
                    data: z.record(z.any()).optional(),
                    preload: z.boolean().optional(),
                    mime: z.string().optional(),
                    settings: z.record(z.any()).optional().describe('Per-upload texture or scene import overrides; saved defaults are under projectUser editor.pipeline settings')
                })).nonempty()
            }
        },
        async ({ assets }) => {
            const [error, payload] = await Promise.resolve().then(async () => {
                const files = await Promise.all(assets.map(async (asset) => {
                    const path = resolve(asset.path);
                    const info = await stat(path);
                    if (!info.isFile()) {
                        throw new Error(`Not a file: ${path}`);
                    }
                    if (info.size > MAX_FILE_BYTES) {
                        throw new Error(`${path} exceeds the ${MAX_FILE_BYTES / 1024 / 1024} MiB upload limit.`);
                    }
                    const filename = basename(path);
                    return {
                        ...asset,
                        path,
                        filename,
                        name: asset.name || (asset.id === undefined ? filename : undefined)
                    };
                }));
                return Promise.all(files.map(async ({ path, ...asset }) => ({
                    ...asset,
                    base64: await readFile(path).then((bytes) => {
                        if (bytes.length > MAX_FILE_BYTES) {
                            throw new Error(`${path} exceeds the ${MAX_FILE_BYTES / 1024 / 1024} MiB upload limit.`);
                        }
                        return bytes.toString('base64');
                    })
                })));
            }).then((data) => [null, data] as const, (err) => [err, null] as const);
            if (error) {
                return wss.fail('assets:upload', error instanceof Error ? error.message : String(error));
            }
            return wss.call('assets:upload', payload);
        }
    );

    server.registerTool(
        'modify_assets',
        {
            description: 'Edit asset name, tags, preload, or data paths. Array operations are supported under data.*. Anim state graph structure and animation events require their dedicated mutation tools.',
            annotations: {
                title: 'Modify Assets',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                edits: z.array(z.union([
                    z.object({ id: AssetIdSchema, path: z.string().min(1), op: z.literal('set').optional(), value: z.any() }),
                    z.object({ id: AssetIdSchema, path: z.string().min(1), op: z.literal('unset') }),
                    z.object({ id: AssetIdSchema, path: z.string().min(1), op: z.literal('insert'), value: z.any(), index: z.number().int().min(0).optional() }),
                    z.object({ id: AssetIdSchema, path: z.string().min(1), op: z.literal('remove'), index: z.number().int().min(0) }),
                    z.object({ id: AssetIdSchema, path: z.string().min(1), op: z.literal('move'), index: z.number().int().min(0), to: z.number().int().min(0) })
                ])).nonempty()
            }
        },
        ({ edits }) => wss.call('assets:modify', edits)
    );

    server.registerTool(
        'move_assets',
        {
            description: 'Move assets to a folder in the designated project and wait until their paths update. Omit folderId to move them to the root.',
            annotations: { title: 'Move Assets', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            inputSchema: {
                ids: z.array(AssetIdSchema).nonempty(),
                folderId: AssetIdSchema.nullable().optional()
            }
        },
        ({ ids, folderId }) => wss.call('assets:move', ids, folderId)
    );

    server.registerTool(
        'duplicate_assets',
        {
            description: 'Queue asset duplication in the current folders. The editor confirms the accepted source ids; list_assets to resolve the generated copies.',
            annotations: { title: 'Duplicate Assets', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            inputSchema: { ids: z.array(AssetIdSchema).nonempty() }
        },
        ({ ids }) => wss.call('assets:duplicate', ids)
    );

    server.registerTool(
        'replace_asset',
        {
            description: 'Replace references to one asset with another asset.',
            annotations: { title: 'Replace Asset References', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            inputSchema: { assetId: AssetIdSchema, replacementId: AssetIdSchema }
        },
        ({ assetId, replacementId }) => wss.call('assets:replace', assetId, replacementId)
    );

    server.registerTool(
        'reimport_assets',
        {
            description: 'Re-run the import pipeline for existing source assets and return succeeded and failed entries.',
            annotations: { title: 'Reimport Assets', readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
            inputSchema: {
                ids: z.array(AssetIdSchema).nonempty(),
                settings: z.record(z.any()).optional()
            }
        },
        ({ ids, settings }) => wss.call('assets:reimport', ids, settings)
    );

    server.registerTool(
        'download_asset',
        {
            description: `Download an asset to a local file. Downloads are limited to ${MAX_FILE_BYTES / 1024 / 1024} MiB and never overwrite unless overwrite=true.`,
            annotations: { title: 'Download Asset', readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
            inputSchema: {
                assetId: AssetIdSchema,
                path: z.string().min(1).describe('Local output path'),
                overwrite: z.boolean().optional()
            }
        },
        async ({ assetId, path, overwrite }) => {
            const output = resolve(path);
            if (!overwrite && await stat(output).then(() => true, () => false)) {
                return wss.fail('assets:file:get', `File already exists: ${output}. Set overwrite=true to replace it.`);
            }
            const raw = await wss.raw('assets:file:get', assetId);
            if (raw.error) {
                return wss.fail('assets:file:get', raw.error);
            }
            const data = raw.data as { base64?: string; filename?: string; mime?: string };
            if (
                typeof data?.base64 !== 'string' ||
                data.base64.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 ||
                data.base64.length % 4 !== 0 ||
                !/^[a-z\d+/]*={0,2}$/i.test(data.base64)
            ) {
                return wss.fail('assets:file:get', 'Editor returned invalid or oversized asset data.');
            }
            const bytes = Buffer.from(data.base64, 'base64');
            if (bytes.length > MAX_FILE_BYTES) {
                return wss.fail('assets:file:get', `Asset exceeds the ${MAX_FILE_BYTES / 1024 / 1024} MiB download limit.`);
            }
            const error = await writeFile(output, bytes, { flag: overwrite ? 'w' : 'wx' }).then(
                () => null,
                (err) => (err instanceof Error ? err : new Error(String(err)))
            );
            if (error) {
                return wss.fail('assets:file:get', error.message);
            }
            return wss.ok('assets:file:get', { path: output, filename: data.filename, mime: data.mime, bytes: bytes.length });
        }
    );

    server.registerTool(
        'get_template_overrides',
        {
            description: 'Read the current apply/revert override records for a template instance.',
            annotations: { title: 'Get Template Overrides', readOnlyHint: true, openWorldHint: false },
            inputSchema: { entityId: EntityIdSchema }
        },
        (options) => wss.call('templates:overrides:get', options)
    );

    server.registerTool(
        'apply_template_overrides',
        {
            description: 'Apply all overrides from a template instance, or only the supplied override records.',
            annotations: { title: 'Apply Template Overrides', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            inputSchema: { entityId: EntityIdSchema, overrides: z.array(AssetOverrideSchema).nonempty().optional() }
        },
        (options) => wss.call('templates:apply', options)
    );

    server.registerTool(
        'revert_template_overrides',
        {
            description: 'Revert all overrides on a template instance, or only the supplied override records.',
            annotations: { title: 'Revert Template Overrides', readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
            inputSchema: { entityId: EntityIdSchema, overrides: z.array(AssetOverrideSchema).nonempty().optional() }
        },
        (options) => wss.call('templates:revert', options)
    );

    server.registerTool(
        'unlink_template_instances',
        {
            description: 'Unlink template instances while keeping their current entity data.',
            annotations: { title: 'Unlink Template Instances', readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
            inputSchema: { entityIds: z.array(EntityIdSchema).nonempty() }
        },
        (options) => wss.call('templates:unlink', options)
    );
};

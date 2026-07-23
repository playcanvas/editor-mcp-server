import { randomUUID } from 'node:crypto';
import { link, open, readFile, rename, stat, unlink } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

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
import { AssetIdSchema, AssetRefSchema, EntityIdSchema } from './schema/common.ts';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_CHUNK_BYTES = 1024 * 1024;
const MAX_TRANSFER_BYTES = 512 * 1024 * 1024;
const AssetPipelineSchema = z.object({
    pow2: z.boolean(),
    searchRelatedAssets: z.boolean(),
    overwriteModel: z.boolean(),
    overwriteAnimation: z.boolean(),
    overwriteMaterial: z.boolean(),
    overwriteTexture: z.boolean(),
    preserveMapping: z.boolean(),
    useGlb: z.boolean(),
    animSampleRate: z.number(),
    animCurveTolerance: z.number(),
    animEnableCubic: z.boolean(),
    animUseFbxFilename: z.boolean(),
    useContainers: z.boolean(),
    meshCompression: z.enum(['none', 'draco']),
    dracoDecodeSpeed: z.number(),
    dracoMeshSize: z.number(),
    unwrapUv: z.boolean(),
    unwrapUvTexelsPerMeter: z.number(),
    importMorphNormals: z.boolean(),
    useUniqueIndices: z.boolean()
}).partial().strict();
const AssetOverrideSchema = z.object({
    resource_id: EntityIdSchema,
    override_type: z.string().min(1),
    path: z.string().optional()
}).passthrough();
const AssetEditSchema = z.union([
    z.object({
        id: AssetIdSchema,
        path: z.string().min(1),
        op: z.literal('set').optional(),
        value: z.any()
    }).strict(),
    z.object({ id: AssetIdSchema, path: z.string().min(1), op: z.literal('unset') }).strict(),
    z.object({
        id: AssetIdSchema,
        path: z.string().min(1),
        op: z.literal('insert'),
        value: z.any(),
        index: z.number().int().min(0).optional()
    }).strict(),
    z.object({
        id: AssetIdSchema,
        path: z.string().min(1),
        op: z.literal('remove'),
        index: z.number().int().min(0)
    }).strict(),
    z.object({
        id: AssetIdSchema,
        path: z.string().min(1),
        op: z.literal('move'),
        index: z.number().int().min(0),
        to: z.number().int().min(0)
    }).strict()
]);

const settle = <T>(promise: Promise<T>) =>
    promise.then((data) => [null, data] as const, (error) => [error, null] as const);

const message = (error: unknown) => error instanceof Error ? error.message : String(error);

const upload = async (wss: WSS, item: Record<string, unknown>, path: string, size: number) => {
    if (size <= MAX_FILE_BYTES) {
        const [readError, bytes] = await settle(readFile(path));
        if (readError || !bytes) {
            throw readError;
        }
        const raw = await wss.raw('assets:upload', [{ ...item, base64: bytes.toString('base64') }]);
        if (raw.error) {
            throw new Error(raw.error);
        }
        const data = raw.data as {
            succeeded?: { asset: unknown }[];
            failed?: { message: string }[];
        };
        if (data.failed?.length) {
            throw new Error(data.failed[0].message);
        }
        if (!data.succeeded?.length) {
            throw new Error('Editor returned no uploaded asset.');
        }
        return data.succeeded[0].asset;
    }
    if (size > MAX_TRANSFER_BYTES) {
        throw new Error(`${path} exceeds the ${MAX_TRANSFER_BYTES / 1024 / 1024} MiB upload limit.`);
    }

    const start = await wss.raw('files:upload:start', item, size);
    if (start.error) {
        throw new Error(start.error);
    }
    const id = (start.data as { transferId?: string })?.transferId;
    if (!id) {
        throw new Error('Editor returned an invalid upload transfer.');
    }

    const [openError, file] = await settle(open(path, 'r'));
    if (openError || !file) {
        await settle(wss.raw('files:transfer:cancel', id));
        throw openError;
    }

    let offset = 0;
    let failure: unknown;
    const bytes = Buffer.allocUnsafe(MAX_CHUNK_BYTES);
    while (!failure && offset < size) {
        const [readError, result] = await settle(file.read(bytes, 0, Math.min(bytes.length, size - offset), offset));
        if (readError || !result?.bytesRead) {
            failure = readError || new Error(`Unexpected end of file at byte ${offset}.`);
            break;
        }
        const [sendError, raw] = await settle(
            wss.raw('files:upload:append', id, offset, bytes.subarray(0, result.bytesRead).toString('base64'))
        );
        if (sendError || raw?.error) {
            failure = sendError || new Error(raw?.error);
            break;
        }
        if ((raw.data as { offset?: number })?.offset !== offset + result.bytesRead) {
            failure = new Error(`Editor returned an invalid upload offset at byte ${offset}.`);
            break;
        }
        offset += result.bytesRead;
    }
    const [closeError] = await settle(file.close());
    failure ||= closeError;
    if (failure) {
        await settle(wss.raw('files:transfer:cancel', id));
        throw failure;
    }

    const finish = await wss.raw('files:upload:finish', id);
    if (finish.error) {
        await settle(wss.raw('files:transfer:cancel', id));
        throw new Error(finish.error);
    }
    return finish.data;
};

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
        'get_asset',
        {
            description: 'Get the complete JSON for one project asset by id.',
            annotations: { title: 'Get Asset', readOnlyHint: true, openWorldHint: false },
            inputSchema: { id: AssetIdSchema }
        },
        ({ id }) => wss.call('assets:get', id)
    );

    server.registerTool(
        'get_asset_references',
        {
            description: 'List the project assets, entities, or settings that reference an asset.',
            annotations: { title: 'Get Asset References', readOnlyHint: true, openWorldHint: false },
            inputSchema: { id: AssetIdSchema }
        },
        ({ id }) => wss.call('assets:references:get', id)
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
                ids: z.array(AssetIdSchema).nonempty(),
                rejectReferenced: z.boolean().optional().describe('Fail before deletion if any asset is referenced')
            }
        },
        ({ ids, rejectReferenced }) => {
            return wss.call('assets:delete', ids, { rejectReferenced });
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
            description: `Upload local files into the designated project, or replace an existing asset source by providing its id. Files are limited to ${MAX_TRANSFER_BYTES / 1024 / 1024} MiB each; the result separates succeeded and failed entries.`,
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
                    settings: AssetPipelineSchema.optional().describe('Per-upload texture or scene import overrides; saved defaults are under projectUser editor.pipeline settings')
                })).nonempty()
            }
        },
        async ({ assets }) => {
            const results = [];
            for (const [index, asset] of assets.entries()) {
                const path = resolve(asset.path);
                const filename = basename(path);
                const [infoError, info] = await settle(stat(path));
                if (infoError || !info?.isFile()) {
                    results.push({
                        error: {
                            index,
                            filename,
                            message: infoError ? message(infoError) : `Not a file: ${path}`
                        }
                    });
                    continue;
                }
                const item = { ...asset } as Record<string, unknown>;
                delete item.path;
                const [error, data] = await settle(
                    upload(
                        wss,
                        {
                            ...item,
                            filename,
                            name: asset.name || (asset.id === undefined ? filename : undefined)
                        },
                        path,
                        info.size
                    )
                );
                results.push(error
                    ? { error: { index, filename, message: message(error) } }
                    : { result: { index, asset: data } });
            }
            const succeeded = results.flatMap((item) => ('result' in item ? [item.result] : []));
            const failed = results.flatMap((item) => ('error' in item ? [item.error] : []));
            return wss.ok('assets:upload', { succeeded, failed }, { partial: failed.length > 0 });
        }
    );

    server.registerTool(
        'modify_assets',
        {
            description: 'Edit asset name, tags, preload, or data paths. Array operations are supported under data.*. Anim state graph structure and animation events require their dedicated mutation tools.',
            annotations: {
                title: 'Modify Assets',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                edits: z.array(AssetEditSchema).nonempty()
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
                folderId: AssetRefSchema.optional()
            }
        },
        ({ ids, folderId }) => wss.call('assets:move', ids, folderId)
    );

    server.registerTool(
        'duplicate_assets',
        {
            description: 'Duplicate assets in their current folders and return the created asset summaries.',
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
                settings: AssetPipelineSchema.optional()
            }
        },
        ({ ids, settings }) => wss.call('assets:reimport', ids, settings)
    );

    server.registerTool(
        'download_asset',
        {
            description: `Download an asset to a local file. Downloads are limited to ${MAX_TRANSFER_BYTES / 1024 / 1024} MiB and never overwrite unless overwrite=true.`,
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
                return wss.fail('files:download:start', `File already exists: ${output}. Set overwrite=true to replace it.`);
            }
            const temp = join(dirname(output), `.${basename(output)}.${randomUUID()}.tmp`);
            const [openError, file] = await settle(open(temp, 'wx'));
            if (openError || !file) {
                return wss.fail('files:download:start', message(openError));
            }

            let failure: unknown;
            let id: string | undefined;
            let filename: string | undefined;
            let mime: string | undefined;
            let size = 0;
            const [startError, start] = await settle(wss.raw('files:download:start', assetId, MAX_FILE_BYTES));
            if (startError || start?.error) {
                failure = startError || new Error(start?.error);
            } else {
                const data = start?.data as {
                    transferId?: string;
                    size?: number;
                    filename?: string;
                    mime?: string;
                    base64?: string;
                };
                id = data.transferId;
                filename = data.filename;
                mime = data.mime;
                size = data.size ?? -1;
                if (!Number.isInteger(size) || size < 0 || size > MAX_TRANSFER_BYTES) {
                    failure = new Error('Editor returned an invalid or oversized download transfer.');
                } else if (typeof data.base64 === 'string') {
                    if (
                        data.base64.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 ||
                        data.base64.length % 4 !== 0 ||
                        !/^[a-z\d+/]*={0,2}$/i.test(data.base64)
                    ) {
                        failure = new Error('Editor returned invalid inline asset data.');
                    } else {
                        const bytes = Buffer.from(data.base64, 'base64');
                        if (bytes.length !== size) {
                            failure = new Error('Editor returned an invalid inline asset length.');
                        } else {
                            const [writeError, result] = await settle(file.write(bytes, 0, bytes.length, 0));
                            failure = writeError || (result?.bytesWritten !== bytes.length
                                ? new Error('Failed to write the complete asset.')
                                : null);
                        }
                    }
                } else if (!id) {
                    failure = new Error('Editor returned an invalid download transfer.');
                } else {
                    let offset = 0;
                    while (!failure && offset < size) {
                        const [readError, raw] = await settle(
                            wss.raw('files:download:read', id, offset, Math.min(MAX_CHUNK_BYTES, size - offset))
                        );
                        if (readError || raw?.error) {
                            failure = readError || new Error(raw?.error);
                            break;
                        }
                        const chunk = raw?.data as { offset?: number; base64?: string };
                        if (
                            typeof chunk?.base64 !== 'string' ||
                            chunk.base64.length > Math.ceil(MAX_CHUNK_BYTES / 3) * 4 ||
                            chunk.base64.length % 4 !== 0 ||
                            !/^[a-z\d+/]*={0,2}$/i.test(chunk.base64)
                        ) {
                            failure = new Error(`Editor returned an invalid download chunk at byte ${offset}.`);
                            break;
                        }
                        const bytes = Buffer.from(chunk.base64, 'base64');
                        if (!bytes.length || bytes.length > MAX_CHUNK_BYTES || chunk.offset !== offset + bytes.length) {
                            failure = new Error(`Editor returned an invalid download offset at byte ${offset}.`);
                            break;
                        }
                        const [writeError, result] = await settle(file.write(bytes, 0, bytes.length, offset));
                        if (writeError || result?.bytesWritten !== bytes.length) {
                            failure = writeError || new Error(`Failed to write the download chunk at byte ${offset}.`);
                            break;
                        }
                        offset += bytes.length;
                    }
                    if (!failure) {
                        const [finishError, finish] = await settle(wss.raw('files:transfer:finish', id));
                        failure = finishError || (finish?.error ? new Error(finish.error) : null);
                    }
                }
            }

            const [closeError] = await settle(file.close());
            failure ||= closeError;
            if (failure) {
                if (id) {
                    await settle(wss.raw('files:transfer:cancel', id));
                }
                await settle(unlink(temp));
                return wss.fail('files:download:start', message(failure));
            }

            const [moveError] = overwrite ? await settle(rename(temp, output)) : await settle(link(temp, output));
            if (moveError) {
                await settle(unlink(temp));
                return wss.fail('files:download:start', message(moveError));
            }
            if (!overwrite) {
                await settle(unlink(temp));
            }
            return wss.ok('files:download:start', { path: output, filename, mime, bytes: size });
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

export { AssetEditSchema, AssetPipelineSchema };

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../wss.ts';

import { EntityIdSchema } from './schema/common.ts';

const IdSchema = z.number().int().positive();

const FrameSchema = z.object({
    name: z.string(),
    rect: z.array(z.number()).length(4),
    pivot: z.array(z.number()).length(2),
    border: z.array(z.number()).length(4)
});

const SpritePropsSchema = z.object({
    pixelsPerUnit: z.number().positive().optional(),
    renderMode: z.number().int().min(0).max(2).optional(),
    frameKeys: z.array(z.union([z.string(), z.number()])).optional(),
    textureAtlasAsset: IdSchema.optional(),
    frames: z.record(FrameSchema).optional()
});

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'bake_lightmaps',
        {
            description:
                'Bake scene lightmaps, optionally limited to the given entities. Returns only after baking finishes and reports model assets missing UV1.',
            annotations: {
                title: 'Bake Lightmaps',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                entityIds: z
                    .array(EntityIdSchema)
                    .nonempty()
                    .optional()
                    .describe(
                        'Lightmapped entity resource_ids; omit to bake all lightmapped entities'
                    )
            }
        },
        ({ entityIds }) => wss.call('lightmapper:bake', entityIds)
    );

    server.registerTool(
        'unwrap_model_asset',
        {
            description:
                "Generate UV1 data for a model asset using the editor's unwrap worker and update its source file.",
            annotations: {
                title: 'Unwrap Model Asset',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                id: IdSchema.describe('Model asset id'),
                padding: z
                    .number()
                    .positive()
                    .optional()
                    .describe('UV island padding in pixels (default 2)')
            }
        },
        ({ id, padding }) => wss.call('assets:model:unwrap', id, { padding })
    );

    server.registerTool(
        'cancel_model_unwrap',
        {
            description: 'Cancel an in-progress UV1 unwrap for a model asset.',
            annotations: {
                title: 'Cancel Model Unwrap',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: { id: IdSchema.describe('Model asset id') }
        },
        ({ id }) => wss.call('assets:model:unwrap:cancel', id)
    );

    server.registerTool(
        'convert_texture_asset',
        {
            description:
                'Convert a texture source to a new AVIF, JPEG, PNG, or WebP texture asset.',
            annotations: {
                title: 'Convert Texture Asset',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                id: IdSchema.describe('Source texture asset id'),
                format: z.enum(['avif', 'jpeg', 'png', 'webp'])
            }
        },
        ({ id, format }) => wss.call('assets:texture:convert', id, format)
    );

    server.registerTool(
        'create_texture_atlas',
        {
            description:
                'Duplicate a texture asset as an editable texture atlas and return the new asset.',
            annotations: {
                title: 'Create Texture Atlas',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: { id: IdSchema.describe('Source texture asset id') }
        },
        ({ id }) => wss.call('assets:texture:toAtlas', id)
    );

    server.registerTool(
        'create_cubemap_from_texture',
        {
            description:
                'Convert an equirectangular texture to six face textures and a cubemap asset.',
            annotations: {
                title: 'Create Cubemap From Texture',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                id: IdSchema.describe('Source equirectangular texture asset id')
            }
        },
        ({ id }) => wss.call('assets:texture:toCubemap', id)
    );

    server.registerTool(
        'process_font_asset',
        {
            description: 'Rebuild a font asset for an explicit character set and optional inversion setting.',
            annotations: {
                title: 'Process Font Asset',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                id: IdSchema,
                characters: z.string().min(1),
                invert: z.boolean().optional()
            }
        },
        ({ id, characters, invert }) => wss.call('assets:font:process', id, { characters, invert })
    );

    server.registerTool(
        'generate_texture_metadata',
        {
            description: 'Generate missing pipeline metadata for a texture asset.',
            annotations: {
                title: 'Generate Texture Metadata',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: { id: IdSchema }
        },
        ({ id }) => wss.call('assets:texture:metadata', id)
    );

    server.registerTool(
        'process_texture_variants',
        {
            description: 'Compress or remove explicit texture variants and wait for processing to settle.',
            annotations: {
                title: 'Process Texture Variants',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                id: IdSchema,
                formats: z.array(z.enum(['basis', 'dxt', 'etc1', 'etc2', 'pvr'])).nonempty(),
                remove: z.boolean().optional(),
                force: z.boolean().optional()
            }
        },
        ({ id, ...options }) => wss.call('assets:texture:variants', id, options)
    );

    server.registerTool(
        'prefilter_cubemap',
        {
            description: 'Generate runtime lighting data for a cubemap.',
            annotations: {
                title: 'Prefilter Cubemap',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                id: IdSchema,
                legacy: z.boolean().optional().describe('Generate the compatibility DDS format for older engines')
            }
        },
        ({ id, legacy }) => wss.call('assets:cubemap:prefilter', id, legacy)
    );

    server.registerTool(
        'clear_cubemap_prefilter',
        {
            description: 'Remove generated runtime lighting data from a cubemap.',
            annotations: {
                title: 'Clear Cubemap Prefilter',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: { id: IdSchema }
        },
        ({ id }) => wss.call('assets:cubemap:prefilter:clear', id)
    );

    server.registerTool(
        'modify_sprite_asset',
        {
            description:
                'Modify sprite data (atlas, frame order, pixels per unit, render mode) or replace a texture atlas frame map in one undoable edit.',
            annotations: {
                title: 'Modify Sprite Asset',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                id: IdSchema.describe('Sprite or texture atlas asset id'),
                props: SpritePropsSchema
            }
        },
        ({ id, props }) => wss.call('assets:sprite:modify', id, props)
    );

    server.registerTool(
        'modify_bundle_asset',
        {
            description:
                'Add or remove project assets from a bundle. Returns accepted and rejected ids; invalid asset types and duplicates are rejected.',
            annotations: {
                title: 'Modify Bundle Asset',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                id: IdSchema.describe('Bundle asset id'),
                add: z.array(IdSchema).optional(),
                remove: z.array(IdSchema).optional()
            }
        },
        ({ id, add, remove }) =>
            wss.call('assets:bundle:modify', id, { add, remove })
    );
};

export { SpritePropsSchema };

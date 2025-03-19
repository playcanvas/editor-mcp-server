import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss.ts';

/* eslint-disable-next-line no-unused-vars */
const collisionComponentSchema = z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['box', 'sphere', 'capsule', 'cylinder', 'mesh']).optional(),
    halfExtents: z.array(z.number()).length(3).optional(),
    radius: z.number().optional(),
    axis: z.number().optional(),
    height: z.number().optional(),
    convexHull: z.boolean().optional(),
    asset: z.number().optional(),
    renderAsset: z.number().optional(),
    linearOffset: z.array(z.number()).length(3).optional(),
    angularOffset: z.array(z.number()).length(3).optional()
});

const renderComponentSchema = z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['box', 'capsule', 'sphere', 'cylinder', 'cone', 'plane']).optional(),
    asset: z.number().optional(),
    materialAssets: z.array(z.number()).optional(),
    layers: z.array(z.number()).optional(),
    batchGroupId: z.number().optional(),
    castShadows: z.boolean().optional(),
    castShadowsLightmap: z.boolean().optional(),
    receiveShadows: z.boolean().optional(),
    static: z.boolean().optional(),
    lightmapped: z.boolean().optional(),
    lightmapSizeMultiplier: z.number().optional(),
    castShadowsLightMap: z.boolean().optional(),
    lightMapped: z.boolean().optional(),
    lightMapSizeMultiplier: z.number().optional(),
    isStatic: z.boolean().optional(),
    rootBone: z.string().optional(),
    aabbCenter: z.array(z.number()).length(3).optional(),
    aabbHalfExtents: z.array(z.number()).length(3).optional()
});

/* eslint-disable-next-line no-unused-vars */
const rigidbodyComponentSchema = z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['static', 'dynamic', 'kinematic']).optional(),
    mass: z.number().optional(),
    linearDamping: z.number().optional(),
    angularDamping: z.number().optional(),
    linearFactor: z.array(z.number()).length(3).optional(),
    angularFactor: z.array(z.number()).length(3).optional(),
    friction: z.number().optional(),
    restitution: z.number().optional()
});

const scriptComponentSchema = z.object({
    enabled: z.boolean().optional(),
    order: z.array(z.string()).optional(),
    scripts: z.record(z.string(), z.any()).optional()
});

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'create_entity',
        'Create a new entity',
        {
            enabled: z.boolean().optional(),
            name: z.string().optional(),
            parent: z.string().optional(),
            position: z.array(z.number()).length(3).optional(),
            rotation: z.array(z.number()).length(3).optional(),
            scale: z.array(z.number()).length(3).optional(),
            tags: z.array(z.string()).optional()
        },
        async (options) => {
            try {
                const res = await wss.send('entities:create', options);
                if (res === undefined) {
                    throw new Error('Failed to create entity');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Created entity: ${JSON.stringify(res)}`
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
        'modify_entity',
        'Modify an entity\'s properties',
        {
            id: z.string(),
            name: z.string().optional(),
            enabled: z.boolean().optional(),
            position: z.array(z.number()).length(3).optional(),
            rotation: z.array(z.number()).length(3).optional(),
            scale: z.array(z.number()).length(3).optional(),
            tags: z.array(z.string()).optional()
        },
        async (options) => {
            try {
                const res = await wss.send('entities:modify', options.id, options);
                if (res === undefined) {
                    throw new Error('Failed to modify entity');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Modified entity ${options.id}: ${JSON.stringify(res)}`
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
        'duplicate_entities',
        'Duplicate one or more entities',
        {
            ids: z.array(z.string()),
            rename: z.boolean().optional()
        },
        async ({ ids, rename }) => {
            try {
                const res = await wss.send('entities:duplicate', ids, { rename });
                if (res === undefined) {
                    throw new Error('Failed to duplicate entities');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Duplicated entities: ${JSON.stringify(res)}`
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
        'reparent_entity',
        'Reparent an entity',
        {
            id: z.string(),
            parent: z.string(),
            index: z.number().optional(),
            preserveTransform: z.boolean().optional()
        },
        async (options) => {
            try {
                const res = await wss.send('entities:reparent', options);
                if (res === undefined) {
                    throw new Error('Failed to reparent entity');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Reparented entity ${options.id}: ${JSON.stringify(res)}`
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
        'delete_entities',
        'Delete one or more entities',
        {
            ids: z.array(z.string())
        },
        async ({ ids }) => {
            try {
                const res = await wss.send('entities:delete', ids);
                if (res === undefined) {
                    throw new Error('Failed to delete entities');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Deleted entities: ${JSON.stringify(res)}`
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
        'list_entities',
        'List all entities',
        {},
        async () => {
            try {
                const res = await wss.send('entities:list');
                if (res === undefined) {
                    throw new Error('Failed to list entities');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Entities: ${JSON.stringify(res)}`
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
        'add_components',
        'Add components to an entity',
        {
            id: z.string(),
            components: z.object({
                render: renderComponentSchema.optional(),
                script: scriptComponentSchema.optional()
            })
        },
        async ({ id, components }) => {
            try {
                const res = await wss.send('entities:components:add', id, components);
                if (res === undefined) {
                    throw new Error('Failed to add components');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Added components to entity ${id}: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: err.message
                    }]
                };
            }
        }
    );

    server.tool(
        'remove_components',
        'Remove components from an entity',
        {
            id: z.string(),
            components: z.array(z.string())
        },
        async ({ id, components }) => {
            try {
                const res = await wss.send('entities:components:remove', id, components);
                if (res === undefined) {
                    throw new Error('Failed to remove components');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Removed components from entity ${id}: ${JSON.stringify(res)}`
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
        'set_render_component_material',
        'Set the material on a render component',
        {
            id: z.string(),
            assetId: z.number()
        },
        async ({ id, assetId }) => {
            try {
                const res = await wss.send('entities:components:property:set', id, 'render', 'materialAssets', [assetId]);
                if (res === undefined) {
                    throw new Error('Failed to set material on render component');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Set material on render component ${id}: ${JSON.stringify(res)}`
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
        'add_script_component_script',
        'Add a script to a script component',
        {
            id: z.string(),
            scriptName: z.string()
        },
        async ({ id, scriptName }) => {
            try {
                const res = await wss.send('entities:components:script:add', id, scriptName);
                if (res === undefined) {
                    throw new Error('Failed to add script on script component');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Added script on script component ${id}: ${JSON.stringify(res)}`
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

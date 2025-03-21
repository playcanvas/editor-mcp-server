import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss.ts';
import { AudioListenerSchema, CameraSchema, CollisionSchema, ElementSchema, LightSchema, RenderSchema, RigidBodySchema, ScreenSchema, ScriptSchema, SoundSlotSchema, SoundSchema } from './schema/entity.ts';

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
            tags: z.array(z.string()).optional(),
            components: z.object({
                audiolistener: AudioListenerSchema,
                camera: CameraSchema,
                element: ElementSchema,
                light: LightSchema,
                render: RenderSchema,
                screen: ScreenSchema,
                script: ScriptSchema,
                sound: SoundSchema
            })
        },
        (options) => {
            return wss.call('entities:create', options);
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
        (options) => {
            return wss.call('entities:modify', options.id, options);
        }
    );

    server.tool(
        'duplicate_entities',
        'Duplicate one or more entities',
        {
            ids: z.array(z.string()),
            rename: z.boolean().optional()
        },
        ({ ids, rename }) => {
            return wss.call('entities:duplicate', ids, { rename });
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
        (options) => {
            return wss.call('entities:reparent', options);
        }
    );

    server.tool(
        'delete_entities',
        'Delete one or more entities. The root entity cannot be deleted.',
        {
            ids: z.array(z.string()).describe('Array of entity IDs to delete. The root entity cannot be deleted.')
        },
        ({ ids }) => {
            return wss.call('entities:delete', ids);
        }
    );

    server.tool(
        'list_entities',
        'List all entities',
        {},
        () => {
            return wss.call('entities:list');
        }
    );

    server.tool(
        'add_components',
        'Add components to an entity',
        {
            id: z.string(),
            components: z.object({
                audiolistener: AudioListenerSchema,
                camera: CameraSchema,
                collision: CollisionSchema,
                element: ElementSchema,
                light: LightSchema,
                render: RenderSchema,
                rigidbody: RigidBodySchema,
                screen: ScreenSchema,
                script: ScriptSchema,
                sound: SoundSchema
            })
        },
        ({ id, components }) => {
            return wss.call('entities:components:add', id, components);
        }
    );

    server.tool(
        'remove_components',
        'Remove components from an entity',
        {
            id: z.string(),
            components: z.array(z.string())
        },
        ({ id, components }) => {
            return wss.call('entities:components:remove', id, components);
        }
    );

    server.tool(
        'set_render_component_material',
        'Set the material on a render component',
        {
            id: z.string(),
            assetId: z.number()
        },
        ({ id, assetId }) => {
            return wss.call('entities:components:property:set', id, 'render', 'materialAssets', [assetId]);
        }
    );

    server.tool(
        'add_script_component_script',
        'Add a script to a script component',
        {
            id: z.string(),
            scriptName: z.string()
        },
        ({ id, scriptName }) => {
            return wss.call('entities:components:script:add', id, scriptName);
        }
    );
};

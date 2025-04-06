import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss';
import { ComponentsSchema, ComponentNameSchema, EntityIdSchema, EntitySchema } from './schema/entity';

export const register = (mcp: McpServer, wss: WSS) => {
    mcp.tool(
        'create_entities',
        'Create one or more entities',
        {
            entities: z.array(z.object({
                entity: EntitySchema,
                parent: EntityIdSchema.optional().describe('The parent entity to create the entity under. If not provided, the root entity will be used.')
            })).min(1).describe('Array of entity heirarchies to create.')
        },
        ({ entities }) => {
            return wss.call('entities:create', entities);
        }
    );

    mcp.tool(
        'modify_entities',
        'Modify one or more entity\'s properties',
        {
            edits: z.array(z.object({
                id: EntityIdSchema,
                path: z.string().describe('The path to the property to modify. Use dot notation to access nested properties.'),
                value: z.any().describe('The value to set the property to.')
            })).describe('An array of objects containing the ID of the entity to modify, the path to the property to modify, and the value to set the property to.')
        },
        ({ edits }) => {
            return wss.call('entities:modify', edits);
        }
    );

    mcp.tool(
        'duplicate_entities',
        'Duplicate one or more entities',
        {
            ids: z.array(EntityIdSchema).min(1).describe('Array of entity IDs to duplicate. The root entity cannot be duplicated.'),
            rename: z.boolean().optional()
        },
        ({ ids, rename }) => {
            return wss.call('entities:duplicate', ids, { rename });
        }
    );

    mcp.tool(
        'reparent_entity',
        'Reparent an entity',
        {
            id: EntityIdSchema,
            parent: EntityIdSchema,
            index: z.number().optional(),
            preserveTransform: z.boolean().optional()
        },
        (options) => {
            return wss.call('entities:reparent', options);
        }
    );

    mcp.tool(
        'delete_entities',
        'Delete one or more entities. The root entity cannot be deleted.',
        {
            ids: z.array(EntityIdSchema).min(1).describe('Array of entity IDs to delete. The root entity cannot be deleted.')
        },
        ({ ids }) => {
            return wss.call('entities:delete', ids);
        }
    );

    mcp.tool(
        'list_entities',
        'List all entities',
        {},
        () => {
            return wss.call('entities:list');
        }
    );

    mcp.tool(
        'add_components',
        'Add components to an entity',
        {
            id: EntityIdSchema,
            components: ComponentsSchema
        },
        ({ id, components }) => {
            return wss.call('entities:components:add', id, components);
        }
    );

    mcp.tool(
        'remove_components',
        'Remove components from an entity',
        {
            id: EntityIdSchema,
            components: z.array(ComponentNameSchema).min(1).describe('Array of component names to remove from the entity.')
        },
        ({ id, components }) => {
            return wss.call('entities:components:remove', id, components);
        }
    );

    mcp.tool(
        'add_script_component_script',
        'Add a script to a script component',
        {
            id: EntityIdSchema,
            scriptName: z.string()
        },
        ({ id, scriptName }) => {
            return wss.call('entities:components:script:add', id, scriptName);
        }
    );
};

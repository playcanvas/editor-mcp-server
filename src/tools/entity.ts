import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss';
import { ComponentsSchema, EntitySchema } from './schema/entity';

export const register = (mcp: McpServer, wss: WSS) => {
    mcp.tool(
        'create_entities',
        'Create one or more entities',
        {
            entities: z.array(EntitySchema)
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
                id: z.string().describe('The ID of the entity to modify.'),
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
            ids: z.array(z.string()),
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
            id: z.string(),
            parent: z.string(),
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
            ids: z.array(z.string()).describe('Array of entity IDs to delete. The root entity cannot be deleted.')
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
            id: z.string(),
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
            id: z.string(),
            components: z.array(z.string())
        },
        ({ id, components }) => {
            return wss.call('entities:components:remove', id, components);
        }
    );

    mcp.tool(
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

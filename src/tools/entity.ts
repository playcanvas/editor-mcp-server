import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss';
import { EntityIdSchema } from './schema/common';
import { ComponentsSchema, ComponentNameSchema, EntitySchema } from './schema/entity';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'create_entities',
        {
            description: 'Create one or more entities',
            inputSchema: {
                entities: z.array(z.object({
                    entity: EntitySchema,
                    parent: EntityIdSchema.optional().describe('The parent entity to create the entity under. If not provided, the root entity will be used.')
                })).nonempty().describe('Array of entity hierarchies to create.')
            }
        },
        ({ entities }) => {
            return wss.call('entities:create', entities);
        }
    );

    server.registerTool(
        'modify_entities',
        {
            description: 'Modify one or more entity\'s properties',
            inputSchema: {
                edits: z.array(z.object({
                    id: EntityIdSchema,
                    path: z.string().describe('The path to the property to modify. Use dot notation to access nested properties.'),
                    value: z.any().describe('The value to set the property to.')
                })).nonempty().describe('An array of objects containing the ID of the entity to modify, the path to the property to modify, and the value to set the property to.')
            }
        },
        ({ edits }) => {
            return wss.call('entities:modify', edits);
        }
    );

    server.registerTool(
        'duplicate_entities',
        {
            description: 'Duplicate one or more entities',
            inputSchema: {
                ids: z.array(EntityIdSchema).nonempty().describe('Array of entity IDs to duplicate. The root entity cannot be duplicated.'),
                rename: z.boolean().optional()
            }
        },
        ({ ids, rename }) => {
            return wss.call('entities:duplicate', ids, { rename });
        }
    );

    server.registerTool(
        'reparent_entity',
        {
            description: 'Reparent an entity',
            inputSchema: {
                id: EntityIdSchema,
                parent: EntityIdSchema,
                index: z.number().optional(),
                preserveTransform: z.boolean().optional()
            }
        },
        (options) => {
            return wss.call('entities:reparent', options);
        }
    );

    server.registerTool(
        'delete_entities',
        {
            description: 'Delete one or more entities. The root entity cannot be deleted.',
            inputSchema: {
                ids: z.array(EntityIdSchema).nonempty().describe('Array of entity IDs to delete. The root entity cannot be deleted.')
            }
        },
        ({ ids }) => {
            return wss.call('entities:delete', ids);
        }
    );

    server.registerTool(
        'list_entities',
        {
            description: 'List all entities'
        },
        () => {
            return wss.call('entities:list');
        }
    );

    server.registerTool(
        'add_components',
        {
            description: 'Add components to an entity',
            inputSchema: {
                id: EntityIdSchema,
                components: ComponentsSchema
            }
        },
        ({ id, components }) => {
            return wss.call('entities:components:add', id, components);
        }
    );

    server.registerTool(
        'remove_components',
        {
            description: 'Remove components from an entity',
            inputSchema: {
                id: EntityIdSchema,
                components: z.array(ComponentNameSchema).nonempty().describe('Array of component names to remove from the entity.')
            }
        },
        ({ id, components }) => {
            return wss.call('entities:components:remove', id, components);
        }
    );

    server.registerTool(
        'add_script_component_script',
        {
            description: 'Add a script to a script component',
            inputSchema: {
                id: EntityIdSchema,
                scriptName: z.string()
            }
        },
        ({ id, scriptName }) => {
            return wss.call('entities:components:script:add', id, scriptName);
        }
    );
};

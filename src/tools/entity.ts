import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss';
import { EntityIdSchema } from './schema/common';
import { ComponentsSchema, ComponentNameSchema, EntitySchema } from './schema/entity';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'create_entities',
        {
            description: 'Create entities',
            inputSchema: {
                entities: z.array(z.object({
                    entity: EntitySchema,
                    parent: EntityIdSchema.optional().describe('Parent entity ID')
                })).nonempty().describe('Entity hierarchies to create')
            }
        },
        ({ entities }) => {
            return wss.call('entities:create', entities);
        }
    );

    server.registerTool(
        'modify_entities',
        {
            description: 'Modify entity properties',
            inputSchema: {
                edits: z.array(z.object({
                    id: EntityIdSchema,
                    path: z.string().describe('Property path (dot notation)'),
                    value: z.any().describe('New value')
                })).nonempty()
            }
        },
        ({ edits }) => {
            return wss.call('entities:modify', edits);
        }
    );

    server.registerTool(
        'duplicate_entities',
        {
            description: 'Duplicate entities',
            inputSchema: {
                ids: z.array(EntityIdSchema).nonempty().describe('Entity IDs to duplicate'),
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
            description: 'Reparent entity',
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
            description: 'Delete entities (not root)',
            inputSchema: {
                ids: z.array(EntityIdSchema).nonempty()
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
            description: 'Add components to entity',
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
            description: 'Remove components from entity',
            inputSchema: {
                id: EntityIdSchema,
                components: z.array(ComponentNameSchema).nonempty()
            }
        },
        ({ id, components }) => {
            return wss.call('entities:components:remove', id, components);
        }
    );

    server.registerTool(
        'add_script_component_script',
        {
            description: 'Add script to script component',
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

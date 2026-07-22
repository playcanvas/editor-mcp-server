import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../wss.ts';

import { EntityIdSchema } from './schema/common.ts';
import { ComponentsSchema, ComponentNameSchema, EntitySchema } from './schema/entity.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'create_entities',
        {
            description: [
                'Create one or more entities (optionally nested hierarchies) in the current scene.',
                'Use this to add new objects: cameras, lights, models, UI, empty groups, etc.',
                'Coordinates are local to the parent; rotation is euler degrees; scale is a multiplier.',
                'Returns the created entity summaries inline (resource_id, name, path, components) so you do NOT need a follow-up list_entities call to recover the new ids.',
                'Physics note: rigidbody/collision components only simulate if the project has the Ammo physics module enabled (Editor: click IMPORT AMMO / enable physics in project settings). Without it, rigidbodies are created but stay frozen at launch — enable Ammo before relying on physics rather than pausing to ask.',
                'When NOT to use: to change an existing entity (use modify_entities), to add a component to an existing entity (use add_components), or to instantiate a template asset (use instantiate_template_assets).'
            ].join(' '),
            annotations: {
                title: 'Create Entities',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                entities: z.array(z.object({
                    entity: EntitySchema,
                    parent: EntityIdSchema.optional().describe('Parent entity resource_id. Omit to create under the scene root.')
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
            description: [
                'Set properties on existing entities by dot-notation path.',
                'Valid top-level paths: "name", "enabled", "position" ([x,y,z] local), "rotation" ([x,y,z] euler degrees), "scale" ([x,y,z]), "tags".',
                'Component properties use "components.<type>.<prop>", e.g. "components.light.intensity", "components.camera.fov", "components.render.castShadows", "components.script.scripts.<name>.attributes.<attr>" (the entity must already have that component; add it with add_components first).',
                'Each edit targets one entity id + one path. Returns the post-edit summaries of the affected entities.',
                'Edits are validated on write: an unknown top-level path, or a component path for a component the entity does not have, fails immediately with a message listing the entity\'s valid paths/components — so you can fix it in one shot instead of retrying blind.',
                'When NOT to use: to create entities (use create_entities), to add/remove components (use add_components/remove_components), or to change scene-wide settings (use modify_scene_settings).'
            ].join(' '),
            annotations: {
                title: 'Modify Entities',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                edits: z.array(z.object({
                    id: EntityIdSchema,
                    path: z.string().describe('Property path in dot notation, e.g. "position", "components.light.intensity"'),
                    value: z.any().describe('New value. Vectors are arrays, e.g. position [0,1,0]; colors are [r,g,b] 0-1.')
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
            description: [
                'Duplicate existing entities (including their children) in place under the same parent.',
                'Returns the new entity summaries. Set rename=true to auto-suffix names to avoid duplicates.',
                'When NOT to use: to create a reusable prefab across scenes (create a template asset instead) or to build a brand-new entity (use create_entities).'
            ].join(' '),
            annotations: {
                title: 'Duplicate Entities',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                ids: z.array(EntityIdSchema).nonempty().describe('Entity resource_ids to duplicate'),
                rename: z.boolean().optional().describe('Auto-rename duplicates to keep names unique')
            }
        },
        ({ ids, rename }) => {
            return wss.call('entities:duplicate', ids, { rename });
        }
    );

    server.registerTool(
        'reparent_entity',
        {
            description: [
                'Move an entity to a new parent in the hierarchy, optionally at a specific child index.',
                'Set preserveTransform=true to keep the entity at the same world position after moving.',
                'Returns the moved entity summary (including its new hierarchy path).',
                'When NOT to use: to change position/rotation values directly (use modify_entities).'
            ].join(' '),
            annotations: {
                title: 'Reparent Entity',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                id: EntityIdSchema,
                parent: EntityIdSchema.describe('New parent entity resource_id'),
                index: z.number().int().min(0).optional().describe('Insertion index among the parent\'s children'),
                preserveTransform: z.boolean().optional().describe('Keep the same world transform after reparenting')
            }
        },
        (options) => {
            return wss.call('entities:reparent', options);
        }
    );

    server.registerTool(
        'delete_entities',
        {
            description: [
                'Permanently delete entities and all of their descendants. This is destructive and not undoable via this tool.',
                'The scene root cannot be deleted. Returns { deleted: <count> }.',
                'When NOT to use: to temporarily hide an entity (set enabled=false via modify_entities instead) or to remove a single component (use remove_components).'
            ].join(' '),
            annotations: {
                title: 'Delete Entities',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: true,
                openWorldHint: false
            },
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
            description: [
                'List entities in the current scene, returning compact summaries by default (resource_id, name, hierarchy path, parent, enabled, tags, component names).',
                'Results are paginated: use limit (default 50) and offset to page through large scenes; the response meta includes total, count, hasMore and nextCursor.',
                'Filter with name (case-insensitive contains), component (only entities with that component) and/or tag. Use full=true only when you need the complete entity JSON (large; prefer summaries).',
                'An empty result is a successful, empty list (not an error).',
                'When NOT to use: when you already know an entity id and just need to act on it; for runtime/play-mode state (this returns edit-time data only).'
            ].join(' '),
            annotations: {
                title: 'List Entities',
                readOnlyHint: true,
                openWorldHint: false
            },
            inputSchema: {
                full: z.boolean().optional().describe('Return full entity JSON instead of the compact summary (much larger)'),
                name: z.string().optional().describe('Filter by name (case-insensitive contains)'),
                component: ComponentNameSchema.optional().describe('Filter to entities that have this component'),
                tag: z.string().optional().describe('Filter by tag'),
                limit: z.number().int().min(1).max(500).optional().describe('Max entities to return (default 50)'),
                offset: z.number().int().min(0).optional().describe('Number of entities to skip (use nextCursor from a previous page)')
            }
        },
        (options) => {
            return wss.call('entities:list', options);
        }
    );

    server.registerTool(
        'resolve_entities',
        {
            description: [
                'Resolve entities by name into their resource_ids and hierarchy paths, so you can drive follow-up calls without shuttling UUIDs.',
                'By default matches case-insensitive substrings; set exact=true to match the full name. Returns summaries (resource_id, name, path, components).',
                'An empty result is a successful, empty list (not an error).',
                'When NOT to use: when you need filtering by component/tag or pagination (use list_entities).'
            ].join(' '),
            annotations: {
                title: 'Resolve Entities By Name',
                readOnlyHint: true,
                openWorldHint: false
            },
            inputSchema: {
                name: z.string().min(1).describe('Entity name to look up'),
                exact: z.boolean().optional().describe('Require an exact (case-insensitive) name match instead of substring')
            }
        },
        ({ name, exact }) => {
            return wss.call('entities:resolve', { name, exact });
        }
    );

    server.registerTool(
        'add_components',
        {
            description: [
                'Add one or more components to an existing entity (camera, light, render, collision, rigidbody, element, screen, script, sound, etc.).',
                'Pass each component\'s initial data under its name. Returns the updated entity summary.',
                'Physics note: rigidbody/collision components only simulate when the project has the Ammo physics module enabled (Editor: IMPORT AMMO / enable physics in project settings). If it is not enabled, add the components then enable Ammo — do not stall on the decision.',
                'When NOT to use: to create a new entity (use create_entities), to tweak an existing component property (use modify_entities), or to attach a script to a script component (use attach_script).'
            ].join(' '),
            annotations: {
                title: 'Add Components',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
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
            description: [
                'Remove one or more components from an entity by component name. Returns the updated entity summary.',
                'When NOT to use: to delete the whole entity (use delete_entities) or to just disable a component (set components.<name>.enabled=false via modify_entities).'
            ].join(' '),
            annotations: {
                title: 'Remove Components',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: true,
                openWorldHint: false
            },
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
            description: [
                'Add a named script to an entity that ALREADY has a script component. Returns the updated entity summary.',
                'When NOT to use: if the entity has no script component yet, prefer attach_script, which creates the component and attaches the script in one call.'
            ].join(' '),
            annotations: {
                title: 'Add Script To Script Component',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                id: EntityIdSchema,
                scriptName: z.string().describe('Registered script name (the parsed script\'s name attribute)')
            }
        },
        ({ id, scriptName }) => {
            return wss.call('entities:components:script:add', id, scriptName);
        }
    );

    server.registerTool(
        'attach_script',
        {
            description: [
                'Attach a script to an entity in one step: creates the script component if missing, then adds the named script.',
                'This consolidates the common "add script component" + "add script" flow. Returns the updated entity summary.',
                'Note: the script must already exist as a parsed script asset (create one with create_assets type="script", set its code with set_script_text, then script_parse).',
                'When NOT to use: to write the script\'s source code (use set_script_text) or to set script attribute values (use modify_entities on components.script.scripts.<name>.attributes).'
            ].join(' '),
            annotations: {
                title: 'Attach Script',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                id: EntityIdSchema,
                scriptName: z.string().describe('Registered script name to attach'),
                attributes: z.record(z.any()).optional().describe('Initial script attribute values'),
                index: z.number().int().min(0).optional().describe('Execution order index')
            }
        },
        ({ id, scriptName, attributes, index }) => {
            return wss.call('entities:scripts:add', {
                entityIds: [id],
                script: scriptName,
                attributes,
                index
            });
        }
    );

    server.registerTool(
        'add_entity_scripts',
        {
            description: 'Attach a parsed script to one or more entities, creating script components when needed.',
            annotations: {
                title: 'Add Entity Scripts',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                entityIds: z.array(EntityIdSchema).nonempty(),
                script: z.string().min(1).describe('Registered script name'),
                attributes: z.record(z.any()).optional(),
                index: z.number().int().min(0).optional().describe('Execution order index')
            }
        },
        (options) => wss.call('entities:scripts:add', options)
    );

    server.registerTool(
        'remove_entity_scripts',
        {
            description: 'Remove a script from one or more entities.',
            annotations: {
                title: 'Remove Entity Scripts',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                entityIds: z.array(EntityIdSchema).nonempty(),
                script: z.string().min(1).describe('Registered script name')
            }
        },
        (options) => wss.call('entities:scripts:remove', options)
    );

    server.registerTool(
        'move_entity_script',
        {
            description: 'Move a script to a new execution-order index on an entity.',
            annotations: {
                title: 'Move Entity Script',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                entityId: EntityIdSchema,
                script: z.string().min(1).describe('Registered script name'),
                index: z.number().int().min(0).describe('New execution-order index')
            }
        },
        (options) => wss.call('entities:scripts:move', options)
    );

    server.registerTool(
        'search_entities',
        {
            description: [
                'Fuzzy-search entities by name and return the best matches ranked by relevance (each as a compact summary).',
                'Use this to find an entity when you only know part of its name. When NOT to use: to filter by component or tag (use list_entities) or to find entities using a script (use find_entities_by_script).'
            ].join(' '),
            annotations: {
                title: 'Search Entities',
                readOnlyHint: true,
                openWorldHint: false
            },
            inputSchema: {
                query: z.string().describe('Name (or partial name) to fuzzy-match against'),
                limit: z.number().int().min(1).optional().describe('Max results to return (default: all matches)')
            }
        },
        ({ query, limit }) => {
            return wss.call('entities:search', query, limit);
        }
    );

    server.registerTool(
        'find_entities_by_script',
        {
            description: [
                'List the entities whose script component uses a given (registered) script name. Returns compact entity summaries.',
                'When NOT to use: to search entities by name (use search_entities) or to read a script\'s source (use get_asset_text).'
            ].join(' '),
            annotations: {
                title: 'Find Entities By Script',
                readOnlyHint: true,
                openWorldHint: false
            },
            inputSchema: {
                script: z.string().describe('Registered script name to look up')
            }
        },
        ({ script }) => {
            return wss.call('entities:byScript', script);
        }
    );
};

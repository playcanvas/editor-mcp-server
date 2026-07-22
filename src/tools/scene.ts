import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../wss.ts';

import { SceneSettingsSchema } from './schema/scene-settings.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'modify_scene_settings',
        {
            description: [
                'Modify scene-wide settings such as physics gravity and rendering (fog, ambient light, skybox, tonemapping, exposure, lightmapping).',
                'Only the provided fields are changed. Returns the full resulting scene settings snapshot.',
                'When NOT to use: to change a single entity (use modify_entities) or to read settings without changing them (use query_scene_settings).'
            ].join(' '),
            annotations: {
                title: 'Modify Scene Settings',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                settings: SceneSettingsSchema
            }
        },
        ({ settings }) => {
            return wss.call('scene:settings:modify', settings);
        }
    );

    server.registerTool(
        'query_scene_settings',
        {
            description: [
                'Read the current scene-wide settings (physics + rendering). Returns the full settings object.',
                'When NOT to use: to change settings (use modify_scene_settings).'
            ].join(' '),
            annotations: {
                title: 'Query Scene Settings',
                readOnlyHint: true,
                openWorldHint: false
            }
        },
        () => {
            return wss.call('scene:settings:query');
        }
    );

    server.registerTool(
        'list_scenes',
        {
            description: [
                'List the scenes in the current project/branch. Returns scene records including id, uniqueId and name.',
                'Use uniqueId with load_scene to switch scenes, and id with get_scene / duplicate_scene / delete_scene.',
                'When NOT to use: to list assets (use list_assets).'
            ].join(' '),
            annotations: {
                title: 'List Scenes',
                readOnlyHint: true,
                openWorldHint: false
            }
        },
        () => {
            return wss.call('scenes:list');
        }
    );

    server.registerTool(
        'get_scene',
        {
            description: [
                'Get a single scene by its id (not uniqueId). Returns the full scene record.',
                'When NOT to use: to load/switch to a scene in the editor (use load_scene) or to list scenes (use list_scenes).'
            ].join(' '),
            annotations: {
                title: 'Get Scene',
                readOnlyHint: true,
                openWorldHint: false
            },
            inputSchema: {
                id: z.union([z.number(), z.string()]).describe('Scene id (the "id" field from list_scenes, not uniqueId)')
            }
        },
        ({ id }) => {
            return wss.call('scenes:get', id);
        }
    );

    server.registerTool(
        'load_scene',
        {
            description: [
                'Load (switch the editor to) a scene by its uniqueId. This unloads the current scene and opens the target one.',
                'By default the tool returns after queuing the load. Set wait=true to return only after the requested scene is active.',
                'When NOT to use: to read a scene without switching (use get_scene) or to create a new scene (use create_scene).'
            ].join(' '),
            annotations: {
                title: 'Load Scene',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                uniqueId: z.union([z.number(), z.string()]).describe('Scene uniqueId (the "uniqueId" field from list_scenes, not id)'),
                wait: z.boolean().optional().describe('Wait until the editor reports the requested scene is active')
            }
        },
        ({ uniqueId, wait }) =>
            wait === undefined ? wss.call('scene:load', uniqueId) : wss.call('scene:load', uniqueId, { wait })
    );

    server.registerTool(
        'create_scene',
        {
            description: [
                'Create a new empty scene in the current project/branch. Returns the created scene record.',
                'This does not switch to the new scene; call load_scene with its uniqueId to open it.',
                'When NOT to use: to copy an existing scene (use duplicate_scene).'
            ].join(' '),
            annotations: {
                title: 'Create Scene',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                name: z.string().optional().describe('Name for the new scene (optional)')
            }
        },
        ({ name }) => {
            return wss.call('scenes:new', name);
        }
    );

    server.registerTool(
        'duplicate_scene',
        {
            description: [
                'Duplicate an existing scene by its id, giving the copy a new name. Returns the created scene record.',
                'When NOT to use: to create an empty scene (use create_scene).'
            ].join(' '),
            annotations: {
                title: 'Duplicate Scene',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                id: z.union([z.number(), z.string()]).describe('Scene id to duplicate (the "id" field from list_scenes)'),
                name: z.string().describe('Name for the duplicated scene')
            }
        },
        ({ id, name }) => {
            return wss.call('scenes:duplicate', id, name);
        }
    );

    server.registerTool(
        'delete_scene',
        {
            description: [
                'Permanently delete a scene by its id. This is destructive and cannot be undone.',
                'When NOT to use: to switch away from a scene without deleting it (use load_scene).'
            ].join(' '),
            annotations: {
                title: 'Delete Scene',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                id: z.union([z.number(), z.string()]).describe('Scene id to delete (the "id" field from list_scenes)')
            }
        },
        ({ id }) => {
            return wss.call('scenes:delete', id);
        }
    );
};

import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { type WSS } from '../wss';
import { SceneSettingsSchema } from './schema/scene-settings';

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
            return wss.call('modify_scene_settings', 'scene:settings:modify', settings);
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
            return wss.call('query_scene_settings', 'scene:settings:query');
        }
    );
};

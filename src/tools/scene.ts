import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { type WSS } from '../wss.ts';
import { SceneSettingsSchema } from './schema/scene-settings.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'modify_scene_settings',
        'Modify the scene settings',
        {
            settings: SceneSettingsSchema
        },
        ({ settings }) => {
            return wss.call('scene:settings:modify', settings);
        }
    );
};

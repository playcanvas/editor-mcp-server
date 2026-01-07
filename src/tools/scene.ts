import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { type WSS } from '../wss';
import { SceneSettingsSchema } from './schema/scene-settings';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'modify_scene_settings',
        {
            description: 'Modify the scene settings',
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
            description: 'Query the scene settings'
        },
        () => {
            return wss.call('scene:settings:query');
        }
    );
};

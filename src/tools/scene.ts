import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { type WSS } from '../wss';
import { SceneSettingsSchema } from './schema/scene-settings';

export const register = (mcp: McpServer, wss: WSS) => {
    mcp.tool(
        'modify_scene_settings',
        'Modify the scene settings',
        {
            settings: SceneSettingsSchema
        },
        ({ settings }) => {
            return wss.call('scene:settings:modify', settings);
        }
    );

    mcp.tool(
        'query_scene_settings',
        'Query the scene settings',
        {},
        () => {
            return wss.call('scene:settings:modify', {});
        }
    );
};

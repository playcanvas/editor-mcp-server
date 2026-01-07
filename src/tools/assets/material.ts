import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { type WSS } from '../../wss';
import { AssetIdSchema, RgbSchema } from '../schema/common';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'set_material_diffuse',
        {
            description: 'Set material diffuse color',
            inputSchema: {
                assetId: AssetIdSchema,
                color: RgbSchema
            }
        },
        ({ assetId, color }) => {
            return wss.call('assets:property:set', assetId, 'diffuse', color);
        }
    );
};

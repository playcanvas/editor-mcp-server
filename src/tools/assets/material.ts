import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { type WSS } from '../../wss';
import { AssetIdSchema, RgbSchema } from '../schema/common';

export const register = (mcp: McpServer, wss: WSS) => {
    mcp.tool(
        'set_material_diffuse',
        'Set diffuse property on a material',
        {
            assetId: AssetIdSchema,
            color: RgbSchema
        },
        ({ assetId, color }) => {
            return wss.call('assets:property:set', assetId, 'diffuse', color);
        }
    );
};

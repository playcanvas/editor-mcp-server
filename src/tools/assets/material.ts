import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../../wss';
import { MaterialSchema } from '../schema/asset';

export const register = (mcp: McpServer, wss: WSS) => {
    mcp.tool(
        'set_material_diffuse',
        'Set diffuse property on a material',
        {
            assetId: z.number(),
            color: z.array(z.number()).length(3)
        },
        ({ assetId, color }) => {
            return wss.call('assets:property:set', assetId, 'diffuse', color);
        }
    );
};

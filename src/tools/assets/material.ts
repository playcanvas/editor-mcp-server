import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../../wss.ts';
import { MaterialSchema } from '../schema/asset.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'create_material',
        'Create a new material',
        {
            name: z.string().optional(),
            data: MaterialSchema.optional()
        },
        (params) => {
            return wss.call('assets:create', 'material', params);
        }
    );

    server.tool(
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

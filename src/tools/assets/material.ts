import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../../wss';
import { MaterialSchema } from '../schema/asset';

export const register = (mcp: McpServer, wss: WSS) => {
    mcp.tool(
        'create_material',
        'Create a new material',
        {
            data: MaterialSchema.optional().describe('The material data to initialize the new material with.'),
            folder: z.number().optional().describe('The asset ID of the folder asset to create the material in. If not specified, the material will be created in the root folder.')
        },
        (params) => {
            return wss.call('assets:create', 'material', params);
        }
    );

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

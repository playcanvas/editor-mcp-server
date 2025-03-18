import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../../wss.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'create_material',
        'Create a new material',
        {
            name: z.string()
        },
        async ({ name }) => {
            try {
                const res = await wss.send('asset:create', 'material', name, {});
                return {
                    content: [{
                        type: 'text',
                        text: `Created material: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `Failed to create material: ${err.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        'set_material_diffuse',
        'Set diffuse property on a material',
        {
            assetId: z.number(),
            color: z.array(z.number()).length(3)
        },
        async ({ assetId, color }) => {
            try {
                const res = await wss.send('asset:property:set', assetId, 'diffuse', color);
                return {
                    content: [{
                        type: 'text',
                        text: `Set diffuse property on material ${assetId}: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `Failed to set diffuse property on material ${assetId}: ${err.message}`
                    }],
                    isError: true
                };
            }
        }
    );
};

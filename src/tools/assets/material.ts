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
                const { data, error } = await wss.send('assets:create', 'material', { name });
                if (error) {
                    throw new Error(error);
                }
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(data)
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: err.message
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
                const { data, error } = await wss.send('assets:property:set', assetId, 'diffuse', color);
                if (error) {
                    throw new Error(error);
                }
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(data)
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: err.message
                    }],
                    isError: true
                };
            }
        }
    );
};

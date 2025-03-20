import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../../wss.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'create_script',
        'Create a new script',
        {
            name: z.string(),
            text: z.string().optional()
        },
        async ({ name, text }) => {
            try {
                const { data, error } = await wss.send('assets:create', 'script', { filename: `${name}.js`, text });
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
        'set_script_text',
        'Set script text',
        {
            assetId: z.number(),
            text: z.string()
        },
        async ({ assetId, text }) => {
            try {
                const { data, error } = await wss.send('assets:script:text:set', assetId, text);
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
        'script_parse',
        'Parse the script after modification',
        {
            assetId: z.number()
        },
        async ({ assetId }) => {
            try {
                const { data, error } = await wss.send('assets:script:parse', assetId);
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

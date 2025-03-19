import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../../wss.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'create_script',
        'Create a new script',
        {
            name: z.string()
        },
        async ({ name }) => {
            try {
                const res = await wss.send('assets:create', 'script', { filename: `${name}.mjs` });
                if (res === undefined) {
                    throw new Error('Failed to create script');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Created script: ${JSON.stringify(res)}`
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
        'set_script_content',
        'Set script content',
        {
            assetId: z.number(),
            content: z.string()
        },
        async ({ assetId, content }) => {
            try {
                const res = await wss.send('assets:script:content:set', assetId, content);
                if (res === undefined) {
                    throw new Error('Failed to set script content');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Set script content ${assetId}: ${JSON.stringify(res)}`
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

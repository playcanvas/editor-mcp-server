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
                const res = await wss.send('asset:create', 'script', name);
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
                        text: `Failed to create script: ${err.message}`
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
                const res = await wss.send('asset:script:content:set', assetId, content);
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
                        text: `Failed script content ${assetId}: ${err.message}`
                    }],
                    isError: true
                };
            }
        }
    );
};

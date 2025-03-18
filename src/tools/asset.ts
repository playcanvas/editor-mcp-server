import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { type WSS } from '../wss.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'asset_list',
        'List all assets',
        {},
        async () => {
            try {
                const res = await wss.send('asset:list');
                return {
                    content: [{
                        type: 'text',
                        text: `Assets: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `Failed to list assets: ${err.message}`
                    }],
                    isError: true
                };
            }
        }
    );
};

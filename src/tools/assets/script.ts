import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../../wss';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'set_script_text',
        {
            description: 'Set script text',
            inputSchema: {
                assetId: z.number(),
                text: z.string()
            }
        },
        ({ assetId, text }) => {
            return wss.call('assets:script:text:set', assetId, text);
        }
    );

    server.registerTool(
        'script_parse',
        {
            description: 'Parse the script after modification',
            inputSchema: {
                assetId: z.number()
            }
        },
        ({ assetId }) => {
            return wss.call('assets:script:parse', assetId);
        }
    );
};

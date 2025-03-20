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
        ({ name, text }) => {
            return wss.call('assets:create', 'script', { filename: `${name}.js`, text });
        }
    );

    server.tool(
        'set_script_text',
        'Set script text',
        {
            assetId: z.number(),
            text: z.string()
        },
        ({ assetId, text }) => {
            return wss.call('assets:script:text:set', assetId, text);
        }
    );

    server.tool(
        'script_parse',
        'Parse the script after modification',
        {
            assetId: z.number()
        },
        ({ assetId }) => {
            return wss.call('assets:script:parse', assetId);
        }
    );
};

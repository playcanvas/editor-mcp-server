import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../../wss';

export const register = (mcp: McpServer, wss: WSS) => {
    mcp.tool(
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

    mcp.tool(
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

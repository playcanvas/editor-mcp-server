import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { type WSS } from '../wss';

export const register = (mcp: McpServer, wss: WSS) => {
    mcp.tool(
        'capture_viewport',
        'Capture a screenshot of the Editor viewport. Use this to visually verify what you have built.',
        {},
        () => {
            return wss.callImage('viewport:capture');
        }
    );
};

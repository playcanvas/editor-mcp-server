import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'list_assets',
        'List all assets',
        {},
        () => {
            return wss.call('assets:list');
        }
    );

    server.tool(
        'delete_assets',
        'Delete one or more assets',
        {
            ids: z.array(z.number())
        },
        ({ ids }) => {
            return wss.call('assets:delete', ids);
        }
    );

    server.tool(
        'instantiate_assets',
        'Instantiate one or more asset',
        {
            ids: z.array(z.number())
        },
        ({ ids }) => {
            return wss.call('assets:instantiate', ids);
        }
    );
};

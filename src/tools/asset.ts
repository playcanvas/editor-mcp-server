import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss';

export const register = (mcp: McpServer, wss: WSS) => {
    mcp.tool(
        'list_assets',
        'List all assets with the option to filter by type',
        {
            type: z.enum(['css', 'cubemap', 'folder', 'font', 'html', 'json', 'material', 'render', 'script', 'template', 'text', 'texture']).optional().describe('The type of assets to list. If not specified, all assets will be listed.')
        },
        ({ type }) => {
            return wss.call('assets:list', type);
        }
    );

    mcp.tool(
        'delete_assets',
        'Delete one or more assets',
        {
            ids: z.array(z.number())
        },
        ({ ids }) => {
            return wss.call('assets:delete', ids);
        }
    );

    mcp.tool(
        'instantiate_template_assets',
        'Instantiate one or more template assets',
        {
            ids: z.array(z.number()).describe('The asset IDs of the template assets to instantiate')
        },
        ({ ids }) => {
            return wss.call('assets:instantiate', ids);
        }
    );
};

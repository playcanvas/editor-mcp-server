import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../../wss';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'set_script_text',
        {
            description: [
                'Overwrite the source code of an existing script asset. Provide the full file contents in text.',
                'After changing the code, call script_parse so the editor re-reads the script\'s name and attributes.',
                'When NOT to use: to attach a script to an entity (use attach_script) or to create the script asset itself (use create_assets type="script").'
            ].join(' '),
            annotations: {
                title: 'Set Script Text',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                assetId: z.number().describe('Script asset id'),
                text: z.string().describe('Full JavaScript/TypeScript source of the script')
            }
        },
        ({ assetId, text }) => {
            return wss.call('set_script_text', 'assets:script:text:set', assetId, text);
        }
    );

    server.registerTool(
        'script_parse',
        {
            description: [
                'Parse a script asset to extract its declared script name(s) and attribute definitions. Run this after set_script_text.',
                'Returns the parsed script metadata. When NOT to use: to read entity-level script attribute values (use list_entities/modify_entities).'
            ].join(' '),
            annotations: {
                title: 'Parse Script',
                readOnlyHint: true,
                openWorldHint: false
            },
            inputSchema: {
                assetId: z.number().describe('Script asset id')
            }
        },
        ({ assetId }) => {
            return wss.call('script_parse', 'assets:script:parse', assetId);
        }
    );
};

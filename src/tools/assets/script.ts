import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../../wss.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'get_asset_text',
        {
            description: [
                'Read the full text contents of a text-based asset (script, text, json, css, html, or shader), returned as text.',
                'When NOT to use: to read a script\'s declared name or attribute definitions (use script_parse), to read binary assets like textures or models, or to list assets (use list_assets).'
            ].join(' '),
            annotations: {
                title: 'Get Asset Text',
                readOnlyHint: true,
                openWorldHint: false
            },
            inputSchema: {
                assetId: z.number().describe('Asset id of a text-based asset (script, text, json, css, html, shader)')
            }
        },
        ({ assetId }) => {
            return wss.call('assets:file:text:get', assetId);
        }
    );

    server.registerTool(
        'set_asset_text',
        {
            description: 'Overwrite the full contents of a CSS, HTML, JSON, script, shader, or text asset.',
            annotations: {
                title: 'Set Asset Text',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                assetId: z.number().describe('Text-based asset id'),
                text: z.string().describe('Full replacement contents')
            }
        },
        ({ assetId, text }) => wss.call('assets:text:set', assetId, text)
    );

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
            return wss.call('assets:text:set', assetId, text);
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
            return wss.call('assets:script:parse', assetId);
        }
    );
};

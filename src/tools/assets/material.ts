import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { type WSS } from '../../wss';
import { MaterialSchema } from '../schema/asset';
import { AssetIdSchema, RgbSchema } from '../schema/common';

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'set_material_diffuse',
        {
            description: [
                'Set only the diffuse (base) color of a material. Color is [r,g,b] in 0-1.',
                'When NOT to use: to change any other material property, or to set several properties at once (use set_material_properties).'
            ].join(' '),
            annotations: {
                title: 'Set Material Diffuse Color',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                assetId: AssetIdSchema,
                color: RgbSchema
            }
        },
        ({ assetId, color }) => {
            return wss.call('set_material_diffuse', 'assets:property:set', assetId, 'diffuse', color);
        }
    );

    server.registerTool(
        'set_material_properties',
        {
            description: [
                'Set any combination of properties on a material asset in one call (diffuse, emissive, metalness, gloss/shininess, opacity, maps, etc.).',
                'Only the provided fields are changed; all fields are optional. Colors are [r,g,b] 0-1; map fields take asset ids. Returns the updated asset summary.',
                'When NOT to use: to change only the diffuse color (set_material_diffuse is a shorthand) or to create a new material (use create_assets type="material").'
            ].join(' '),
            annotations: {
                title: 'Set Material Properties',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                assetId: AssetIdSchema,
                properties: MaterialSchema.describe('Material properties to set (only included fields are changed)')
            }
        },
        ({ assetId, properties }) => {
            return wss.call('set_material_properties', 'assets:data:set', assetId, properties);
        }
    );
};

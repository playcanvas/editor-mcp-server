import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../wss.ts';

const SelectionIdSchema = z.union([z.number(), z.string()]);

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'undo',
        {
            description: [
                'Undo the last edit in the editor. Returns whether anything was undone plus the resulting { canUndo, canRedo } state.',
                'Use this to roll back a change you just made. When NOT to use: to switch scenes (use load_scene).'
            ].join(' '),
            annotations: {
                title: 'Undo',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            }
        },
        () => {
            return wss.call('history:undo');
        }
    );

    server.registerTool(
        'redo',
        {
            description: [
                'Redo the last undone edit in the editor. Returns whether anything was redone plus the resulting { canUndo, canRedo } state.',
                'When NOT to use: to repeat an arbitrary action (redo only re-applies an edit that was just undone).'
            ].join(' '),
            annotations: {
                title: 'Redo',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            }
        },
        () => {
            return wss.call('history:redo');
        }
    );

    server.registerTool(
        'get_selection',
        {
            description: [
                'Read the editor\'s current selection. Returns { type: "entity" | "asset" | null, ids: [...] }.',
                'Entity ids are resource_ids (strings); asset ids are numbers. When NOT to use: to list all entities/assets (use list_entities/list_assets).'
            ].join(' '),
            annotations: {
                title: 'Get Selection',
                readOnlyHint: true,
                openWorldHint: false
            }
        },
        () => {
            return wss.call('selection:get');
        }
    );

    server.registerTool(
        'set_selection',
        {
            description: [
                'Replace the editor\'s selection with the given entities or assets. Selecting shows them in the inspector and highlights them in the viewport/tree.',
                'Pass type "entity" (ids are resource_ids) or "asset" (ids are numbers). An empty ids array clears the selection.',
                'When NOT to use: to modify the selected items (use modify_entities) or to frame them in the viewport (use focus_viewport).'
            ].join(' '),
            annotations: {
                title: 'Set Selection',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                type: z.enum(['entity', 'asset']).describe('What kind of items the ids refer to'),
                ids: z.array(SelectionIdSchema).describe('Ids to select (entity resource_ids or asset ids); empty clears the selection')
            }
        },
        ({ type, ids }) => {
            return wss.call('selection:set', type, ids);
        }
    );

    server.registerTool(
        'clear_selection',
        {
            description: 'Clear the editor\'s current selection.',
            annotations: {
                title: 'Clear Selection',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            }
        },
        () => {
            return wss.call('selection:clear');
        }
    );

    server.registerTool(
        'set_transform_gizmo',
        {
            description: [
                'Set the viewport transform gizmo: mode (translate/rotate/scale/resize), coordinate space (world/local), and/or snapping.',
                'Only the provided fields change. Returns the resulting { mode, space }.',
                'When NOT to use: to actually move/rotate/scale an entity (use modify_entities on its transform).'
            ].join(' '),
            annotations: {
                title: 'Set Transform Gizmo',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                mode: z.enum(['translate', 'rotate', 'scale', 'resize']).optional().describe('Transform gizmo mode'),
                space: z.enum(['world', 'local']).optional().describe('Coordinate space the gizmo operates in'),
                snap: z.boolean().optional().describe('Enable or disable grid/angle snapping')
            }
        },
        ({ mode, space, snap }) => {
            return wss.call('gizmo:state:set', { mode, space, snap });
        }
    );
};

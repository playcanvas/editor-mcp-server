import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../wss.ts';

const IdSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const EventPropertiesSchema = z
    .object({
        name: z.string().min(1).optional(),
        time: z.number().finite().min(0).max(1).optional(),
        number: z.number().finite().nullable().optional(),
        string: z.string().optional()
    })
    .strict()
    .refine((value) => Object.values(value).some((item) => item !== undefined), 'Provide at least one event property.');

export const AnimationEventOperationSchema = z.discriminatedUnion('kind', [
    z
        .object({
            kind: z.literal('event.add'),
            id: IdSchema.optional(),
            name: z.string().min(1),
            time: z.number().finite().min(0).max(1),
            properties: z
                .object({
                    number: z.number().finite().nullable().optional(),
                    string: z.string().optional()
                })
                .strict()
                .optional()
        })
        .strict(),
    z
        .object({
            kind: z.literal('event.update'),
            id: IdSchema,
            properties: EventPropertiesSchema
        })
        .strict(),
    z.object({ kind: z.literal('event.remove'), id: IdSchema }).strict()
]);

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'get_animation_events',
        {
            description:
                'Get the stable-id event map for a GLB animation asset, including time and optional number/string payloads.',
            annotations: {
                title: 'Get Animation Events',
                readOnlyHint: true,
                openWorldHint: false
            },
            inputSchema: {
                assetId: IdSchema.describe('GLB animation asset id')
            }
        },
        ({ assetId }) => wss.call('animation:events:get', assetId)
    );

    server.registerTool(
        'modify_animation_events',
        {
            description:
                'Add, update, or remove GLB animation events as one undoable transaction. Times are normalized from 0 to 1. Event ids remain stable and generated ids are returned.',
            annotations: {
                title: 'Modify Animation Events',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                assetId: IdSchema.describe('GLB animation asset id'),
                operations: z.array(AnimationEventOperationSchema).min(1).max(100)
            }
        },
        ({ assetId, operations }) => wss.call('animation:events:modify', assetId, operations)
    );
};

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../wss.ts';

const IdSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const NameSchema = z
    .string()
    .min(1)
    .regex(/^[A-Za-z0-9 _-]+$/);
const ParameterTypeSchema = z.enum(['INTEGER', 'FLOAT', 'BOOLEAN', 'TRIGGER']);
const PredicateSchema = z.enum([
    'EQUAL_TO',
    'NOT_EQUAL_TO',
    'LESS_THAN',
    'LESS_THAN_EQUAL_TO',
    'GREATER_THAN',
    'GREATER_THAN_EQUAL_TO'
]);
const InterruptionSchema = z.enum([
    'NONE',
    'NEXT_STATE',
    'PREV_STATE',
    'NEXT_STATE_PREV_STATE',
    'PREV_STATE_NEXT_STATE'
]);
const ValueSchema = z.union([z.number().finite(), z.boolean()]);
const fields = (value: Record<string, unknown>) => Object.values(value).some((item) => item !== undefined);

const LayerPropertiesSchema = z
    .object({
        name: NameSchema.optional(),
        blendType: z.enum(['OVERWRITE', 'ADDITIVE']).optional(),
        weight: z.number().min(0).max(1).optional(),
        defaultStateId: IdSchema.optional()
    })
    .strict()
    .refine(fields, 'Provide at least one layer property.');

const StatePropertiesSchema = z
    .object({
        name: NameSchema.optional(),
        speed: z.number().finite().optional(),
        loop: z.boolean().optional(),
        posX: z.number().finite().optional(),
        posY: z.number().finite().optional()
    })
    .strict()
    .refine(fields, 'Provide at least one state property.');

const TransitionPropertiesSchema = z
    .object({
        exitTime: z.number().finite().min(0).optional(),
        interruptionSource: InterruptionSchema.optional(),
        priority: z.number().int().min(0).optional(),
        time: z.number().finite().min(0).optional(),
        transitionOffset: z.number().finite().min(0).max(1).optional()
    })
    .strict()
    .refine(fields, 'Provide at least one transition property.');

const ConditionPropertiesSchema = z
    .object({
        parameterName: NameSchema.optional(),
        predicate: PredicateSchema.optional(),
        value: ValueSchema.optional()
    })
    .strict()
    .refine(fields, 'Provide at least one condition property.');

const ParameterPropertiesSchema = z
    .object({
        name: NameSchema.optional(),
        type: ParameterTypeSchema.optional(),
        value: ValueSchema.optional()
    })
    .strict()
    .refine(fields, 'Provide at least one parameter property.');

const AddConditionPropertiesSchema = z
    .object({
        parameterName: NameSchema,
        predicate: PredicateSchema.default('EQUAL_TO'),
        value: ValueSchema
    })
    .strict();

export const AnimStateGraphOperationSchema = z.discriminatedUnion('kind', [
    z
        .object({
            kind: z.literal('layer.add'),
            id: IdSchema.optional(),
            name: NameSchema.optional(),
            properties: z
                .object({
                    blendType: z.enum(['OVERWRITE', 'ADDITIVE']).optional(),
                    weight: z.number().min(0).max(1).optional()
                })
                .strict()
                .optional()
        })
        .strict(),
    z
        .object({
            kind: z.literal('layer.update'),
            id: IdSchema,
            properties: LayerPropertiesSchema
        })
        .strict(),
    z.object({ kind: z.literal('layer.remove'), id: IdSchema }).strict(),
    z.object({ kind: z.literal('layer.move'), id: IdSchema, index: IdSchema }).strict(),
    z
        .object({
            kind: z.literal('state.add'),
            layerId: IdSchema,
            id: IdSchema.optional(),
            name: NameSchema,
            properties: z
                .object({
                    speed: z.number().finite().optional(),
                    loop: z.boolean().optional(),
                    posX: z.number().finite().optional(),
                    posY: z.number().finite().optional()
                })
                .strict()
                .optional()
        })
        .strict(),
    z
        .object({
            kind: z.literal('state.update'),
            id: IdSchema,
            properties: StatePropertiesSchema
        })
        .strict(),
    z.object({ kind: z.literal('state.remove'), id: IdSchema }).strict(),
    z
        .object({
            kind: z.literal('transition.add'),
            layerId: IdSchema,
            id: IdSchema.optional(),
            from: IdSchema,
            to: IdSchema,
            properties: TransitionPropertiesSchema.optional()
        })
        .strict(),
    z
        .object({
            kind: z.literal('transition.update'),
            id: IdSchema,
            properties: TransitionPropertiesSchema
        })
        .strict(),
    z.object({ kind: z.literal('transition.remove'), id: IdSchema }).strict(),
    z
        .object({
            kind: z.literal('transition.move'),
            id: IdSchema,
            index: IdSchema
        })
        .strict(),
    z
        .object({
            kind: z.literal('condition.add'),
            transitionId: IdSchema,
            id: IdSchema.optional(),
            properties: AddConditionPropertiesSchema
        })
        .strict(),
    z
        .object({
            kind: z.literal('condition.update'),
            transitionId: IdSchema,
            id: IdSchema,
            properties: ConditionPropertiesSchema
        })
        .strict(),
    z
        .object({
            kind: z.literal('condition.remove'),
            transitionId: IdSchema,
            id: IdSchema
        })
        .strict(),
    z
        .object({
            kind: z.literal('parameter.add'),
            id: IdSchema.optional(),
            name: NameSchema,
            type: ParameterTypeSchema,
            value: ValueSchema
        })
        .strict(),
    z
        .object({
            kind: z.literal('parameter.update'),
            id: IdSchema,
            properties: ParameterPropertiesSchema
        })
        .strict(),
    z.object({ kind: z.literal('parameter.remove'), id: IdSchema }).strict()
]);

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'get_anim_state_graph',
        {
            description:
                'Get the complete structural data for an anim state graph asset, including layers, states, transitions, conditions, and parameters.',
            annotations: {
                title: 'Get Anim State Graph',
                readOnlyHint: true,
                openWorldHint: false
            },
            inputSchema: {
                assetId: IdSchema.describe('Anim state graph asset id')
            }
        },
        ({ assetId }) => wss.call('animstategraph:get', assetId)
    );

    server.registerTool(
        'modify_anim_state_graph',
        {
            description: [
                'Apply a validated batch of structural operations to an anim state graph as one undoable transaction.',
                'Add operations may omit id to allocate one; generated ids and the resulting graph are returned.',
                'State deletion also deletes attached transitions. Parameter deletion is rejected while conditions use it.',
                'Use layer.update defaultStateId to change a layer default before removing its old default state.'
            ].join(' '),
            annotations: {
                title: 'Modify Anim State Graph',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                assetId: IdSchema.describe('Anim state graph asset id'),
                operations: z.array(AnimStateGraphOperationSchema).min(1).max(100)
            }
        },
        ({ assetId, operations }) => wss.call('animstategraph:modify', assetId, operations)
    );
};

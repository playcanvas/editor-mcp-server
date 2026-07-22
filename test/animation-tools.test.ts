import assert from 'node:assert';
import { test } from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { AnimationEventOperationSchema, register as registerAnimation } from '../src/tools/animation.ts';
import { AnimStateGraphOperationSchema, register as registerGraph } from '../src/tools/animstategraph.ts';
import type { WSS } from '../src/wss.ts';

type Tool = (args: Record<string, unknown>) => unknown;

const setup = () => {
    const tools: Record<string, Tool> = {};
    const calls: { name: string; args: unknown[] }[] = [];
    const server = {
        registerTool(name: string, _config: unknown, handler: Tool) {
            tools[name] = handler;
        }
    };
    const wss = {
        call(name: string, ...args: unknown[]) {
            calls.push({ name, args });
            return { name, args };
        }
    };
    registerGraph(server as unknown as McpServer, wss as unknown as WSS);
    registerAnimation(server as unknown as McpServer, wss as unknown as WSS);
    return { tools, calls };
};

test('animation authoring schemas enforce structural boundaries', () => {
    assert.equal(
        AnimStateGraphOperationSchema.safeParse({
            kind: 'condition.add',
            transitionId: 4,
            properties: {
                parameterName: 'Speed',
                predicate: 'GREATER_THAN',
                value: 0.1
            }
        }).success,
        true
    );
    assert.equal(
        AnimStateGraphOperationSchema.safeParse({
            kind: 'condition.add',
            transitionId: 4,
            properties: { parameterName: 'Speed', predicate: 'INVALID', value: 0.1 }
        }).success,
        false
    );
    assert.equal(
        AnimationEventOperationSchema.safeParse({
            kind: 'event.add',
            name: 'jumpOff',
            time: -1
        }).success,
        false
    );
    assert.equal(
        AnimStateGraphOperationSchema.safeParse({
            kind: 'transition.update',
            id: 4,
            properties: { exitTime: -0.1 }
        }).success,
        false
    );
});

test('animation authoring tools map to exact editor driver methods', () => {
    const { tools, calls } = setup();
    const graphOps = [{ kind: 'state.add', layerId: 0, id: 8, name: 'Jump' }];
    const eventOps = [{ kind: 'event.update', id: 2, properties: { time: 0.3 } }];

    tools.get_anim_state_graph({ assetId: 10 });
    tools.modify_anim_state_graph({ assetId: 10, operations: graphOps });
    tools.get_animation_events({ assetId: 20 });
    tools.modify_animation_events({ assetId: 20, operations: eventOps });

    assert.deepEqual(calls, [
        { name: 'animstategraph:get', args: [10] },
        { name: 'animstategraph:modify', args: [10, graphOps] },
        { name: 'animation:events:get', args: [20] },
        { name: 'animation:events:modify', args: [20, eventOps] }
    ]);
});

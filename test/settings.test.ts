import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { register, SettingEditSchema } from '../src/tools/project.ts';
import type { WSS } from '../src/wss.ts';

type Handler = (args: Record<string, unknown>) => unknown;
type Config = { annotations?: { destructiveHint?: boolean } };

test('generic settings tools route scope and path edits', () => {
    const tools: Record<string, Handler> = {};
    const configs: Record<string, Config> = {};
    const calls: { name: string; args: unknown[] }[] = [];
    const server = {
        registerTool(name: string, config: unknown, handler: Handler) {
            tools[name] = handler;
            configs[name] = config as Config;
        }
    } as unknown as McpServer;
    const wss = {
        call(name: string, ...args: unknown[]) {
            calls.push({ name, args });
        }
    } as unknown as WSS;

    register(server, wss);
    tools.query_settings({ scope: 'projectUser' });
    tools.query_settings({ scope: 'projectUser', path: 'editor.pipeline' });
    tools.modify_settings({
        scope: 'projectUser',
        edits: [
            { path: 'editor.pipeline.useContainers', value: true },
            { path: 'editor.pipeline.legacy', op: 'unset' }
        ]
    });

    assert.deepEqual(calls, [
        { name: 'settings:query', args: ['projectUser'] },
        { name: 'settings:query', args: ['projectUser', 'editor.pipeline'] },
        {
            name: 'settings:modify',
            args: [
                'projectUser',
                [
                    { path: 'editor.pipeline.useContainers', value: true },
                    { path: 'editor.pipeline.legacy', op: 'unset' }
                ]
            ]
        }
    ]);
    assert.equal(configs.modify_settings.annotations?.destructiveHint, true);
    assert.equal(SettingEditSchema.safeParse({ path: 'editor.pipeline.useGlb' }).success, false);
    assert.equal(SettingEditSchema.safeParse({ path: 'editor.pipeline.useGlb', value: true }).success, true);
    assert.equal(SettingEditSchema.safeParse({ path: 'editor.pipeline.useGlb', value: true, extra: true }).success, false);
    assert.equal(SettingEditSchema.safeParse({ path: 'editor.pipeline.useGlb', op: 'unset' }).success, true);
    assert.equal(SettingEditSchema.safeParse({ path: 'editor.pipeline.useGlb', op: 'unset', value: true }).success, false);
});

const SNAPSHOT = {
    enableWebGpu: false,
    layers: {
        0: { name: 'World', opaqueSortMode: 2, transparentSortMode: 3 },
        4: { name: 'UI', opaqueSortMode: 1, transparentSortMode: 1 },
        1000: { name: 'Sky', opaqueSortMode: 2, transparentSortMode: 3 }
    },
    layerOrder: [{ layer: 0, transparent: false, enabled: true }]
};

const setup = () => {
    const tools: Record<string, Handler> = {};
    const calls: { name: string; args: unknown[] }[] = [];
    const server = {
        registerTool(name: string, _config: unknown, handler: Handler) {
            tools[name] = handler;
        }
    } as unknown as McpServer;
    const wss = {
        raw: async (name: string) => (name === 'project:settings:query' ? { data: SNAPSHOT } : { error: 'unexpected' }),
        call(name: string, ...args: unknown[]) {
            calls.push({ name, args });
        },
        fail: (name: string, message: string) => ({ isError: true, name, message })
    } as unknown as WSS;
    register(server, wss);
    return { tools, calls };
};

test('modify_project_settings sets new objects whole so the server has a parent to write into', async () => {
    const { tools, calls } = setup();
    await tools.modify_project_settings({
        settings: {
            enableWebGpu: true,
            layers: { 0: { name: 'Main' }, 1001: { name: 'Water', opaqueSortMode: 2, transparentSortMode: 3 } },
            'layers.1002.name': 'Foam',
            'layers.1002.opaqueSortMode': 2,
            'layerOrder.0.enabled': false
        }
    });
    assert.deepEqual(calls, [{
        name: 'settings:modify',
        args: ['project', [
            { path: 'enableWebGpu', value: true },
            { path: 'layers.0.name', value: 'Main' },
            { path: 'layers.1001', value: { name: 'Water', opaqueSortMode: 2, transparentSortMode: 3 } },
            { path: 'layers.1002', value: { name: 'Foam', opaqueSortMode: 2 } },
            { path: 'layerOrder.0.enabled', value: false }
        ]]
    }]);
});

test('new layers below 1000 are rejected with the next free key', async () => {
    const { tools, calls } = setup();
    const res = await tools.modify_project_settings({ settings: { 'layers.5': { name: 'Water' } } }) as { message: string };
    assert.match(res.message, /: 5\. Use layers\.1001 /);

    const named = await tools.modify_project_settings({ settings: { layers: { water: { name: 'Water' } } } }) as { message: string };
    assert.match(named.message, /: water\./);

    const generic = await tools.modify_settings({ scope: 'project', edits: [{ path: 'layers.6', value: { name: 'Water' } }] }) as { message: string };
    assert.match(generic.message, /: 6\./);
    assert.equal(calls.length, 0);

    await tools.modify_settings({ scope: 'project', edits: [{ path: 'layers.4.name', value: 'HUD' }, { path: 'layers.1001', value: { name: 'Water' } }] });
    await tools.modify_settings({ scope: 'project', edits: [{ path: 'layers.5', op: 'unset' }] });
    assert.equal(calls.length, 2);
});

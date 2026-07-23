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

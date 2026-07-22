import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { register } from '../src/tools/project.ts';
import type { WSS } from '../src/wss.ts';

type Handler = (args: Record<string, unknown>) => unknown;

test('generic settings tools route scope and path edits', () => {
    const tools: Record<string, Handler> = {};
    const calls: { name: string; args: unknown[] }[] = [];
    const server = {
        registerTool(name: string, _config: unknown, handler: Handler) {
            tools[name] = handler;
        }
    } as unknown as McpServer;
    const wss = {
        call(name: string, ...args: unknown[]) {
            calls.push({ name, args });
        }
    } as unknown as WSS;

    register(server, wss);
    tools.query_settings({ scope: 'projectUser', path: 'editor.pipeline' });
    tools.modify_settings({
        scope: 'projectUser',
        edits: [
            { path: 'editor.pipeline.useContainers', value: true },
            { path: 'editor.pipeline.legacy', op: 'unset' }
        ]
    });

    assert.deepEqual(calls, [
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
});

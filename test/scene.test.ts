import assert from 'node:assert';
import { test } from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { register } from '../src/tools/scene.ts';
import type { WSS } from '../src/wss.ts';

type ToolResult = { content: { text: string }[]; isError?: boolean };
type ToolHandler = (args: Record<string, unknown>) => ToolResult | Promise<ToolResult>;

const makeServer = () => {
    const tools: Record<string, ToolHandler> = {};
    return {
        tools,
        registerTool(name: string, _cfg: unknown, handler: ToolHandler) {
            tools[name] = handler;
        }
    };
};

test('load_scene preserves immediate loading and optionally waits for readiness', async () => {
    const calls: { name: string; args: unknown[] }[] = [];
    const wss = {
        call: async (name: string, ...args: unknown[]) => {
            calls.push({ name, args });
            return { content: [{ text: JSON.stringify({ name, data: { uniqueId: args[0] } }) }] };
        }
    };
    const server = makeServer();
    register(server as unknown as McpServer, wss as unknown as WSS);

    const result = await server.tools.load_scene({ uniqueId: 'scene-2' });
    await server.tools.load_scene({ uniqueId: 'scene-3', wait: true });
    await server.tools.rename_scene({ name: 'Gameplay' });

    assert.deepEqual(calls, [
        { name: 'scene:load', args: ['scene-2'] },
        { name: 'scene:load', args: ['scene-3', { wait: true }] },
        { name: 'scene:name:set', args: ['Gameplay'] }
    ]);
    assert.deepEqual(JSON.parse(result.content[0].text), { name: 'scene:load', data: { uniqueId: 'scene-2' } });
});

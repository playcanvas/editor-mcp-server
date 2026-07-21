import assert from 'node:assert';
import { test } from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebSocket } from 'ws';

import { register } from '../src/tools/vcs.ts';
import { WSS } from '../src/wss.ts';

const PORT = 52997;

type ToolResult = { content: { text: string }[] };
type ToolHandler = (args: Record<string, unknown>) => ToolResult | Promise<ToolResult>;

// minimal MCP server stub: captures registered tool handlers by name
const makeServer = () => {
    const tools: Record<string, ToolHandler> = {};
    return {
        tools,
        registerTool(name: string, _cfg: unknown, handler: ToolHandler) {
            tools[name] = handler;
        }
    };
};

// a fake editor peer: registers as editor and answers vcs:* methods
const connectFakeEditor = (port: number, answers: Record<string, unknown>) => {
    return new Promise<WebSocket>((resolve) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}`);
        ws.on('open', () => {
            ws.send(JSON.stringify({ register: 'editor' }));
            resolve(ws);
        });
        ws.on('message', (buf) => {
            const msg = JSON.parse(buf.toString());
            if (msg.name && msg.name in answers) {
                ws.send(JSON.stringify({ id: msg.id, res: { data: answers[msg.name] } }));
            } else if (msg.name && msg.name !== 'ping') {
                ws.send(JSON.stringify({ id: msg.id, res: { error: `no answer for ${msg.name}` } }));
            }
        });
    });
};

const text = (result: ToolResult) => JSON.parse(result.content[0].text);

test('vcs tools: status passthrough and reload wait', async () => {
    const wss = new WSS(PORT);
    for (let i = 0; i < 40; i++) {
        const up = await new Promise<boolean>((r) => {
            const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
            ws.on('open', () => { ws.close(); r(true); });
            ws.on('error', () => r(false));
        });
        if (up) break;
        await new Promise(r => setTimeout(r, 50));
    }

    const server = makeServer();
    register(server as unknown as McpServer, wss);

    const answers = {
        'vcs:status': { projectId: 1, branch: { id: 'b1', name: 'master', latestCheckpointId: 'c1' }, mergeInProgress: false },
        'vcs:branch:checkout': { status: 'switching', branchId: 'b2' }
    };
    const editor = await connectFakeEditor(PORT, answers);
    await wss.waitForEditor(0, 2000);

    // status passthrough
    const status = text(await server.tools.vcs_status({}));
    assert.equal(status.data.branch.name, 'master');

    // switch_branch: fire, then (simulate reload) reconnect a new editor → generation bump → re-query status
    answers['vcs:status'] = { projectId: 1, branch: { id: 'b2', name: 'feature', latestCheckpointId: 'c2' }, mergeInProgress: false };
    const switchPromise = server.tools.switch_branch({ branchId: 'b2' });
    setTimeout(async () => {
        editor.close();
        await connectFakeEditor(PORT, answers);
    }, 200);
    const switched = text(await switchPromise);
    assert.equal(switched.data.branch.name, 'feature', 'switch_branch returns fresh status after reconnect');

    wss.close();
});

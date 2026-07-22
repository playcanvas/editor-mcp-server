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
            ws.send(JSON.stringify({ register: 'editor', protocolVersion: 1, methods: ['ping', ...Object.keys(answers)] }));
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

test('vcs lifecycle tools: arg passthrough, apply_merge finalize reload, error passthrough', async () => {
    const PORT2 = 52996;
    const wss = new WSS(PORT2);
    for (let i = 0; i < 40; i++) {
        const up = await new Promise<boolean>((r) => {
            const ws = new WebSocket(`ws://127.0.0.1:${PORT2}`);
            ws.on('open', () => { ws.close(); r(true); });
            ws.on('error', () => r(false));
        });
        if (up) break;
        await new Promise(r => setTimeout(r, 50));
    }

    const server = makeServer();
    register(server as unknown as McpServer, wss);

    const received: { name: string; args: unknown[] }[] = [];
    const answers: Record<string, unknown> = {
        'vcs:status': { projectId: 1, branch: { id: 'b1', name: 'main', latestCheckpointId: 'c1' }, mergeInProgress: false },
        'vcs:branch:close': { id: 'b2', closed: true },
        'vcs:merge:create': { id: 'm1', mergeProgressStatus: 'merge_auto_ended', conflicts: [{ id: 'x1' }], numConflicts: 1 },
        'vcs:conflict:resolve': [{ id: 'x1', useSrc: true }],
        'vcs:merge:apply': { status: 'applying', mergeId: 'm1' }
    };
    // a fake editor that records every method + args it receives, then answers
    const connect = () => new Promise<WebSocket>((resolve) => {
        const ws = new WebSocket(`ws://127.0.0.1:${PORT2}`);
        ws.on('open', () => {
            ws.send(JSON.stringify({ register: 'editor', protocolVersion: 1, methods: ['ping', ...Object.keys(answers)] }));
            resolve(ws);
        });
        ws.on('message', (buf) => {
            const msg = JSON.parse(buf.toString());
            if (!msg.name || msg.name === 'ping') return;
            received.push({ name: msg.name, args: msg.args });
            const res = msg.name in answers ? { data: answers[msg.name] } : { error: `no answer for ${msg.name}` };
            ws.send(JSON.stringify({ id: msg.id, res }));
        });
    });
    let editor = await connect();
    await wss.waitForEditor(0, 2000);

    // arg passthrough: object args reach the editor method verbatim
    const closed = text(await server.tools.close_branch({ branchId: 'b2' }));
    assert.equal(closed.data.closed, true);
    assert.equal(received.at(-1)!.name, 'vcs:branch:close');
    assert.deepEqual(received.at(-1)!.args, [{ branchId: 'b2' }]);

    // resolution enum is passed through (source|dest|revert → useSrc/useDst mapping is editor-side)
    const resolved = text(await server.tools.resolve_conflicts({ mergeId: 'm1', conflictIds: ['x1'], resolution: 'source' }));
    assert.equal(resolved.data[0].useSrc, true);
    assert.deepEqual(received.at(-1)!.args, [{ mergeId: 'm1', conflictIds: ['x1'], resolution: 'source' }]);

    const merge = text(await server.tools.start_merge({ sourceBranchId: 'b2' }));
    assert.equal(merge.data.numConflicts, 1);
    assert.equal(received.at(-1)!.name, 'vcs:merge:create');

    // apply_merge finalize:false → plain call, no reload
    const review = text(await server.tools.apply_merge({ mergeId: 'm1', finalize: false }));
    assert.equal(review.meta.status, 'ok');
    assert.deepEqual(received.at(-1)!, { name: 'vcs:merge:apply', args: [{ mergeId: 'm1', finalize: false }] });

    // apply_merge finalize:true → reload flow: fire, simulate reload by reconnecting a new
    // editor (generation bump), then the tool re-queries vcs:status
    const applyPromise = server.tools.apply_merge({ mergeId: 'm1', finalize: true });
    setTimeout(async () => { editor.close(); editor = await connect(); }, 200);
    const applied = text(await applyPromise);
    assert.equal(applied.data.branch.name, 'main', 'apply_merge finalize returns fresh status after reconnect');

    // error passthrough: an unanswered method surfaces as meta.status error
    const err = text(await server.tools.get_merge({ mergeId: 'nope' }));
    assert.equal(err.meta.status, 'error');

    editor.close();
    wss.close();
});

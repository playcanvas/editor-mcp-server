import assert from 'node:assert';
import { test } from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebSocket } from 'ws';

import { register } from '../src/tools/projects.ts';
import { WSS } from '../src/wss.ts';

const PORT = 52994;

type ToolResult = { content: { text: string }[] };
type ToolHandler = (args: Record<string, unknown>) => ToolResult | Promise<ToolResult>;
type Answer = { data?: unknown; error?: string; meta?: Record<string, unknown> };

const makeServer = () => {
    const tools: Record<string, ToolHandler> = {};
    return {
        tools,
        registerTool(name: string, _cfg: unknown, handler: ToolHandler) {
            tools[name] = handler;
        }
    };
};

const text = (result: ToolResult) => JSON.parse(result.content[0].text);

const waitForPort = async (port: number) => {
    for (let i = 0; i < 40; i++) {
        const up = await new Promise<boolean>((r) => {
            const ws = new WebSocket(`ws://127.0.0.1:${port}`);
            ws.on('open', () => {
                ws.close();
                r(true);
            });
            ws.on('error', () => r(false));
        });
        if (up) return;
        await new Promise(r => setTimeout(r, 50));
    }
};

// a fake editor page: answers each method from `answers` (a function gets the call args) and
// records what it received. project is null for the blank /editor page.
const connect = (answers: Record<string, Answer | ((...args: unknown[]) => Answer)>, received: { name: string; args: unknown[] }[], project: number | null) => {
    return new Promise<WebSocket>((resolve) => {
        const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
        ws.on('open', () => {
            ws.send(JSON.stringify({ register: 'editor', protocolVersion: 1, methods: ['ping', ...Object.keys(answers)], project }));
            resolve(ws);
        });
        ws.on('message', (buf) => {
            const msg = JSON.parse(buf.toString());
            if (!msg.name || msg.name === 'ping') return;
            received.push({ name: msg.name, args: msg.args });
            const answer = answers[msg.name];
            const res = typeof answer === 'function' ? answer(...msg.args) : answer ?? { error: `no answer for ${msg.name}` };
            ws.send(JSON.stringify({ id: msg.id, res }));
        });
    });
};

test('project tools', async (t) => {
    const wss = new WSS(PORT);
    await waitForPort(PORT);
    const server = makeServer();
    register(server as unknown as McpServer, wss, 1500);

    const received: { name: string; args: unknown[] }[] = [];
    const projects: Record<number, { id: number; name: string }> = { 1: { id: 1, name: 'Current' }, 2: { id: 2, name: 'Other' } };
    let open = 1;
    const answers: Record<string, Answer | ((...args: unknown[]) => Answer)> = {
        'project:list': () => ({ data: Object.values(projects), meta: { total: 2, count: 2 } }),
        'project:get': (id?: unknown) => {
            const project = projects[(id as number | undefined) ?? open];
            return project ? { data: { ...project, open: project.id === open } } : { error: 'Project not found' };
        },
        'project:create': (fields: unknown) => {
            projects[3] = { id: 3, name: (fields as { name: string }).name };
            return { data: projects[3] };
        },
        'project:update': (id: unknown, fields: unknown) => (id === 403 ? { error: 'Forbidden' } : { data: { ...projects[id as number], ...(fields as object) } }),
        'project:open': (id: unknown) => ({ data: { id, reloading: true } })
    };
    let editor = await connect(answers, received, open);
    await wss.waitForEditor(0, 2000);

    // simulate the tab reloading into the opened project: drop the socket, reconnect a new page
    const reloadInto = (id: number) => setTimeout(async () => {
        open = id;
        editor.close();
        editor = await connect(answers, received, open);
    }, 100);

    await t.test('list and get pass through', async () => {
        const list = text(await server.tools.list_projects({}));
        assert.equal(list.data.length, 2);
        assert.deepEqual(received.at(-1), { name: 'project:list', args: [] });

        await server.tools.list_projects({ ownerId: 9 });
        assert.deepEqual(received.at(-1)!.args, [9]);

        const current = text(await server.tools.get_project({}));
        assert.equal(current.data.name, 'Current');
        assert.equal(current.data.open, true);
    });

    await t.test('update passes fields and errors through', async () => {
        const updated = text(await server.tools.update_project({ projectId: 2, description: 'New' }));
        assert.equal(updated.data.description, 'New');
        assert.deepEqual(received.at(-1), { name: 'project:update', args: [2, { description: 'New' }] });

        const denied = text(await server.tools.update_project({ projectId: 403, name: 'X' }));
        assert.equal(denied.meta.status, 'error');
        assert.equal(denied.meta.message, 'Forbidden');
    });

    await t.test('open_project waits for the reconnect and returns the new project', async () => {
        const pending = server.tools.open_project({ projectId: 2 });
        reloadInto(2);
        const opened = text(await pending);
        assert.equal(opened.data.name, 'Other');
        assert.equal(opened.data.open, true);
    });

    await t.test('open_project on the open project does not reload', async () => {
        const before = received.length;
        const opened = text(await server.tools.open_project({ projectId: 2 }));
        assert.equal(opened.data.id, 2);
        assert.ok(!received.slice(before).some(r => r.name === 'project:open'));
    });

    await t.test('open_project times out when the editor never returns', async () => {
        const opened = text(await server.tools.open_project({ projectId: 1 }));
        assert.equal(opened.meta.status, 'error');
        assert.match(opened.meta.message, /did not reconnect in time.*get_project/);
    });

    await t.test('create_project with open:true opens the new project', async () => {
        const pending = server.tools.create_project({ name: 'Spinning Cube Demo', open: true });
        reloadInto(3);
        const created = text(await pending);
        assert.equal(created.data.name, 'Spinning Cube Demo');
        assert.equal(created.data.open, true);
        assert.deepEqual(received.find(r => r.name === 'project:create')!.args, [{ name: 'Spinning Cube Demo' }]);
    });

    await t.test('create_project does not open a project that is still initializing', async () => {
        answers['project:create'] = { data: { id: 4, name: 'Slow' }, meta: { initializing: true } };
        const created = text(await server.tools.create_project({ name: 'Slow', open: true }));
        assert.equal(created.data.id, 4);
        assert.equal(created.meta.initializing, true);
        assert.equal(created.meta.opened, false);
    });

    await t.test('the blank page reports that no project is open', async () => {
        editor.close();
        editor = await connect({ 'project:list': answers['project:list'] }, received, null);
        await new Promise(r => setTimeout(r, 100));
        const res = await wss.call('entities:list');
        assert.match(text(res as unknown as ToolResult).meta.message, /No project is open/);
    });

    editor.close();
    wss.close();
});

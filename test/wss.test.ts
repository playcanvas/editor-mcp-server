import assert from 'node:assert';
import { after, test } from 'node:test';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { WebSocket } from 'ws';

import { WSS } from '../src/wss.ts';

const PORT = 52999;

process.env.MCP_ALLOWED_ORIGINS = 'https://extra.example.com, https://another.example.com:8443';

const wss = new WSS(PORT);

after(() => wss.close());

// attempt a connection with the given Origin header; true = accepted
const attempt = (origin?: string) => {
    return new Promise<boolean>((resolve) => {
        const ws = new WebSocket(`ws://127.0.0.1:${PORT}`, origin ? { origin } : {});
        ws.on('open', () => {
            ws.close();
            resolve(true);
        });
        ws.on('error', () => resolve(false));
    });
};

const ready = async () => {
    for (let i = 0; i < 40; i++) {
        if (await attempt()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`server did not start on port ${PORT}`);
};

test('origin validation on websocket upgrade', async () => {
    await ready();

    // allowed: non-browser local clients (no Origin, e.g. the yield handshake)
    assert.equal(await attempt(), true, 'no Origin should be allowed');

    // allowed: the editor and launch pages
    assert.equal(await attempt('https://playcanvas.com'), true, 'playcanvas.com should be allowed');
    assert.equal(await attempt('https://launch.playcanvas.com'), true, 'launch.playcanvas.com should be allowed');

    // allowed: local editor dev builds
    assert.equal(await attempt('http://localhost:3000'), true, 'localhost dev origin should be allowed');
    assert.equal(await attempt('http://127.0.0.1:8080'), true, '127.0.0.1 dev origin should be allowed');

    // allowed: extra origins from MCP_ALLOWED_ORIGINS (exact match)
    assert.equal(await attempt('https://extra.example.com'), true, 'MCP_ALLOWED_ORIGINS origin should be allowed');
    assert.equal(await attempt('https://another.example.com:8443'), true, 'MCP_ALLOWED_ORIGINS origin with port should be allowed');
    assert.equal(await attempt('https://sub.extra.example.com'), false, 'extra origins are exact match, not wildcards');

    // rejected: any other webpage (browsers do not apply CORS to websockets)
    assert.equal(await attempt('https://evil.com'), false, 'unknown origin must be rejected');
    assert.equal(await attempt('https://playcanvas.com.evil.com'), false, 'suffix-spoofed origin must be rejected');
    assert.equal(await attempt('https://evilplaycanvas.com'), false, 'lookalike origin must be rejected');
    assert.equal(await attempt('http://192.168.1.10:3000'), false, 'LAN origin must be rejected');
});

const PORT2 = 52998;

const connectEditor = (port: number) => new Promise<WebSocket>((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.on('open', () => {
        ws.send(JSON.stringify({ register: 'editor', protocolVersion: 1, methods: ['ping'] }));
        resolve(ws);
    });
    ws.on('message', (data) => {
        const { id } = JSON.parse(data.toString());
        ws.send(JSON.stringify({ id, res: { data: 'pong' } }));
    });
});

const envelope = (result: CallToolResult) => {
    const item = result.content.find(item => item.type === 'text');
    if (!item || item.type !== 'text') {
        throw new Error('Missing text response');
    }
    return JSON.parse(item.text);
};

test('waitForEditor tracks editor connection generation', async () => {
    const wss2 = new WSS(PORT2);
    // wait for the server to listen
    for (let i = 0; i < 40; i++) {
        const up = await new Promise<boolean>((r) => {
            const ws = new WebSocket(`ws://127.0.0.1:${PORT2}`);
            ws.on('open', () => { ws.close(); r(true); });
            ws.on('error', () => r(false));
        });
        if (up) break;
        await new Promise(r => setTimeout(r, 50));
    }

    const gen0 = wss2.editorGeneration;
    const ed = await connectEditor(PORT2);
    const back = await wss2.waitForEditor(gen0, 2000);
    assert.equal(back, true, 'a freshly connected editor bumps the generation');

    const pong = envelope(await wss2.call('ping'));
    assert.equal(pong.meta.status, 'ok');
    assert.equal(pong.data, 'pong');

    const missing = envelope(await wss2.call('missing'));
    assert.equal(missing.meta.status, 'error');
    assert.match(missing.meta.message, /does not support 'missing'/);

    const gen1 = wss2.editorGeneration;
    const none = await wss2.waitForEditor(gen1, 300);
    assert.equal(none, false, 'no new editor within the timeout resolves false');

    const legacy = await new Promise<WebSocket>((resolve) => {
        const ws = new WebSocket(`ws://127.0.0.1:${PORT2}`);
        ws.on('open', () => {
            ws.send(JSON.stringify({ register: 'editor' }));
            resolve(ws);
        });
    });
    await wss2.waitForEditor(gen1, 2000);
    const incompatible = envelope(await wss2.call('ping'));
    assert.equal(incompatible.meta.status, 'error');
    assert.match(incompatible.meta.message, /does not advertise protocol 1 capabilities/);

    ed.close();
    legacy.close();
    wss2.close();
});

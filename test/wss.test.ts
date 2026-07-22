import assert from 'node:assert';
import { after, test } from 'node:test';

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
        ws.send(JSON.stringify({ register: 'editor' }));
        resolve(ws);
    });
});

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

    const gen1 = wss2.editorGeneration;
    const none = await wss2.waitForEditor(gen1, 300);
    assert.equal(none, false, 'no new editor within the timeout resolves false');

    ed.close();
    wss2.close();
});

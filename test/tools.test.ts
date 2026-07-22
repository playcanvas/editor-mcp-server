import assert from 'node:assert';
import { test } from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { register as registerBuild } from '../src/tools/build.ts';
import { register as registerProcessing, SpritePropsSchema } from '../src/tools/processing.ts';
import { register as registerViewport } from '../src/tools/viewport.ts';
import type { WSS } from '../src/wss.ts';

type Handler = (args: Record<string, unknown>) => unknown;

const setup = () => {
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
            return { name, args };
        },
        raw(name: string, ...args: unknown[]) {
            calls.push({ name, args });
            return Promise.resolve({ error: 'start failed' });
        },
        fail(name: string, message: string) {
            return { name, message };
        }
    } as unknown as WSS;
    registerProcessing(server, wss);
    registerViewport(server, wss);
    registerBuild(server, wss);
    return { tools, calls };
};

test('processing, viewport, and build tools route stable driver methods', async () => {
    const { tools, calls } = setup();

    tools.modify_bundle_asset({ id: 7, add: [8], remove: [9] });
    assert.deepEqual(calls.at(-1), {
        name: 'assets:bundle:modify',
        args: [7, { add: [8], remove: [9] }]
    });

    tools.cancel_model_unwrap({ id: 7 });
    assert.deepEqual(calls.at(-1), {
        name: 'assets:model:unwrap:cancel',
        args: [7]
    });

    tools.set_viewport_state({
        cameraId: 'perspective',
        projection: 'perspective'
    });
    assert.deepEqual(calls.at(-1), {
        name: 'viewport:state:set',
        args: [{ cameraId: 'perspective', projection: 'perspective' }]
    });

    tools.list_builds({ limit: 10, cursor: '20', status: 'complete' });
    assert.deepEqual(calls.at(-1), {
        name: 'builds:list',
        args: [{ limit: 10, cursor: '20', filters: { status: 'complete' } }]
    });

    const failed = await tools.download_build({
        name: 'Download',
        sceneIds: [1],
        format: 'static',
        outputPath: '/tmp/download.zip'
    });
    assert.deepEqual(failed, {
        name: 'builds:download',
        message: 'start failed'
    });
});

test('sprite modification accepts tiled render mode', () => {
    assert.equal(SpritePropsSchema.safeParse({ renderMode: 2 }).success, true);
    assert.equal(SpritePropsSchema.safeParse({ renderMode: 3 }).success, false);
});

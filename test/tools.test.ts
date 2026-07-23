import assert from 'node:assert';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { register as registerBuild } from '../src/tools/build.ts';
import { register as registerEditor } from '../src/tools/editor.ts';
import { register as registerProcessing, SpritePropsSchema } from '../src/tools/processing.ts';
import { register as registerRuntime } from '../src/tools/runtime.ts';
import { register as registerStore } from '../src/tools/store.ts';
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
    registerEditor(server, wss);
    registerStore(server, wss);
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
    tools.process_font_asset({ id: 7, characters: 'abc', invert: true });
    assert.deepEqual(calls.at(-1), {
        name: 'assets:font:process',
        args: [7, { characters: 'abc', invert: true }]
    });
    tools.process_texture_variants({ id: 7, formats: ['basis'], force: true });
    assert.deepEqual(calls.at(-1), {
        name: 'assets:texture:variants',
        args: [7, { formats: ['basis'], force: true }]
    });
    tools.prefilter_cubemap({ id: 7, legacy: true });
    assert.deepEqual(calls.at(-1), {
        name: 'assets:cubemap:prefilter',
        args: [7, true]
    });
    tools.generate_texture_metadata({ id: 7 });
    assert.deepEqual(calls.at(-1), {
        name: 'assets:texture:metadata',
        args: [7]
    });
    tools.clear_cubemap_prefilter({ id: 7 });
    assert.deepEqual(calls.at(-1), {
        name: 'assets:cubemap:prefilter:clear',
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
    tools.set_primary_build({ buildId: 7 });
    assert.deepEqual(calls.at(-1), {
        name: 'builds:primary:set',
        args: [7]
    });

    tools.read_editor_logs({ types: ['error'], limit: 10 });
    assert.deepEqual(calls.at(-1), {
        name: 'editor:logs',
        args: [{ types: ['error'], limit: 10 }]
    });

    tools.sketchfab_import({ uid: 'model', name: 'Model', license: 'cc0', folder: 7 });
    assert.deepEqual(calls.at(-1), {
        name: 'store:sketchfab:clone',
        args: ['model', 'Model', 'cc0', 7]
    });
    tools.my_assets_import({ id: 'owned', name: 'Owned', folder: 7 });
    assert.deepEqual(calls.at(-1), {
        name: 'store:myassets:clone',
        args: ['owned', 'Owned', 7]
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

test('launch_start forwards runtime launch options', async () => {
    const tools: Record<string, Handler> = {};
    const calls: { name: string; args: unknown[] }[] = [];
    registerRuntime(
        {
            registerTool(name: string, _config: unknown, handler: Handler) {
                tools[name] = handler;
            }
        } as unknown as McpServer,
        {
            raw(name: string, ...args: unknown[]) {
                calls.push({ name, args });
                return Promise.resolve({ data: { url: 'https://example.com' } });
            },
            waitForRuntime() {
                return Promise.resolve(true);
            },
            ok(name: string, data: unknown) {
                return { name, data };
            }
        } as unknown as WSS
    );

    assert.deepEqual(
        await tools.launch_start({
            device: 'webgpu',
            engineVersion: 'latest',
            profiler: true,
            debug: false,
            concatenate: true,
            bundles: true,
            miniStats: true,
            waitMs: 500
        }),
        {
            name: 'launch:start',
            data: {
                url: 'https://example.com',
                ready: true
            }
        }
    );
    assert.deepEqual(calls, [{
        name: 'launch:start',
        args: [{
            device: 'webgpu',
            engineVersion: 'latest',
            profiler: true,
            debug: false,
            concatenate: true,
            bundles: true,
            miniStats: true
        }]
    }]);
});

test('sprite modification accepts tiled render mode', () => {
    assert.equal(SpritePropsSchema.safeParse({ renderMode: 2 }).success, true);
    assert.equal(SpritePropsSchema.safeParse({ renderMode: 3 }).success, false);
});

test('download_build streams artifacts without clobbering files', async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'editor-mcp-'));
    const path = join(dir, 'build.zip');
    const tools: Record<string, Handler> = {};
    let content = 'first';
    t.after(() => rm(dir, { recursive: true, force: true }));
    t.mock.method(globalThis, 'fetch', async () => new Response(content));
    registerBuild(
        {
            registerTool(name: string, _config: unknown, handler: Handler) {
                tools[name] = handler;
            }
        } as unknown as McpServer,
        {
            raw(name: string) {
                return Promise.resolve(
                    name === 'builds:download'
                        ? { data: { id: 7 } }
                        : {
                              data: {
                                  status: 'complete',
                                  artifacts: [{ type: 'download', url: 'https://example.com/build.zip' }]
                              }
                          }
                );
            },
            fail(name: string, message: string) {
                return { name, message };
            },
            ok(name: string, data: unknown) {
                return { name, data };
            }
        } as unknown as WSS
    );
    const options = {
        name: 'Download',
        sceneIds: [1],
        format: 'static',
        outputPath: path
    };

    assert.deepEqual(await tools.download_build(options), {
        name: 'builds:download',
        data: { buildId: 7, path, bytes: 5 }
    });
    content = 'second';
    assert.match((await tools.download_build(options) as { message: string }).message, /EEXIST/);
    assert.equal(await readFile(path, 'utf8'), 'first');
    assert.deepEqual(await readdir(dir), ['build.zip']);

    await tools.download_build({ ...options, overwrite: true });
    assert.equal(await readFile(path, 'utf8'), 'second');
    assert.deepEqual(await readdir(dir), ['build.zip']);
});

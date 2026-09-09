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

    const license = { id: 'cc0', author: 'Author', authorUrl: 'https://example.com' };
    tools.sketchfab_import({ uid: 'model', name: 'Model', license, folder: 7 });
    assert.deepEqual(calls.at(-1), {
        name: 'store:sketchfab:clone',
        args: ['model', 'Model', license, 7]
    });
    tools.my_assets_import({ id: 9, name: 'Owned', folder: 7 });
    assert.deepEqual(calls.at(-1), {
        name: 'store:myassets:clone',
        args: [9, 'Owned', 7]
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
                return Promise.resolve(
                    name === 'runtime:info'
                        ? { data: { engineVersion: '2.10.1', engineRevision: null, deviceType: 'webgpu', sessionId: 's1' } }
                        : { data: { url: 'https://example.com' } }
                );
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
                ready: true,
                engineVersion: '2.10.1',
                engineRevision: null,
                deviceType: 'webgpu',
                sessionId: 's1'
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
    }, {
        name: 'runtime:info',
        args: []
    }]);
});

test('launch_start merges runtime:info metadata', async () => {
    const tools: Record<string, Handler> = {};
    const info = () => Promise.resolve({
        data: {
            engineVersion: '2.10.1',
            engineRevision: 'abc1234',
            deviceType: 'webgpu',
            sessionId: 'session-1',
            sceneId: 5,
            projectId: 1,
            url: 'https://launch.playcanvas.com/1?debug=true'
        }
    });
    registerRuntime(
        {
            registerTool(name: string, _config: unknown, handler: Handler) {
                tools[name] = handler;
            }
        } as unknown as McpServer,
        {
            raw(name: string) {
                return name === 'runtime:info'
                    ? info()
                    : Promise.resolve({ data: { url: 'https://example.com', sceneId: 5, adopted: false, engineVersion: null, device: 'webgpu' } });
            },
            waitForRuntime() {
                return Promise.resolve(true);
            },
            ok(name: string, data: unknown) {
                return { name, data };
            }
        } as unknown as WSS
    );

    // runtime:info fields win over the editor's launch:start report, and its extra
    // fields (sceneId/projectId/url) are not merged
    assert.deepEqual(await tools.launch_start({ device: 'webgpu' }), {
        name: 'launch:start',
        data: {
            url: 'https://example.com',
            sceneId: 5,
            adopted: false,
            device: 'webgpu',
            ready: true,
            engineVersion: '2.10.1',
            engineRevision: 'abc1234',
            deviceType: 'webgpu',
            sessionId: 'session-1'
        }
    });
});

test('list_engine_versions reads the editor engine selection', () => {
    const tools: Record<string, Handler> = {};
    const calls: { name: string; args: unknown[] }[] = [];
    registerRuntime(
        {
            registerTool(name: string, _config: unknown, handler: Handler) {
                tools[name] = handler;
            }
        } as unknown as McpServer,
        {
            call(name: string, ...args: unknown[]) {
                calls.push({ name, args });
                return { name, args };
            }
        } as unknown as WSS
    );

    assert.equal(typeof tools.list_engine_versions, 'function');
    tools.list_engine_versions({});
    assert.deepEqual(calls.at(-1), { name: 'launch:versions', args: [] });
});

test('sprite modification accepts tiled render mode', () => {
    assert.equal(SpritePropsSchema.safeParse({ renderMode: 2 }).success, true);
    assert.equal(SpritePropsSchema.safeParse({ renderMode: 3 }).success, false);
});

test('download_build streams artifacts without clobbering files', async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'editor-mcp-'));
    const path = join(dir, 'build.zip');
    const tools: Record<string, Handler> = {};
    const calls: { name: string; args: unknown[] }[] = [];
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
            raw(name: string, ...args: unknown[]) {
                calls.push({ name, args });
                return Promise.resolve(
                    name === 'builds:download'
                        ? { data: { id: 9 } }
                        : name === 'builds:list'
                          ? { data: [{ id: 7, job_id: 9 }] }
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
    assert.deepEqual(calls.slice(0, 3), [
        { name: 'builds:download', args: [{ name: 'Download', sceneIds: [1], format: 'static' }] },
        { name: 'builds:list', args: [{ limit: 500, filters: { type: 'download' } }] },
        { name: 'builds:get', args: [7] }
    ]);
    content = 'second';
    assert.match((await tools.download_build(options) as { message: string }).message, /EEXIST/);
    assert.equal(await readFile(path, 'utf8'), 'first');
    assert.deepEqual(await readdir(dir), ['build.zip']);

    await tools.download_build({ ...options, overwrite: true });
    assert.equal(await readFile(path, 'utf8'), 'second');
    assert.deepEqual(await readdir(dir), ['build.zip']);
});

test('create_build resolves the durable build job id from the publish list', async () => {
    const tools: Record<string, Handler> = {};
    const calls: { name: string; args: unknown[] }[] = [];
    registerBuild(
        {
            registerTool(name: string, _config: unknown, handler: Handler) {
                tools[name] = handler;
            }
        } as unknown as McpServer,
        {
            raw(name: string, ...args: unknown[]) {
                calls.push({ name, args });
                return Promise.resolve(
                    name === 'builds:create'
                        ? { data: { id: 42, name: 'Publish', url: 'https://playcanv.as/b/hash', task: { status: 'running' } } }
                        : { data: [{ id: 8, app_id: 41, status: 'complete' }, { id: 9, app_id: 42, status: 'running' }] }
                );
            },
            fail(name: string, message: string) {
                return { name, message };
            },
            ok(name: string, data: unknown, meta: unknown) {
                return { name, data, meta };
            }
        } as unknown as WSS
    );

    assert.deepEqual(await tools.create_build({ name: 'Publish', sceneIds: [1] }), {
        name: 'builds:create',
        data: {
            buildId: 9,
            appId: 42,
            status: 'running',
            url: 'https://playcanv.as/b/hash',
            name: 'Publish'
        },
        meta: undefined
    });
    assert.deepEqual(calls, [
        { name: 'builds:create', args: [{ name: 'Publish', sceneIds: [1] }] },
        { name: 'builds:list', args: [{ limit: 500, filters: { type: 'publish' } }] }
    ]);
});

test('create_build returns the app id with a hint when no build job is listed', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const tools: Record<string, Handler> = {};
    let lists = 0;
    registerBuild(
        {
            registerTool(name: string, _config: unknown, handler: Handler) {
                tools[name] = handler;
            }
        } as unknown as McpServer,
        {
            raw(name: string) {
                if (name === 'builds:create') {
                    return Promise.resolve({ data: { id: 42, name: 'Publish', url: 'https://playcanv.as/b/hash', task: { status: 'running' } } });
                }
                lists++;
                return Promise.resolve({ data: [{ id: 8, app_id: 41, status: 'complete' }] });
            },
            fail(name: string, message: string) {
                return { name, message };
            },
            ok(name: string, data: unknown, meta: unknown) {
                return { name, data, meta };
            }
        } as unknown as WSS
    );

    const pending = tools.create_build({ name: 'Publish', sceneIds: [1] }) as Promise<{
        data: Record<string, unknown>;
        meta: { hint?: string };
    }>;

    // drive the retry sleeps with mocked timers so the poll budget elapses instantly
    let settled = false;
    pending.then(() => {
        settled = true;
    });
    for (let i = 0; i < 20 && !settled; i++) {
        t.mock.timers.tick(1000);
        await new Promise((resolve) => setImmediate(resolve));
    }
    const result = await pending;

    assert.deepEqual(result.data, {
        buildId: null,
        appId: 42,
        status: 'running',
        url: 'https://playcanv.as/b/hash',
        name: 'Publish'
    });
    assert.match(result.meta.hint!, /list_builds/);
    assert.ok(lists > 1, `polled the publish list more than once (${lists})`);
});

import assert from 'node:assert';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestContext } from 'node:test';
import { test } from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { register } from '../src/tools/build.ts';
import { MAX_CHUNK_BYTES, MAX_FILE_BYTES, MAX_TRANSFER_BYTES } from '../src/tools/transfer.ts';
import type { WSS } from '../src/wss.ts';

type Handler = (args: Record<string, unknown>) => unknown;
type Call = { name: string; args: unknown[] };

const RELATIVE = '/api/projects/1/builds/5/download/My%20Game.zip';
const OPTIONS = { name: 'My Game', sceneIds: [1], format: 'static' };

const server = (tools: Record<string, Handler>) => ({
    registerTool(name: string, _config: unknown, handler: Handler) {
        tools[name] = handler;
    }
}) as unknown as McpServer;

const setup = async (t: TestContext, url: string, start: (name: string, args: unknown[]) => unknown) => {
    const dir = await mkdtemp(join(tmpdir(), 'editor-mcp-build-'));
    const tools: Record<string, Handler> = {};
    const calls: Call[] = [];
    t.after(() => rm(dir, { recursive: true, force: true }));

    register(server(tools), {
        raw(name: string, ...args: unknown[]) {
            calls.push({ name, args });
            if (name === 'builds:download') {
                return Promise.resolve({ data: { build_job_id: 5 } });
            }
            if (name === 'builds:get') {
                return Promise.resolve({ data: { id: 5, status: 'complete', artifacts: [{ type: 'download', url }] } });
            }
            return Promise.resolve(start(name, args) ?? { data: {} });
        },
        fail(name: string, message: string) {
            return { name, message };
        },
        ok(name: string, result: unknown) {
            return { name, result };
        }
    } as unknown as WSS);

    return { dir, path: join(dir, 'game.zip'), tools, calls };
};

test('download_build reads a relative artifact url through the editor in chunks', async (t) => {
    const data = Buffer.alloc(MAX_CHUNK_BYTES + 5, 7);
    data.write('zip', 0);
    const { dir, path, tools, calls } = await setup(t, RELATIVE, (name, args) => {
        if (name === 'builds:artifact:start') {
            return { data: { transferId: 'build', size: data.length, chunkSize: MAX_CHUNK_BYTES, filename: 'My Game.zip', mime: 'application/zip' } };
        }
        if (name === 'files:download:read') {
            const [, offset, length] = args as [string, number, number];
            const bytes = data.subarray(offset, offset + length);
            return { data: { offset: offset + bytes.length, base64: bytes.toString('base64') } };
        }
    });

    assert.deepEqual(await tools.download_build({ ...OPTIONS, outputPath: path }), {
        name: 'builds:download',
        result: { buildId: 5, path, bytes: data.length }
    });
    assert.deepEqual(await readFile(path), data);
    assert.deepEqual(await readdir(dir), ['game.zip']);
    assert.deepEqual(calls.find((call) => call.name === 'builds:artifact:start')?.args, [5, MAX_FILE_BYTES]);
    assert.equal(calls.filter((call) => call.name === 'files:download:read').length, 2);
    assert.ok(calls.some((call) => call.name === 'files:transfer:finish'));
});

test('download_build writes inline artifact replies', async (t) => {
    const data = Buffer.from('inline zip');
    const { path, tools } = await setup(t, RELATIVE, (name) => {
        if (name === 'builds:artifact:start') {
            return { data: { size: data.length, filename: 'My Game.zip', mime: 'application/zip', base64: data.toString('base64') } };
        }
    });

    assert.deepEqual(await tools.download_build({ ...OPTIONS, outputPath: path }), {
        name: 'builds:download',
        result: { buildId: 5, path, bytes: data.length }
    });
    assert.deepEqual(await readFile(path), data);
});

test('download_build fetches http artifact urls directly', async (t) => {
    const data = Buffer.from('fetched zip');
    const original = globalThis.fetch;
    const urls: string[] = [];
    globalThis.fetch = (input: string | URL | Request) => {
        urls.push(String(input));
        return Promise.resolve(new Response(data));
    };
    t.after(() => {
        globalThis.fetch = original;
    });
    const { path, tools, calls } = await setup(t, 'https://example.com/game.zip', () => undefined);

    assert.deepEqual(await tools.download_build({ ...OPTIONS, outputPath: path }), {
        name: 'builds:download',
        result: { buildId: 5, path, bytes: data.length }
    });
    assert.deepEqual(urls, ['https://example.com/game.zip']);
    assert.deepEqual(await readFile(path), data);
    assert.ok(!calls.some((call) => call.name === 'builds:artifact:start'));
});

test('download_build rejects oversized artifact transfers and leaves no file', async (t) => {
    const { dir, path, tools, calls } = await setup(t, RELATIVE, (name) => {
        if (name === 'builds:artifact:start') {
            return { data: { transferId: 'build', size: MAX_TRANSFER_BYTES + 1, chunkSize: MAX_CHUNK_BYTES } };
        }
    });

    assert.deepEqual(await tools.download_build({ ...OPTIONS, outputPath: path }), {
        name: 'builds:download',
        message: 'Editor returned an invalid or oversized download transfer.'
    });
    assert.deepEqual(await readdir(dir), []);
    assert.ok(calls.some((call) => call.name === 'files:transfer:cancel' && call.args[0] === 'build'));
    assert.ok(!calls.some((call) => call.name === 'files:download:read'));
});

test('download_build keeps an existing file unless overwrite is set', async (t) => {
    const { dir, path, tools } = await setup(t, RELATIVE, (name) => {
        if (name === 'builds:artifact:start') {
            return { data: { size: 3, base64: Buffer.from('new').toString('base64') } };
        }
    });
    await writeFile(path, 'old');

    assert.match(
        (await tools.download_build({ ...OPTIONS, outputPath: path, overwrite: false }) as { message: string }).message,
        /already exists/
    );
    assert.equal(await readFile(path, 'utf8'), 'old');
    assert.deepEqual(await readdir(dir), ['game.zip']);
});

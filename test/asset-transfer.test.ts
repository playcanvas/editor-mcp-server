import assert from 'node:assert';
import { mkdtemp, readFile, readdir, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { register } from '../src/tools/asset.ts';
import type { WSS } from '../src/wss.ts';

type Handler = (args: Record<string, unknown>) => unknown;

const server = (tools: Record<string, Handler>) => ({
    registerTool(name: string, _config: unknown, handler: Handler) {
        tools[name] = handler;
    }
}) as unknown as McpServer;

test('upload_assets streams files above the inline limit', async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'editor-mcp-transfer-'));
    const path = join(dir, 'large.bin');
    const size = 20 * 1024 * 1024 + 3;
    const tools: Record<string, Handler> = {};
    let offset = 0;
    let chunks = 0;
    t.after(() => rm(dir, { recursive: true, force: true }));
    await writeFile(path, '');
    await truncate(path, size);

    register(server(tools), {
        raw(name: string, ...args: unknown[]) {
            if (name === 'files:upload:start') {
                assert.equal(args[1], size);
                return Promise.resolve({ data: { transferId: 'upload' } });
            }
            if (name === 'files:upload:append') {
                assert.equal(args[0], 'upload');
                assert.equal(args[1], offset);
                offset += Buffer.from(args[2] as string, 'base64').length;
                chunks++;
                return Promise.resolve({ data: { offset } });
            }
            if (name === 'files:upload:finish') {
                assert.equal(offset, size);
                return Promise.resolve({ data: { id: 7, name: 'large.bin', type: 'binary' } });
            }
            return Promise.resolve({ data: {} });
        },
        ok(name: string, data: unknown, meta: unknown) {
            return { name, data, meta };
        }
    } as unknown as WSS);

    assert.deepEqual(await tools.upload_assets({ assets: [{ path, type: 'binary' }] }), {
        name: 'assets:upload',
        data: {
            succeeded: [{
                index: 0,
                asset: { id: 7, name: 'large.bin', type: 'binary' }
            }],
            failed: []
        },
        meta: { partial: false }
    });
    assert.equal(chunks, 21);
});

test('download_asset writes chunks through an atomic temporary file', async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'editor-mcp-transfer-'));
    const path = join(dir, 'asset.bin');
    const data = Buffer.from('chunked download');
    const tools: Record<string, Handler> = {};
    t.after(() => rm(dir, { recursive: true, force: true }));

    register(server(tools), {
        raw(name: string, ...args: unknown[]) {
            if (name === 'files:download:start') {
                return Promise.resolve({
                    data: {
                        transferId: 'download',
                        size: data.length,
                        filename: 'asset.bin',
                        mime: 'application/octet-stream'
                    }
                });
            }
            if (name === 'files:download:read') {
                const offset = args[1] as number;
                const bytes = data.subarray(offset);
                return Promise.resolve({
                    data: {
                        offset: offset + bytes.length,
                        base64: bytes.toString('base64'),
                        done: true
                    }
                });
            }
            return Promise.resolve({ data: {} });
        },
        fail(name: string, message: string) {
            return { name, message };
        },
        ok(name: string, result: unknown) {
            return { name, result };
        }
    } as unknown as WSS);

    assert.deepEqual(await tools.download_asset({ assetId: 7, path }), {
        name: 'files:download:start',
        result: {
            path,
            filename: 'asset.bin',
            mime: 'application/octet-stream',
            bytes: data.length
        }
    });
    assert.deepEqual(await readFile(path), data);
    assert.deepEqual(await readdir(dir), ['asset.bin']);

    assert.match(
        (await tools.download_asset({ assetId: 7, path }) as { message: string }).message,
        /already exists/
    );
    assert.deepEqual(await readdir(dir), ['asset.bin']);
});

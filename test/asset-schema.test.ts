import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { register as registerAssets } from '../src/tools/asset.ts';
import { register as registerScripts } from '../src/tools/assets/script.ts';
import { register as registerEntities } from '../src/tools/entity.ts';
import {
    AnimStateGraphCreateSchema,
    BundleCreateSchema,
    CubemapCreateSchema,
    I18nCreateSchema,
    JsonCreateSchema,
    SpriteCreateSchema
} from '../src/tools/schema/asset.ts';
import type { WSS } from '../src/wss.ts';

type Handler = (args: Record<string, unknown>) => unknown;

test('native asset create schemas accept their editor API inputs', () => {
    const cases = [
        [AnimStateGraphCreateSchema, { type: 'animstategraph', options: { name: 'Movement' } }],
        [BundleCreateSchema, { type: 'bundle', options: { assets: [1, 2] } }],
        [CubemapCreateSchema, { type: 'cubemap', options: { textures: [1, null, 2] } }],
        [I18nCreateSchema, { type: 'i18n', options: { localizationData: { header: { version: 1 } } } }],
        [JsonCreateSchema, { type: 'json', options: { json: { value: true } } }],
        [SpriteCreateSchema, { type: 'sprite', options: { textureAtlas: 3, frameKeys: ['0'] } }]
    ] as const;

    cases.forEach(([schema, value]) => assert.deepEqual(schema.parse(value), value));
    assert.throws(() => CubemapCreateSchema.parse({
        type: 'cubemap',
        options: { textures: [1, 2, 3, 4, 5, 6, 7] }
    }));
});

test('asset, template, text, and script tools route stable driver methods', () => {
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
        }
    } as unknown as WSS;

    registerAssets(server, wss);
    registerScripts(server, wss);
    registerEntities(server, wss);

    tools.instantiate_template_assets({ ids: [7], parentId: 'root', index: 2 });
    assert.deepEqual(calls.at(-1), {
        name: 'templates:instantiate',
        args: [{ assetIds: [7], parentId: 'root', index: 2 }]
    });

    tools.modify_assets({ edits: [{ id: 7, path: 'name', value: 'Player' }] });
    assert.deepEqual(calls.at(-1), {
        name: 'assets:modify',
        args: [[{ id: 7, path: 'name', value: 'Player' }]]
    });

    tools.set_asset_text({ assetId: 7, text: 'hello' });
    assert.deepEqual(calls.at(-1), { name: 'assets:text:set', args: [7, 'hello'] });

    tools.attach_script({ id: 'player', scriptName: 'controller', attributes: { speed: 2 }, index: 0 });
    assert.deepEqual(calls.at(-1), {
        name: 'entities:scripts:add',
        args: [{ entityIds: ['player'], script: 'controller', attributes: { speed: 2 }, index: 0 }]
    });

    tools.get_template_overrides({ entityId: 'player' });
    assert.deepEqual(calls.at(-1), {
        name: 'templates:overrides:get',
        args: [{ entityId: 'player' }]
    });
});

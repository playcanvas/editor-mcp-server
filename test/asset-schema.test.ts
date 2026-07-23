import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { register as registerAssets, AssetEditSchema, AssetPipelineSchema } from '../src/tools/asset.ts';
import { register as registerScripts } from '../src/tools/assets/script.ts';
import { register as registerEntities, EntityEditSchema } from '../src/tools/entity.ts';
import {
    AnimStateGraphCreateSchema,
    BundleCreateSchema,
    CubemapCreateSchema,
    I18nCreateSchema,
    JsonCreateSchema,
    MaterialSchema,
    ScriptCreateSchema,
    SpriteCreateSchema
} from '../src/tools/schema/asset.ts';
import { AssetIdSchema, AssetRefSchema } from '../src/tools/schema/common.ts';
import { ComponentNameSchema, ComponentsSchema } from '../src/tools/schema/entity.ts';
import { SceneSettingsSchema } from '../src/tools/schema/scene-settings.ts';
import type { WSS } from '../src/wss.ts';

type Handler = (args: Record<string, unknown>) => unknown;
type Config = { annotations?: { destructiveHint?: boolean } };

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
    assert.equal(SpriteCreateSchema.safeParse({ type: 'sprite', options: { renderMode: 2 } }).success, true);
    assert.equal(SpriteCreateSchema.safeParse({ type: 'sprite', options: { renderMode: 3 } }).success, false);
    assert.equal(ScriptCreateSchema.safeParse({ type: 'script' }).success, false);
    assert.equal(ScriptCreateSchema.safeParse({ type: 'script', options: { filename: 'app.js', data: { custom: 1 } } }).success, true);
    assert.deepEqual(MaterialSchema.parse({ diffuse: [1, 1, 1], futureProperty: true }).futureProperty, true);
    assert.equal(AssetEditSchema.safeParse({ id: 1, path: 'data.opacity', op: 'unset', value: 1 }).success, false);
    assert.equal(AssetIdSchema.safeParse(null).success, false);
    assert.equal(AssetIdSchema.safeParse(0).success, false);
    assert.equal(AssetRefSchema.safeParse(null).success, true);
});

test('configuration schemas preserve arbitrary component and scene fields', () => {
    const components = {
        camera: { fov: 60, customProjection: true },
        custom: { enabled: true, value: 1 }
    };
    const settings = {
        render: { skyDepthWrite: true, futureSetting: 1 },
        custom: { enabled: true }
    };

    assert.deepEqual(ComponentsSchema.parse(components), components);
    assert.equal(ComponentNameSchema.parse('custom'), 'custom');
    assert.deepEqual(SceneSettingsSchema.parse(settings), settings);
    const id = '123e4567-e89b-12d3-a456-426614174000';
    assert.equal(EntityEditSchema.safeParse({ id, path: 'name' }).success, false);
    assert.equal(EntityEditSchema.safeParse({ id, path: 'name', value: 'Player' }).success, true);
    assert.equal(EntityEditSchema.safeParse({ id, path: 'name', value: 'Player', extra: true }).success, false);
    assert.equal(EntityEditSchema.safeParse({ id, path: 'components.camera.fov', op: 'unset' }).success, true);
    assert.equal(EntityEditSchema.safeParse({ id, path: 'components.camera.fov', op: 'unset', value: 60 }).success, false);
});

test('asset pipeline settings match the backend fields', () => {
    const settings = {
        pow2: true,
        searchRelatedAssets: true,
        overwriteModel: true,
        overwriteAnimation: true,
        overwriteMaterial: true,
        overwriteTexture: true,
        preserveMapping: true,
        useGlb: true,
        animSampleRate: 10,
        animCurveTolerance: 0,
        animEnableCubic: false,
        animUseFbxFilename: false,
        useContainers: true,
        meshCompression: 'draco',
        dracoDecodeSpeed: 0,
        dracoMeshSize: 0.5,
        unwrapUv: false,
        unwrapUvTexelsPerMeter: 16,
        importMorphNormals: true,
        useUniqueIndices: false
    } as const;

    assert.deepEqual(AssetPipelineSchema.parse(settings), settings);
    assert.equal(AssetPipelineSchema.safeParse({ meshCompression: true }).success, false);
    assert.equal(AssetPipelineSchema.safeParse({ futureSetting: true }).success, false);
});

test('asset, template, text, and script tools route stable driver methods', () => {
    const tools: Record<string, Handler> = {};
    const configs: Record<string, Config> = {};
    const calls: { name: string; args: unknown[] }[] = [];
    const server = {
        registerTool(name: string, config: unknown, handler: Handler) {
            tools[name] = handler;
            configs[name] = config as Config;
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
    assert.equal(configs.upload_assets.annotations?.destructiveHint, true);
    assert.equal(configs.modify_assets.annotations?.destructiveHint, true);
    assert.equal(configs.modify_entities.annotations?.destructiveHint, true);
    tools.get_asset({ id: 7 });
    assert.deepEqual(calls.at(-1), { name: 'assets:get', args: [7] });
    tools.get_asset_references({ id: 7 });
    assert.deepEqual(calls.at(-1), { name: 'assets:references:get', args: [7] });
    tools.delete_assets({ ids: [7], rejectReferenced: true });
    assert.deepEqual(calls.at(-1), { name: 'assets:delete', args: [[7], { rejectReferenced: true }] });

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

    tools.modify_entities({
        edits: [{ id: 'player', path: 'components.camera.customProjection', op: 'unset' }]
    });
    assert.deepEqual(calls.at(-1), {
        name: 'entities:modify',
        args: [[{ id: 'player', path: 'components.camera.customProjection', op: 'unset' }]]
    });
    tools.get_entity({ id: 'player' });
    assert.deepEqual(calls.at(-1), {
        name: 'entities:get',
        args: ['player']
    });

    tools.get_template_overrides({ entityId: 'player' });
    assert.deepEqual(calls.at(-1), {
        name: 'templates:overrides:get',
        args: [{ entityId: 'player' }]
    });
});

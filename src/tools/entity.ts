import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss.ts';

const audioListenerComponentSchema = z.object({
    enabled: z.boolean().default(true).describe('Whether the component is enabled.')
}).describe('The data for the audio listener component.');

const cameraComponentSchema = z.object({
    enabled: z.boolean().optional(),
    clearColorBuffer: z.boolean().optional(),
    clearColor: z.array(z.number()).length(4).optional(),
    clearDepthBuffer: z.boolean().optional(),
    renderSceneDepthMap: z.boolean().optional(),
    renderSceneColorMap: z.boolean().optional(),
    projection: z.number().optional(),
    fov: z.number().optional(),
    frustumCulling: z.boolean().optional(),
    orthoHeight: z.number().optional(),
    nearClip: z.number().optional(),
    farClip: z.number().optional(),
    priority: z.number().optional(),
    rect: z.array(z.number()).length(4).optional(),
    offscreen: z.boolean().optional(),
    layers: z.array(z.number()).optional(),
    toneMapping: z.number().optional(),
    gammaCorrection: z.number().optional()
});

const collisionComponentSchema = z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['box', 'sphere', 'capsule', 'cylinder', 'mesh']).optional(),
    halfExtents: z.array(z.number()).length(3).optional(),
    radius: z.number().optional(),
    axis: z.number().optional(),
    height: z.number().optional(),
    convexHull: z.boolean().optional(),
    asset: z.number().optional().nullable(),
    renderAsset: z.number().optional().nullable(),
    linearOffset: z.array(z.number()).length(3).optional(),
    angularOffset: z.array(z.number()).length(3).optional()
});

const elementComponentSchema = z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['text', 'image', 'group']).optional(),
    anchor: z.array(z.number()).length(4).optional(),
    pivot: z.array(z.number()).length(2).optional(),
    text: z.string().optional(),
    key: z.string().optional(),
    fontAsset: z.number().optional(),
    fontSize: z.number().optional(),
    minFontSize: z.number().optional(),
    maxFontSize: z.number().optional(),
    autoFitWidth: z.boolean().optional(),
    autoFitHeight: z.boolean().optional(),
    maxLines: z.number().optional(),
    lineHeight: z.number().optional(),
    wrapLines: z.boolean().optional(),
    spacing: z.number().optional(),
    color: z.array(z.number()).length(3).optional(),
    opacity: z.number().optional(),
    textureAsset: z.number().optional(),
    spriteAsset: z.number().optional(),
    spriteFrame: z.number().optional(),
    pixelsPerUnit: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    margin: z.array(z.number()).length(4).optional(),
    alignment: z.array(z.number()).length(2).optional(),
    outlineColor: z.array(z.number()).length(4).optional(),
    outlineThickness: z.number().optional(),
    shadowColor: z.array(z.number()).length(4).optional(),
    shadowOffset: z.array(z.number()).length(2).optional(),
    rect: z.array(z.number()).length(4).optional(),
    materialAsset: z.number().optional(),
    autoWidth: z.boolean().optional(),
    autoHeight: z.boolean().optional(),
    fitMode: z.enum(['stretch', 'contain', 'cover']).optional(),
    useInput: z.boolean().optional(),
    batchGroupId: z.number().optional(),
    mask: z.boolean().optional(),
    layers: z.array(z.number()).optional(),
    enableMarkup: z.boolean().optional()
});

const lightComponentSchema = z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['directional', 'spot', 'omni']).optional(),
    bake: z.boolean().optional(),
    bakeArea: z.number().optional(),
    bakeNumSamples: z.number().optional(),
    bakeDir: z.boolean().optional(),
    affectDynamic: z.boolean().optional(),
    affectLightmapped: z.boolean().optional(),
    affectSpecularity: z.boolean().optional(),
    color: z.array(z.number()).length(3).optional(),
    intensity: z.number().optional(),
    castShadows: z.boolean().optional(),
    shadowUpdateMode: z.number().optional(),
    shadowType: z.number().optional(),
    vsmBlurMode: z.number().optional(),
    vsmBlurSize: z.number().optional(),
    vsmBias: z.number().optional(),
    shadowDistance: z.number().optional(),
    shadowIntensity: z.number().optional(),
    shadowResolution: z.number().optional(),
    numCascades: z.number().optional(),
    cascadeDistribution: z.number().optional(),
    shadowBias: z.number().optional(),
    normalOffsetBias: z.number().optional(),
    range: z.number().optional(),
    falloffMode: z.number().optional(),
    innerConeAngle: z.number().optional(),
    outerConeAngle: z.number().optional(),
    shape: z.number().optional(),
    cookieAsset: z.number().optional(),
    cookie: z.number().optional(),
    cookieIntensity: z.number().optional(),
    cookieFalloff: z.boolean().optional(),
    cookieChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    cookieAngle: z.number().optional(),
    cookieScale: z.array(z.number()).length(2).optional(),
    cookieOffset: z.array(z.number()).length(2).optional(),
    isStatic: z.boolean().optional(),
    layers: z.array(z.number()).optional()
});

const renderComponentSchema = z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['box', 'capsule', 'sphere', 'cylinder', 'cone', 'plane']).optional(),
    asset: z.number().optional(),
    materialAssets: z.array(z.number()).optional().describe('Array of material asset IDs referenced by the render component'),
    layers: z.array(z.number()).optional(),
    batchGroupId: z.number().optional(),
    castShadows: z.boolean().optional(),
    castShadowsLightmap: z.boolean().optional(),
    receiveShadows: z.boolean().optional(),
    static: z.boolean().optional(),
    lightmapped: z.boolean().optional(),
    lightmapSizeMultiplier: z.number().optional(),
    castShadowsLightMap: z.boolean().optional(),
    lightMapped: z.boolean().optional(),
    lightMapSizeMultiplier: z.number().optional(),
    isStatic: z.boolean().optional(),
    rootBone: z.string().optional(),
    aabbCenter: z.array(z.number()).length(3).optional(),
    aabbHalfExtents: z.array(z.number()).length(3).optional()
});

const rigidbodyComponentSchema = z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['static', 'dynamic', 'kinematic']).optional(),
    mass: z.number().optional(),
    linearDamping: z.number().optional(),
    angularDamping: z.number().optional(),
    linearFactor: z.array(z.number()).length(3).optional(),
    angularFactor: z.array(z.number()).length(3).optional(),
    friction: z.number().optional(),
    restitution: z.number().optional()
});

const screenComponentSchema = z.object({
    enabled: z.boolean().optional(),
    screenSpace: z.boolean().optional(),
    scaleMode: z.enum(['none', 'blend']).optional(),
    scaleBlend: z.number().optional(),
    resolution: z.array(z.number()).length(2).optional(),
    referenceResolution: z.array(z.number()).length(2).optional(),
    priority: z.number().optional()
});

const scriptComponentSchema = z.object({
    enabled: z.boolean().optional(),
    order: z.array(z.string()).optional(),
    scripts: z.record(z.string(), z.any()).optional()
});

const soundSlotSchema = z.object({
    name: z.string().describe('The name of the sound slot'),
    volume: z.number().describe('The volume modifier to play the audio with.'),
    pitch: z.number().describe('The pitch to playback the audio at. A value of 1 means the audio is played back at the original pitch.'),
    asset: z.number().nullable().describe('The `id` of the audio asset that can be played from this sound slot.'),
    startTime: z.number().describe('The start time from which the sound will start playing.'),
    duration: z.number().nullable().describe('The duration of the sound that the slot will play starting from startTime.'),
    loop: z.boolean().describe('If true, the slot will loop playback continuously. Otherwise, it will be played once to completion.'),
    autoPlay: z.boolean().describe('If true, the slot will be played on load. Otherwise, sound slots will need to be played by scripts.'),
    overlap: z.boolean().describe('If true then sounds played from slot will be played independently of each other. Otherwise the slot will first stop the current sound before starting the new one.')
}).partial();

const soundComponentSchema = z.object({
    enabled: z.boolean().default(true).describe('Whether the component is enabled.'),
    volume: z.number().default(1).describe('The volume modifier to play the audio with. The volume of each slot is multiplied with this value.'),
    pitch: z.number().default(1).describe('The pitch to playback the audio at. A value of 1 means the audio is played back at the original pitch. The pitch of each slot is multiplied with this value.'),
    positional: z.boolean().default(true).describe('If true, the component will play back audio assets as if played from the location of the entity in 3D space.'),
    refDistance: z.number().default(1).describe('The reference distance for reducing volume as the sound source moves further from the listener.'),
    maxDistance: z.number().default(10000).describe('The maximum distance from the listener at which audio falloff stops. Note the volume of the audio is not 0 after this distance, but just doesn\'t fall off anymore.'),
    rollOffFactor: z.number().default(1).describe('The rate at which volume fall-off occurs.'),
    distanceModel: z.string().default('linear').describe('Determines which algorithm to use to reduce the volume of the audio as it moves away from the listener. Can be one of: "inverse", "linear", "exponential".'),
    slots: z.record(soundSlotSchema).default({
        '1': {
            name: 'Slot 1',
            loop: false,
            autoPlay: false,
            overlap: false,
            asset: null,
            startTime: 0,
            duration: null,
            volume: 1,
            pitch: 1
        }
    }).describe('A dictionary of sound slots. Each sound slot controls playback of an audio asset. Each key in the dictionary is a number representing the index of each sound slot.')
}).describe('The data for the sound component.').optional();

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'create_entity',
        'Create a new entity',
        {
            enabled: z.boolean().optional(),
            name: z.string().optional(),
            parent: z.string().optional(),
            position: z.array(z.number()).length(3).optional(),
            rotation: z.array(z.number()).length(3).optional(),
            scale: z.array(z.number()).length(3).optional(),
            tags: z.array(z.string()).optional(),
            components: z.object({
                audiolistener: audioListenerComponentSchema,
                camera: cameraComponentSchema.optional(),
                element: elementComponentSchema.optional(),
                light: lightComponentSchema.optional(),
                render: renderComponentSchema.optional(),
                screen: screenComponentSchema.optional(),
                script: scriptComponentSchema.optional(),
                sound: soundComponentSchema
            })
        },
        (options) => {
            return wss.call('entities:create', options);
        }
    );

    server.tool(
        'modify_entity',
        'Modify an entity\'s properties',
        {
            id: z.string(),
            name: z.string().optional(),
            enabled: z.boolean().optional(),
            position: z.array(z.number()).length(3).optional(),
            rotation: z.array(z.number()).length(3).optional(),
            scale: z.array(z.number()).length(3).optional(),
            tags: z.array(z.string()).optional()
        },
        (options) => {
            return wss.call('entities:modify', options.id, options);
        }
    );

    server.tool(
        'duplicate_entities',
        'Duplicate one or more entities',
        {
            ids: z.array(z.string()),
            rename: z.boolean().optional()
        },
        ({ ids, rename }) => {
            return wss.call('entities:duplicate', ids, { rename });
        }
    );

    server.tool(
        'reparent_entity',
        'Reparent an entity',
        {
            id: z.string(),
            parent: z.string(),
            index: z.number().optional(),
            preserveTransform: z.boolean().optional()
        },
        (options) => {
            return wss.call('entities:reparent', options);
        }
    );

    server.tool(
        'delete_entities',
        'Delete one or more entities. The root entity cannot be deleted.',
        {
            ids: z.array(z.string()).describe('Array of entity IDs to delete. The root entity cannot be deleted.')
        },
        ({ ids }) => {
            return wss.call('entities:delete', ids);
        }
    );

    server.tool(
        'list_entities',
        'List all entities',
        {},
        () => {
            return wss.call('entities:list');
        }
    );

    server.tool(
        'add_components',
        'Add components to an entity',
        {
            id: z.string(),
            components: z.object({
                audiolistener: audioListenerComponentSchema,
                camera: cameraComponentSchema.optional(),
                collision: collisionComponentSchema.optional(),
                element: elementComponentSchema.optional(),
                light: lightComponentSchema.optional(),
                render: renderComponentSchema.optional(),
                rigidbody: rigidbodyComponentSchema.optional(),
                screen: screenComponentSchema.optional(),
                script: scriptComponentSchema.optional(),
                sound: soundComponentSchema
            })
        },
        ({ id, components }) => {
            return wss.call('entities:components:add', id, components);
        }
    );

    server.tool(
        'remove_components',
        'Remove components from an entity',
        {
            id: z.string(),
            components: z.array(z.string())
        },
        ({ id, components }) => {
            return wss.call('entities:components:remove', id, components);
        }
    );

    server.tool(
        'set_render_component_material',
        'Set the material on a render component',
        {
            id: z.string(),
            assetId: z.number()
        },
        ({ id, assetId }) => {
            return wss.call('entities:components:property:set', id, 'render', 'materialAssets', [assetId]);
        }
    );

    server.tool(
        'add_script_component_script',
        'Add a script to a script component',
        {
            id: z.string(),
            scriptName: z.string()
        },
        ({ id, scriptName }) => {
            return wss.call('entities:components:script:add', id, scriptName);
        }
    );
};

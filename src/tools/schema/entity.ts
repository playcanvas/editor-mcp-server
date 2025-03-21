import { z } from 'zod';

import { Vec4Schema } from './common.ts';

const AudioListenerSchema = z.object({
    enabled: z.boolean().default(true).describe('Whether the component is enabled.')
}).describe('The data for the audio listener component.').optional();

const CameraSchema = z.object({
    enabled: z.boolean().default(true).describe('Whether the component is enabled.'),
    clearColorBuffer: z.boolean().default(true).describe('If true, the camera will explicitly clear its render target to the chosen clear color before rendering the scene.'),
    clearColor: Vec4Schema.default([0.118, 0.118, 0.118, 1]).describe('The color used to clear the camera\'s render target.'),
    clearDepthBuffer: z.boolean().default(true).describe('If true, the camera will explicitly clear the depth buffer of its render target before rendering the scene.'),
    renderSceneDepthMap: z.boolean().default(false),
    renderSceneColorMap: z.boolean().default(false),
    projection: z.number().default(0).describe('The projection type of the camera. Can be `pc.PROJECTION_PERSPECTIVE` or `pc.PROJECTION_ORTHOGRAPHIC`.'),
    fov: z.number().default(45).describe('The angle (in degrees) between top and bottom clip planes of a perspective camera.'),
    frustumCulling: z.boolean().default(true).describe('Controls the culling of mesh instances against the camera frustum. If true, culling is enabled. If false, all mesh instances in the scene are rendered by the camera, regardless of visibility.'),
    orthoHeight: z.number().default(4).describe('The distance in world units between the top and bottom clip planes of an orthographic camera.'),
    nearClip: z.number().default(0.1).describe('The distance in camera space from the camera\'s eye point to the near plane.'),
    farClip: z.number().default(1000).describe('The distance in camera space from the camera\'s eye point to the far plane.'),
    priority: z.number().default(0).describe('A number that defines the order in which camera views are rendered by the engine. Smaller numbers are rendered first.'),
    rect: Vec4Schema.default([0, 0, 1, 1]).describe('An array of 4 numbers that represents the rectangle that specifies the viewport onto the camera\'s attached render target. This allows you to implement features like split-screen or picture-in-picture. It is defined by normalised coordinates (0 to 1) in the following format: [The lower left x coordinate, The lower left y coordinate, The width of the rectangle, The height of the rectangle].'),
    offscreen: z.boolean().optional(),
    layers: z.array(z.number()).default([0, 1, 2, 3, 4]).describe('An array of layer id\'s that this camera will render.'),
    toneMapping: z.number().default(0).describe('The tonemapping transform to apply to the final color of the camera. Can be: `pc.TONEMAP_NONE`, `pc.TONEMAP_LINEAR`, `pc.TONEMAP_FILMIC`, `pc.TONEMAP_HEJL`, `pc.TONEMAP_ACES`, `pc.TONEMAP_ACES2`, `pc.TONEMAP_NEUTRAL`.'),
    gammaCorrection: z.number().default(1).describe('The gamma correction to apply to the final color of the camera. Can be: `pc.GAMMA_NONE`, `pc.GAMMA_SRGB`.')
}).describe('The data for the camera component.').optional();

const CollisionSchema = z.object({
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
}).describe('The data for the collision component.').optional();

const ElementSchema = z.object({
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
}).describe('The data for the element component.').optional();

const LightSchema = z.object({
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
}).describe('The data for the light component.').optional();

const RenderSchema = z.object({
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
}).describe('The data for the render component.').optional();

const RigidBodySchema = z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['static', 'dynamic', 'kinematic']).optional(),
    mass: z.number().optional(),
    linearDamping: z.number().optional(),
    angularDamping: z.number().optional(),
    linearFactor: z.array(z.number()).length(3).optional(),
    angularFactor: z.array(z.number()).length(3).optional(),
    friction: z.number().optional(),
    restitution: z.number().optional()
}).describe('The data for the rigid body component.').optional();

const ScreenSchema = z.object({
    enabled: z.boolean().optional(),
    screenSpace: z.boolean().optional(),
    scaleMode: z.enum(['none', 'blend']).optional(),
    scaleBlend: z.number().optional(),
    resolution: z.array(z.number()).length(2).optional(),
    referenceResolution: z.array(z.number()).length(2).optional(),
    priority: z.number().optional()
}).describe('The data for the screen component.').optional();

const ScriptSchema = z.object({
    enabled: z.boolean().optional(),
    order: z.array(z.string()).optional(),
    scripts: z.record(z.string(), z.any()).optional()
}).describe('The data for the script component.').optional();

const SoundSlotSchema = z.object({
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

const SoundSchema = z.object({
    enabled: z.boolean().default(true).describe('Whether the component is enabled.'),
    volume: z.number().default(1).describe('The volume modifier to play the audio with. The volume of each slot is multiplied with this value.'),
    pitch: z.number().default(1).describe('The pitch to playback the audio at. A value of 1 means the audio is played back at the original pitch. The pitch of each slot is multiplied with this value.'),
    positional: z.boolean().default(true).describe('If true, the component will play back audio assets as if played from the location of the entity in 3D space.'),
    refDistance: z.number().default(1).describe('The reference distance for reducing volume as the sound source moves further from the listener.'),
    maxDistance: z.number().default(10000).describe('The maximum distance from the listener at which audio falloff stops. Note the volume of the audio is not 0 after this distance, but just doesn\'t fall off anymore.'),
    rollOffFactor: z.number().default(1).describe('The rate at which volume fall-off occurs.'),
    distanceModel: z.string().default('linear').describe('Determines which algorithm to use to reduce the volume of the audio as it moves away from the listener. Can be one of: "inverse", "linear", "exponential".'),
    slots: z.record(SoundSlotSchema).default({
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

export {
    AudioListenerSchema,
    CameraSchema,
    CollisionSchema,
    ElementSchema,
    LightSchema,
    RenderSchema,
    RigidBodySchema,
    ScreenSchema,
    ScriptSchema,
    SoundSchema
};

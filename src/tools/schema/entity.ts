import { z, type ZodTypeAny } from 'zod';

import { AssetIdSchema, RgbSchema, RgbaSchema, Vec2Schema, Vec3Schema, Vec4Schema } from './common';

const AudioListenerSchema = z.object({
    enabled: z.boolean().optional()
}).describe('Audio listener component');

const CameraSchema = z.object({
    enabled: z.boolean().optional(),
    clearColorBuffer: z.boolean().optional().describe('Clear color buffer'),
    clearColor: RgbaSchema.optional().describe('Clear color'),
    clearDepthBuffer: z.boolean().optional().describe('Clear depth buffer'),
    renderSceneDepthMap: z.boolean().optional(),
    renderSceneColorMap: z.boolean().optional(),
    projection: z.union([
        z.literal(0).describe('Perspective'),
        z.literal(1).describe('Orthographic')
    ]).optional(),
    fov: z.number().optional().describe('Field of view degrees'),
    frustumCulling: z.boolean().optional(),
    orthoHeight: z.number().optional().describe('Ortho height'),
    nearClip: z.number().min(0).optional(),
    farClip: z.number().min(0).optional(),
    priority: z.number().optional(),
    rect: Vec4Schema.optional().describe('Viewport rect [x,y,w,h]'),
    layers: z.array(z.number().int().min(0)).optional(),
    toneMapping: z.union([
        z.literal(0).describe('Linear'),
        z.literal(1).describe('Filmic'),
        z.literal(2).describe('Hejl'),
        z.literal(3).describe('ACES'),
        z.literal(4).describe('ACES2'),
        z.literal(5).describe('Neutral'),
        z.literal(6).describe('None')
    ]).optional(),
    gammaCorrection: z.union([
        z.literal(0).describe('None'),
        z.literal(1).describe('sRGB')
    ]).optional()
}).describe('Camera component');

const CollisionSchema = z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['box', 'sphere', 'capsule', 'cylinder', 'mesh']).optional(),
    halfExtents: Vec3Schema.optional().describe('Box half-extents'),
    radius: z.number().min(0).optional(),
    axis: z.union([
        z.literal(0).describe('X'),
        z.literal(1).describe('Y'),
        z.literal(2).describe('Z')
    ]).optional(),
    height: z.number().min(0).optional(),
    convexHull: z.boolean().optional(),
    asset: AssetIdSchema.optional().describe('Model asset'),
    renderAsset: AssetIdSchema.optional().describe('Render asset'),
    linearOffset: Vec3Schema.optional(),
    angularOffset: Vec3Schema.optional()
}).describe('Collision component');

const ElementSchema = z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['text', 'image', 'group']).optional(),
    anchor: Vec4Schema.optional().describe('[left,bottom,right,top]'),
    pivot: Vec2Schema.optional(),
    text: z.string().optional(),
    key: z.string().nullable().optional().describe('Localization key'),
    fontAsset: AssetIdSchema.optional(),
    fontSize: z.number().optional(),
    minFontSize: z.number().optional(),
    maxFontSize: z.number().optional(),
    autoFitWidth: z.boolean().optional(),
    autoFitHeight: z.boolean().optional(),
    maxLines: z.number().nullable().optional(),
    lineHeight: z.number().optional(),
    wrapLines: z.boolean().optional(),
    spacing: z.number().optional().describe('Letter spacing'),
    color: RgbSchema.optional(),
    opacity: z.number().min(0).max(1).optional(),
    textureAsset: AssetIdSchema.optional(),
    spriteAsset: AssetIdSchema.optional(),
    spriteFrame: z.number().optional(),
    pixelsPerUnit: z.number().nullable().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    margin: Vec4Schema.optional(),
    alignment: Vec2Schema.optional(),
    outlineColor: RgbaSchema.optional(),
    outlineThickness: z.number().optional(),
    shadowColor: RgbaSchema.optional(),
    shadowOffset: Vec2Schema.optional(),
    rect: Vec4Schema.optional().describe('Texture rect [u,v,w,h]'),
    materialAsset: AssetIdSchema.optional(),
    autoWidth: z.boolean().optional(),
    autoHeight: z.boolean().optional(),
    fitMode: z.enum(['stretch', 'contain', 'cover']).optional(),
    useInput: z.boolean().optional(),
    batchGroupId: z.number().nullable().optional(),
    mask: z.boolean().optional(),
    layers: z.array(z.number()).optional(),
    enableMarkup: z.boolean().optional()
}).describe('UI element component');

const LightSchema = z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['directional', 'spot', 'omni']).optional(),
    bake: z.boolean().optional().describe('Bake to lightmap'),
    bakeArea: z.number().min(0).max(180).optional(),
    bakeNumSamples: z.number().int().min(1).max(255).optional(),
    bakeDir: z.boolean().optional(),
    affectDynamic: z.boolean().optional(),
    affectLightmapped: z.boolean().optional(),
    affectSpecularity: z.boolean().optional(),
    color: RgbSchema.optional(),
    intensity: z.number().min(0).max(32).optional(),
    castShadows: z.boolean().optional(),
    shadowUpdateMode: z.union([
        z.literal(1).describe('ThisFrame'),
        z.literal(2).describe('Realtime')
    ]).optional(),
    shadowType: z.union([
        z.literal(0).describe('PCF3_32F'),
        z.literal(2).describe('VSM_16F'),
        z.literal(3).describe('VSM_32F'),
        z.literal(4).describe('PCF5_32F'),
        z.literal(5).describe('PCF1_32F'),
        z.literal(6).describe('PCSS_32F'),
        z.literal(7).describe('PCF1_16F'),
        z.literal(8).describe('PCF3_16F'),
        z.literal(9).describe('PCF5_16F')
    ]).optional(),
    vsmBlurMode: z.union([
        z.literal(0).describe('Box'),
        z.literal(1).describe('Gaussian')
    ]).optional(),
    vsmBlurSize: z.number().int().min(1).max(25).optional(),
    vsmBias: z.number().min(0).max(1).optional(),
    shadowDistance: z.number().min(0).optional(),
    shadowIntensity: z.number().min(0).optional(),
    shadowResolution: z.union([
        z.literal(16), z.literal(32), z.literal(64), z.literal(128),
        z.literal(256), z.literal(512), z.literal(1024), z.literal(2048), z.literal(4096)
    ]).optional(),
    numCascades: z.number().int().min(1).max(4).optional(),
    cascadeDistribution: z.number().optional(),
    shadowBias: z.number().min(0).max(1).optional(),
    normalOffsetBias: z.number().min(0).max(1).optional(),
    range: z.number().min(0).optional().describe('Light range'),
    falloffMode: z.union([
        z.literal(0).describe('Linear'),
        z.literal(1).describe('InverseSquared')
    ]).optional(),
    innerConeAngle: z.number().min(0).max(45).optional(),
    outerConeAngle: z.number().min(0).max(90).optional(),
    shape: z.union([
        z.literal(0).describe('Punctual'),
        z.literal(1).describe('Rect'),
        z.literal(2).describe('Disk'),
        z.literal(3).describe('Sphere')
    ]).optional(),
    cookieAsset: AssetIdSchema.optional(),
    cookieIntensity: z.number().min(0).max(1).optional(),
    cookieFalloff: z.boolean().optional(),
    cookieChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    cookieAngle: z.number().optional(),
    cookieScale: Vec2Schema.optional(),
    cookieOffset: Vec2Schema.optional(),
    isStatic: z.boolean().optional(),
    layers: z.array(z.number().int().min(0)).optional()
}).describe('Light component');

const RenderSchema = z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['asset', 'box', 'capsule', 'sphere', 'cylinder', 'cone', 'plane']).optional(),
    asset: z.number().int().nullable().optional().describe('Render asset'),
    materialAssets: z.array(z.number().int().nullable()).optional(),
    layers: z.array(z.number().int().min(0)).optional(),
    batchGroupId: z.number().int().nullable().optional(),
    castShadows: z.boolean().optional(),
    castShadowsLightmap: z.boolean().optional(),
    receiveShadows: z.boolean().optional(),
    lightmapped: z.boolean().optional(),
    lightmapSizeMultiplier: z.number().optional(),
    isStatic: z.boolean().optional(),
    rootBone: z.string().nullable().optional(),
    aabbCenter: Vec3Schema.optional(),
    aabbHalfExtents: Vec3Schema.optional()
}).describe('Render component');

const RigidBodySchema = z.object({
    enabled: z.boolean().optional(),
    type: z.enum(['static', 'dynamic', 'kinematic']).optional(),
    mass: z.number().min(0).optional(),
    linearDamping: z.number().min(0).max(1).optional(),
    angularDamping: z.number().min(0).max(1).optional(),
    linearFactor: Vec3Schema.optional(),
    angularFactor: Vec3Schema.optional(),
    friction: z.number().min(0).max(1).optional(),
    restitution: z.number().min(0).max(1).optional().describe('Bounciness')
}).describe('Rigidbody component');

const ScreenSchema = z.object({
    enabled: z.boolean().optional(),
    screenSpace: z.boolean().optional().describe('2D screen mode'),
    scaleMode: z.enum(['none', 'blend']).optional(),
    scaleBlend: z.number().min(0).max(1).optional(),
    resolution: Vec2Schema.optional(),
    referenceResolution: Vec2Schema.optional(),
    priority: z.number().int().min(0).max(127).optional()
}).describe('Screen component');

const ScriptAttributeSchema = z.any().describe('Script attribute values');

const ScriptInstanceSchema = z.object({
    enabled: z.boolean().optional(),
    attributes: z.record(ScriptAttributeSchema).optional()
});

const ScriptSchema = z.object({
    enabled: z.boolean().optional(),
    order: z.array(z.string()).optional().describe('Script execution order'),
    scripts: z.record(ScriptInstanceSchema).optional().describe('Script instances')
}).describe('Script component');

const SoundSlotSchema = z.object({
    name: z.string().optional(),
    volume: z.number().min(0).max(1).optional(),
    pitch: z.number().min(0).optional(),
    asset: AssetIdSchema.optional().describe('Audio asset'),
    startTime: z.number().optional(),
    duration: z.number().nullable().optional(),
    loop: z.boolean().optional(),
    autoPlay: z.boolean().optional(),
    overlap: z.boolean().optional()
}).partial();

const SoundSchema = z.object({
    enabled: z.boolean().optional(),
    volume: z.number().min(0).max(1).optional(),
    pitch: z.number().min(0).optional(),
    positional: z.boolean().optional().describe('3D audio'),
    refDistance: z.number().min(0).optional(),
    maxDistance: z.number().min(0).optional(),
    rollOffFactor: z.number().min(0).optional(),
    distanceModel: z.enum(['linear', 'inverse', 'exponential']).optional(),
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
    }).describe('Sound slots')
}).describe('Sound component');

export const ComponentsSchema = z.object({
    audiolistener: AudioListenerSchema.optional(),
    camera: CameraSchema.optional(),
    collision: CollisionSchema.optional(),
    element: ElementSchema.optional(),
    light: LightSchema.optional(),
    render: RenderSchema.optional(),
    rigidbody: RigidBodySchema.optional(),
    screen: ScreenSchema.optional(),
    script: ScriptSchema.optional(),
    sound: SoundSchema.optional()
}).describe('Entity components');

export const ComponentNameSchema = z.enum([
    'anim',
    'animation',
    'audiolistener',
    'button',
    'camera',
    'collision',
    'element',
    'layoutchild',
    'layoutgroup',
    'light',
    'model',
    'particlesystem',
    'render',
    'rigidbody',
    'screen',
    'script',
    'scrollbar',
    'scrollview',
    'sound',
    'sprite'
]);

export const EntitySchema: z.ZodOptional<ZodTypeAny> = z.lazy(() => z.object({
    name: z.string().optional(),
    enabled: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    children: z.array(EntitySchema).optional(),
    position: Vec3Schema.optional().describe('Local position'),
    rotation: Vec3Schema.optional().describe('Local rotation (euler degrees)'),
    scale: Vec3Schema.optional().describe('Local scale'),
    components: ComponentsSchema.optional()
})).optional();

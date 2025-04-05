import { z, type ZodTypeAny } from 'zod';

import { Vec2Schema, Vec3Schema, Vec4Schema } from './common';

const AudioListenerSchema = z.object({
    enabled: z.boolean().optional().describe('Whether the component is enabled. Default: true')
}).describe('The data for the audio listener component.');

const CameraSchema = z.object({
    enabled: z.boolean().optional().describe('Whether the component is enabled. Default: true'),
    clearColorBuffer: z.boolean().optional().describe('If true, the camera will explicitly clear its render target to the chosen clear color before rendering the scene. Default: true'),
    clearColor: Vec4Schema.optional().describe('The color used to clear the camera\'s render target. Default: [0.118, 0.118, 0.118, 1]'),
    clearDepthBuffer: z.boolean().optional().describe('If true, the camera will explicitly clear the depth buffer of its render target before rendering the scene. Default: true'),
    renderSceneDepthMap: z.boolean().optional().describe('If true, the camera will render the scene depth map. Default: false'),
    renderSceneColorMap: z.boolean().optional().describe('If true, the camera will render the scene color map. Default: false'),
    projection: z.number().int().min(0).max(1).optional().describe('The projection type of the camera. Can be `pc.PROJECTION_PERSPECTIVE` or `pc.PROJECTION_ORTHOGRAPHIC`. Default: 0 (pc.PROJECTION_PERSPECTIVE)'),
    fov: z.number().optional().describe('The angle (in degrees) between top and bottom clip planes of a perspective camera. Default: 45'),
    frustumCulling: z.boolean().optional().describe('Controls the culling of mesh instances against the camera frustum. If true, culling is enabled. If false, all mesh instances in the scene are rendered by the camera, regardless of visibility. Default: true'),
    orthoHeight: z.number().optional().describe('The distance in world units between the top and bottom clip planes of an orthographic camera. Default: 4'),
    nearClip: z.number().min(0).optional().describe('The distance in camera space from the camera\'s eye point to the near plane. Default: 0.1'),
    farClip: z.number().min(0).optional().describe('The distance in camera space from the camera\'s eye point to the far plane. Default: 1000'),
    priority: z.number().optional().describe('A number that defines the order in which camera views are rendered by the engine. Smaller numbers are rendered first. Default: 0'),
    rect: Vec4Schema.optional().describe('An array of 4 numbers that represents the rectangle that specifies the viewport onto the camera\'s attached render target. This allows you to implement features like split-screen or picture-in-picture. It is defined by normalized coordinates (0 to 1) in the following format: [The lower left x coordinate, The lower left y coordinate, The width of the rectangle, The height of the rectangle]. Default: [0, 0, 1, 1]'),
    layers: z.array(z.number().int().min(0)).optional().describe('An array of layer id\'s that this camera will render. Default: [0, 1, 2, 3, 4]'),
    toneMapping: z.number().int().min(0).max(6).optional().describe('The tonemapping transform to apply to the final color of the camera. Can be: 0 (TONEMAP_LINEAR), 1 (TONEMAP_FILMIC), 2 (TONEMAP_HEJL), 3 (TONEMAP_ACES), 4 (TONEMAP_ACES2), 5 (TONEMAP_NEUTRAL) or 6 (TONEMAP_NONE). Default: 0 (pc.TONEMAP_LINEAR)'),
    gammaCorrection: z.number().int().min(0).max(1).optional().describe('The gamma correction to apply to the final color of the camera. Can be: `pc.GAMMA_NONE`, `pc.GAMMA_SRGB`. Default: 1 (pc.GAMMA_SRGB)')
}).describe('The data for the camera component.');

const CollisionSchema = z.object({
    enabled: z.boolean().optional().describe('Whether the component is enabled. Default: true'),
    type: z.enum(['box', 'sphere', 'capsule', 'cylinder', 'mesh']).optional().describe('The type of collision primitive. Can be: box, sphere, capsule, cylinder, mesh. Default: "box"'),
    halfExtents: Vec3Schema.optional().describe('The half-extents of the collision box. This is an array of 3 numbers: local space half-width, half-height, and half-depth. Default: [0.5, 0.5, 0.5]'),
    radius: z.number().min(0).optional().describe('The radius of the capsule/cylinder body. Default: 0.5'),
    axis: z.number().int().min(0).max(2).optional().describe('Aligns the capsule/cylinder with the local-space X, Y or Z axis of the entity. Default: 1'),
    height: z.number().min(0).optional().describe('The tip-to-tip height of the capsule/cylinder. Default: 2'),
    convexHull: z.boolean().optional().describe('If true, the collision shape will be a convex hull. Default: false'),
    asset: z.number().int().nullable().optional().describe('The `id` of the model asset that will be used as a source for the triangle-based collision mesh. Default: null'),
    renderAsset: z.number().int().nullable().optional().describe('The `id` of the render asset that will be used as a source for the triangle-based collision mesh. Default: null'),
    linearOffset: Vec3Schema.optional().describe('The positional offset of the collision shape from the Entity position along the local axes. Default: [0, 0, 0]'),
    angularOffset: Vec3Schema.optional().describe('The rotational offset of the collision shape from the Entity rotation in local space. Default: [0, 0, 0]')
}).describe('The data for the collision component.');

const ElementSchema = z.object({
    enabled: z.boolean().optional().describe('Whether the component is enabled. Default: true'),
    type: z.enum(['text', 'image', 'group']).optional().describe('The type of the element. Can be: `pc.ELEMENTTYPE_GROUP`, `pc.ELEMENTTYPE_IMAGE`, `pc.ELEMENTTYPE_TEXT`. Default: "text"'),
    anchor: Vec4Schema.optional().describe('An array of 4 numbers controlling the left, bottom, right and top anchors of the element. Default: [0.5, 0.5, 0.5, 0.5]'),
    pivot: Vec2Schema.optional().describe('An array of 2 numbers controlling the origin of the element. Default: [0.5, 0.5]'),
    text: z.string().nullable().optional().describe('The text content of the element. Default: ""'),
    key: z.string().nullable().optional().describe('The localization key of the element. Default: null'),
    fontAsset: z.number().nullable().optional().describe('The `id` of the font asset used by the element. Default: null'),
    fontSize: z.number().optional().describe('The size of the font used by the element. Default: 32'),
    minFontSize: z.number().optional().describe('The minimum size of the font when using `autoFitWidth` or `autoFitHeight`. Default: 8'),
    maxFontSize: z.number().optional().describe('The maximum size of the font when using `autoFitWidth` or `autoFitHeight`. Default: 32'),
    autoFitWidth: z.boolean().optional().describe('Automatically scale the font size to fit the element\'s width. Default: false'),
    autoFitHeight: z.boolean().optional().describe('Automatically scale the font size to fit the element\'s height. Default: false'),
    maxLines: z.number().nullable().optional().describe('The maximum number of lines that this element can display. Default: null'),
    lineHeight: z.number().optional().describe('The height of each line of text. Default: 32'),
    wrapLines: z.boolean().optional().describe('Automatically wrap lines based on the element width. Default: true'),
    spacing: z.number().optional().describe('The spacing between each letter of the text. Default: 1'),
    color: Vec3Schema.optional().describe('The color of the element. Default: [1, 1, 1]'),
    opacity: z.number().optional().describe('The opacity of the element. Default: 1'),
    textureAsset: z.number().nullable().optional().describe('The `id` of the texture asset to be used by the element. Default: null'),
    spriteAsset: z.number().nullable().optional().describe('The `id` of the sprite asset to be used by the element. Default: null'),
    spriteFrame: z.number().optional().describe('The frame from the sprite asset to render. Default: 0'),
    pixelsPerUnit: z.number().nullable().optional().describe('Number of pixels per PlayCanvas unit (used for 9-sliced sprites). Default: null'),
    width: z.number().optional().describe('The width of the element. Default: 32'),
    height: z.number().optional().describe('The height of the element. Default: 32'),
    margin: Vec4Schema.optional().describe('Spacing between each edge of the element and the respective anchor. Default: [-16, -16, -16, -16]'),
    alignment: Vec2Schema.optional().describe('Horizontal and vertical alignment of the text relative to its element transform. Default: [0.5, 0.5]'),
    outlineColor: Vec4Schema.optional().describe('Text outline effect color and opacity. Default: [0, 0, 0, 1]'),
    outlineThickness: z.number().optional().describe('Text outline effect width (0–1). Default: 0'),
    shadowColor: Vec4Schema.optional().describe('Text shadow color and opacity. Default: [0, 0, 0, 1]'),
    shadowOffset: Vec2Schema.optional().describe('Horizontal and vertical offset of the text shadow. Default: [0.0, 0.0]'),
    rect: Vec4Schema.optional().describe('Texture rect for the image element (u, v, width, height). Default: [0, 0, 1, 1]'),
    materialAsset: z.number().nullable().optional().describe('The `id` of the material asset used by this element. Default: null'),
    autoWidth: z.boolean().optional().describe('Automatically size width to match text content. Default: false'),
    autoHeight: z.boolean().optional().describe('Automatically size height to match text content. Default: false'),
    fitMode: z.enum(['stretch', 'contain', 'cover']).optional().describe('Set how the content should be fitted and preserve the aspect ratio. Default: "stretch"'),
    useInput: z.boolean().optional().describe('Enable this to make the element respond to input events. Default: false'),
    batchGroupId: z.number().nullable().optional().describe('The batch group id that this element belongs to. Default: null'),
    mask: z.boolean().optional().describe('If true, this element acts as a mask for its children. Default: false'),
    layers: z.array(z.number()).optional().describe('An array of layer ids that this element belongs to. Default: [4]'),
    enableMarkup: z.boolean().optional().describe('Enable markup processing (only for text elements). Default: false')
}).describe('The data for the element component.');

const LightSchema = z.object({
    enabled: z.boolean().optional().describe('Whether the component is enabled. Default: true'),
    type: z.enum(['directional', 'spot', 'omni']).optional().describe('The type of light. Can be: directional, spot, omni. Default: "directional"'),
    bake: z.boolean().optional().describe('If true the light will be rendered into lightmaps. Default: false'),
    bakeArea: z.number().min(0).max(180).optional().describe('If bake is enabled, specifies the directional light penumbra angle in degrees, allowing soft shadows. Default: 0'),
    bakeNumSamples: z.number().int().min(1).max(255).optional().describe('If bake is enabled, specifies the number of samples used to bake this light into the lightmap. Default: 1'),
    bakeDir: z.boolean().optional().describe('If true and `bake` is true, the light\'s direction will contribute to directional lightmaps. Default: true'),
    affectDynamic: z.boolean().optional().describe('If true the light will affect non-lightmapped objects. Default: true'),
    affectLightmapped: z.boolean().optional().describe('If true the light will affect lightmapped objects. Default: false'),
    affectSpecularity: z.boolean().optional().describe('If true the light will affect material specularity. For directional light only. Default: true.'),
    color: Vec3Schema.optional().describe('An array of 3 numbers that represents the color of the emitted light. Default: [1, 1, 1]'),
    intensity: z.number().min(0).max(32).optional().describe('The intensity of the light, this acts as a scalar value for the light\'s color. This value can exceed 1. Default: 1'),
    castShadows: z.boolean().optional().describe('If true, the light will cause shadow casting models to cast shadows. Default: false'),
    shadowUpdateMode: z.number().int().min(1).max(2).optional().describe('Tells the renderer how often shadows must be updated for this light. Can be 1 (SHADOWUPDATE_THISFRAME) or 2 (SHADOWUPDATE_REALTIME) Default: 2'),
    shadowType: z.union([
        z.literal(0),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
        z.literal(6),
        z.literal(7),
        z.literal(8),
        z.literal(9)
    ]).optional().describe('Type of shadows being rendered by this light. Can be 0 (SHADOW_PCF3_32F), 2 (SHADOW_VSM_16F), 3 (SHADOW_VSM_32F), 4 (SHADOW_PCF5_32F), 5 (SHADOW_PCF1_32F), 6 (SHADOW_PCSS_32F), 7 (SHADOW_PCF1_16F), 8 (SHADOW_PCF3_16F) or 9 (SHADOW_PCF5_16F). Default: 0 (SHADOW_PCF3_32F)'),
    vsmBlurMode: z.number().int().min(0).max(1).optional().describe('Blurring mode for variance shadow maps. Can be 0 (BLUR_BOX) or 1 (BLUR_GAUSSIAN). Default: 1 (BLUR_GAUSSIAN)'),
    vsmBlurSize: z.number().int().min(1).max(25).optional().describe('Number of samples used for blurring a variance shadow map. Only uneven numbers work, even are incremented. Minimum value is 1, maximum is 25. Default: 11'),
    vsmBias: z.number().min(0).max(1).optional().describe('Constant depth offset applied to a shadow map to eliminate rendering artifacts like shadow acne. Default: 0.01'),
    shadowDistance: z.number().min(0).optional().describe('The shadow distance is the maximum distance from the camera beyond which shadows from Directional Lights are no longer visible. Default: 16'),
    shadowIntensity: z.number().min(0).optional().describe('The intensity of the shadow darkening, 1 being shadows are entirely black. Default: 1'),
    shadowResolution: z.union([
        z.literal(16),
        z.literal(32),
        z.literal(64),
        z.literal(128),
        z.literal(256),
        z.literal(512),
        z.literal(1024),
        z.literal(2048),
        z.literal(4096)
    ]).optional().describe('The size of the texture used for the shadow map (power of 2). Default: 1024'),
    numCascades: z.number().int().min(1).max(4).optional().describe('Number of shadow cascades. Default: 1'),
    cascadeDistribution: z.number().optional().describe('The distribution of subdivision of the camera frustum for individual shadow cascades. Default: 0.5'),
    shadowBias: z.number().min(0).max(1).optional().describe('Constant depth offset applied to a shadow map to eliminate artifacts. Default: 0.2'),
    normalOffsetBias: z.number().min(0).max(1).optional().describe('Normal offset depth bias. Default: 0.05'),
    range: z.number().min(0).optional().describe('The distance from the spotlight source at which its contribution falls to zero. Default: 8'),
    falloffMode: z.number().int().min(0).max(1).optional().describe('Controls the rate at which a light attenuates from its position. Can be 0 (Linear) or 1 (Inverse Squared). Default: 0'),
    innerConeAngle: z.number().min(0).max(45).optional().describe('The angle at which the spotlight cone starts to fade off (degrees). Affects spot lights only. Default: 40'),
    outerConeAngle: z.number().min(0).max(90).optional().describe('The angle at which the spotlight cone has faded to nothing (degrees). Affects spot lights only. Default: 45'),
    shape: z.number().min(0).max(3).optional().describe('The shape of the light source. Can be: `pc.LIGHTSHAPE_PUNCTUAL`, `pc.LIGHTSHAPE_RECT`, `pc.LIGHTSHAPE_DISK`, `pc.LIGHTSHAPE_SPHERE`. Default: 0 (pc.LIGHTSHAPE_PUNCTUAL)'),
    cookieAsset: z.number().int().nullable().optional().describe('The id of a texture asset that represents that light cookie. Default: null'),
    cookie: z.number().int().nullable().optional().describe('The id of a projection texture asset. Must be 2D for spot and cubemap for omni (ignored if incorrect type is used). Default: null'),
    cookieIntensity: z.number().optional().describe('Projection texture intensity. Default: 1.0'),
    cookieFalloff: z.boolean().optional().describe('Toggle normal spotlight falloff when projection texture is used. Default: true'),
    cookieChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional().describe('Color channels of the projection texture to use. Can be "r", "g", "b", "a", "rgb" or any swizzled combination. Default: "rgb"'),
    cookieAngle: z.number().optional().describe('Angle for spotlight cookie rotation. Default: 0.0'),
    cookieScale: Vec2Schema.optional().describe('Spotlight cookie scale. Default: [1.0, 1.0]'),
    cookieOffset: Vec2Schema.optional().describe('Spotlight cookie position offset. Default: [0.0, 0.0]'),
    isStatic: z.boolean().optional().describe('Mark light as non-movable (optimization). Default: false'),
    layers: z.array(z.number().int().min(0)).optional().describe('An array of layer id\'s that this light will affect. Default: [0]')
}).describe('The data for the light component.');

const RenderSchema = z.object({
    enabled: z.boolean().optional().describe('Whether the component is enabled. Default: true'),
    type: z.enum(['asset', 'box', 'capsule', 'sphere', 'cylinder', 'cone', 'plane']).optional().describe('The type of the render component. Can be: asset, box, capsule, cone, cylinder, plane, sphere. Default: "asset"'),
    asset: z.number().int().nullable().optional().describe('The `id` of the render asset for the render component (only applies to type "asset"). Default: null'),
    materialAssets: z.array(z.number().int().nullable()).optional().describe('An array of material asset `id`s that will be used to render the meshes. Each material corresponds to the respective mesh instance. Default: []'),
    layers: z.array(z.number().int().min(0)).optional().describe('An array of layer id\'s to which the meshes should belong. Default: [0]'),
    batchGroupId: z.number().int().nullable().optional().describe('The batch group id that the meshes should belong to. Default: null'),
    castShadows: z.boolean().optional().describe('If true, attached meshes will cast shadows for lights that have shadow casting enabled. Default: true'),
    castShadowsLightmap: z.boolean().optional().describe('If true, the meshes will cast shadows when rendering lightmaps. Default: true'),
    receiveShadows: z.boolean().optional().describe('If true, shadows will be cast on attached meshes. Default: true'),
    lightmapped: z.boolean().optional().describe('If true, the meshes will be lightmapped after using lightmapper.bake(). Default: false'),
    lightmapSizeMultiplier: z.number().optional().describe('Lightmap resolution multiplier. Default: 1.0'),
    isStatic: z.boolean().optional().describe('Mark meshes as non-movable (optimization). Default: false'),
    rootBone: z.string().nullable().optional().describe('The `resource_id` of the entity to be used as the root bone for any skinned meshes that are rendered by this component. Default: null'),
    aabbCenter: Vec3Schema.optional().describe('An array of 3 numbers controlling the center of the AABB to be used. Default: [0, 0, 0]'),
    aabbHalfExtents: Vec3Schema.optional().describe('An array of 3 numbers controlling the half extents of the AABB to be used. Default: [0.5, 0.5, 0.5]')
}).describe('The data for the render component.');

const RigidBodySchema = z.object({
    enabled: z.boolean().optional().describe('Whether the component is enabled. Default: true'),
    type: z.enum(['static', 'dynamic', 'kinematic']).optional().describe('The type of RigidBody determines how it is simulated. Can be one of: static, dynamic, kinematic. Default: "static"'),
    mass: z.number().min(0).optional().describe('The mass of the body. Default: 1'),
    linearDamping: z.number().min(0).max(1).optional().describe('Controls the rate at which a body loses linear velocity over time. Default: 0'),
    angularDamping: z.number().min(0).max(1).optional().describe('Controls the rate at which a body loses angular velocity over time. Default: 0'),
    linearFactor: Vec3Schema.optional().describe('An array of 3 numbers that represents the scaling factor for linear movement of the body in each axis. Default: [1, 1, 1]'),
    angularFactor: Vec3Schema.optional().describe('An array of 3 numbers that represents the scaling factor for angular movement of the body in each axis. Default: [1, 1, 1]'),
    friction: z.number().min(0).max(1).optional().describe('The friction value used when contacts occur between two bodies. Default: 0.5'),
    restitution: z.number().min(0).max(1).optional().describe('The amount of energy lost when two objects collide, this determines the bounciness of the object. Default: 0.5')
}).describe('The data for the rigidbody component.');

const ScreenSchema = z.object({
    enabled: z.boolean().optional().describe('Whether the component is enabled. Default: true'),
    screenSpace: z.boolean().optional().describe('If true then the screen will display its child Elements in 2D. Set this to false to make this a 3D screen. Default: true'),
    scaleMode: z.enum(['none', 'blend']).optional().describe('Controls how a screen-space screen is resized when the window size changes. Can be: `pc.SCALEMODE_BLEND`: Use it to have the screen adjust between the difference of the window resolution and the screen\'s reference resolution. `pc.SCALEMODE_NONE`: Use it to make the screen always have a size equal to its resolution. Default: "blend"'),
    scaleBlend: z.number().min(0).max(1).optional().describe('Set this to 0 to only adjust to changes between the width of the window and the x of the reference resolution. Set this to 1 to only adjust to changes between the window height and the y of the reference resolution. A value in the middle will try to adjust to both. Default: 0.5'),
    resolution: Vec2Schema.optional().describe('An array of 2 numbers that represents the resolution of the screen. Default: [1280, 720]'),
    referenceResolution: Vec2Schema.optional().describe('An array of 2 numbers that represents the reference resolution of the screen. If the window size changes the screen will adjust its size based on `scaleMode` using the reference resolution. Default: [1280, 720]'),
    priority: z.number().int().min(0).max(127).optional().describe('Determines the order in which Screen components in the same layer are rendered (higher priority is rendered on top). Number must be an integer between 0 and 127. Default: 0')
}).describe('The data for the screen component.');

const ScriptAttributeSchema = z.any().describe('A dictionary that holds the values of each attribute. The keys in the dictionary are the attribute names.');

const ScriptInstanceSchema = z.object({
    enabled: z.boolean().optional().describe('Whether the script instance is enabled. Default: true'),
    attributes: z.record(ScriptAttributeSchema).optional().describe('A dictionary that holds the values of each attribute. The keys in the dictionary are the attribute names. Default: {}')
});

const ScriptSchema = z.object({
    enabled: z.boolean().optional().describe('Whether the component is enabled. Default: true'),
    order: z.array(z.string()).optional().describe('An array of script names in the order in which they should be executed at runtime. Default: []'),
    scripts: z.record(ScriptInstanceSchema).optional().describe('A dictionary that contains all the scripts attached to this script component. Each key in the dictionary is the script name. Default: {}')
}).describe('The data for the script component.');

const SoundSlotSchema = z.object({
    name: z.string().optional().describe('The name of the sound slot. Default: "Slot 1"'),
    volume: z.number().optional().describe('The volume modifier to play the audio with. Default: 1'),
    pitch: z.number().optional().describe('The pitch to playback the audio at. A value of 1 means the audio is played back at the original pitch. Default: 1'),
    asset: z.number().nullable().optional().describe('The `id` of the audio asset that can be played from this sound slot. Default: null'),
    startTime: z.number().optional().describe('The start time from which the sound will start playing. Default: 0'),
    duration: z.number().nullable().optional().describe('The duration of the sound that the slot will play starting from startTime. Default: null'),
    loop: z.boolean().optional().describe('If true, the slot will loop playback continuously. Otherwise, it will be played once to completion. Default: false'),
    autoPlay: z.boolean().optional().describe('If true, the slot will be played on load. Otherwise, sound slots will need to be played by scripts. Default: false'),
    overlap: z.boolean().optional().describe('If true then sounds played from slot will be played independently of each other. Otherwise the slot will first stop the current sound before starting the new one. Default: false')
}).partial();

const SoundSchema = z.object({
    enabled: z.boolean().optional().describe('Whether the component is enabled. Default: true'),
    volume: z.number().optional().describe('The volume modifier to play the audio with. The volume of each slot is multiplied with this value. Default: 1'),
    pitch: z.number().optional().describe('The pitch to playback the audio at. A value of 1 means the audio is played back at the original pitch. The pitch of each slot is multiplied with this value. Default: 1'),
    positional: z.boolean().optional().describe('If true, the component will play back audio assets as if played from the location of the entity in 3D space. Default: true'),
    refDistance: z.number().optional().describe('The reference distance for reducing volume as the sound source moves further from the listener. Default: 1'),
    maxDistance: z.number().optional().describe('The maximum distance from the listener at which audio falloff stops. Note the volume of the audio is not 0 after this distance, but just doesn\'t fall off anymore. Default: 10000'),
    rollOffFactor: z.number().optional().describe('The rate at which volume fall-off occurs. Default: 1'),
    distanceModel: z.enum(['linear', 'inverse', 'exponential']).optional().describe('Determines which algorithm to use to reduce the volume of the audio as it moves away from the listener. Can be one of: "inverse", "linear", "exponential". Default: "linear"'),
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
}).describe('The data for the sound component.');

const ComponentsSchema = z.object({
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
}).describe('A dictionary that contains the components of the entity and their data.');

const ComponentNameSchema = z.enum([
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

const EntitySchema: z.ZodOptional<ZodTypeAny> = z.lazy(() => z.object({
    name: z.string().optional().describe('The name of the entity. Default: "Untitled"'),
    enabled: z.boolean().optional().describe('Whether the entity is enabled. Default: true'),
    tags: z.array(z.string()).optional().describe('The tags of the entity. Default: []'),
    children: z.array(EntitySchema).optional().describe('An array that contains the child entities. Default: []'),
    position: Vec3Schema.optional().describe('The position of the entity in local space (x, y, z). Default: [0, 0, 0]'),
    rotation: Vec3Schema.optional().describe('The rotation of the entity in local space (rx, ry, rz euler angles in degrees). Default: [0, 0, 0]'),
    scale: Vec3Schema.optional().describe('The scale of the entity in local space (sx, sy, sz). Default: [1, 1, 1]'),
    components: ComponentsSchema.optional().describe('The components of the entity and their data. Default: {}')
})).optional();

const EntityIdSchema = z.string().uuid().describe('The ID of the entity.');

export {
    AudioListenerSchema,
    CameraSchema,
    CollisionSchema,
    ComponentsSchema,
    ComponentNameSchema,
    ElementSchema,
    EntityIdSchema,
    EntitySchema,
    LightSchema,
    RenderSchema,
    RigidBodySchema,
    ScreenSchema,
    ScriptSchema,
    SoundSchema
};

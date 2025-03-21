import { z } from 'zod';

import { Vec2Schema, Vec3Schema, Vec4Schema } from './common.ts';

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
    enabled: z.boolean().default(true).describe('Whether the component is enabled.'),
    type: z.enum(['box', 'sphere', 'capsule', 'cylinder', 'mesh']).default('box').describe('The type of collision primitive. Can be: box, sphere, capsule, cylinder, mesh.'),
    halfExtents: Vec3Schema.default([0.5, 0.5, 0.5]).describe('The half-extents of the collision box. This is an array of 3 numbers: local space half-width, half-height, and half-depth.'),
    radius: z.number().default(0.5).describe('The radius of the capsule/cylinder body.'),
    axis: z.number().default(1).describe('Aligns the capsule/cylinder with the local-space X, Y or Z axis of the entity'),
    height: z.number().default(2).describe('The tip-to-tip height of the capsule/cylinder.'),
    convexHull: z.boolean().default(false).describe('If true, the collision shape will be a convex hull.'),
    asset: z.number().nullable().default(null).describe('The `id` of the model asset that will be used as a source for the triangle-based collision mesh.'),
    renderAsset: z.number().nullable().default(null).describe('The `id` of the render asset that will be used as a source for the triangle-based collision mesh.'),
    linearOffset: Vec3Schema.describe('The positional offset of the collision shape from the Entity position along the local axes.'),
    angularOffset: Vec3Schema.describe('The rotational offset of the collision shape from the Entity rotation in local space.')
}).describe('The data for the collision component.').optional();

const ElementSchema = z.object({
    enabled: z.boolean().default(true).describe('Whether the component is enabled.'),
    type: z.enum(['text', 'image', 'group']).default('text').describe('The type of the element. Can be: `pc.ELEMENTTYPE_GROUP`, `pc.ELEMENTTYPE_IMAGE`, `pc.ELEMENTTYPE_TEXT`.'),
    anchor: Vec4Schema.default([0.5, 0.5, 0.5, 0.5]).describe('An array of 4 numbers controlling the left, bottom, right and top anchors of the element.'),
    pivot: Vec2Schema.default([0.5, 0.5]).describe('An array of 2 numbers controlling the origin of the element.'),
    text: z.string().nullable().default('').describe('The text content of the element.'),
    key: z.string().nullable().default(null).describe('The localization key of the element.'),
    fontAsset: z.number().nullable().default(null).describe('The `id` of the font asset used by the element.'),
    fontSize: z.number().default(32).describe('The size of the font used by the element.'),
    minFontSize: z.number().default(8).describe('The minimum size of the font when using `autoFitWidth` or `autoFitHeight`.'),
    maxFontSize: z.number().default(32).describe('The maximum size of the font when using `autoFitWidth` or `autoFitHeight`.'),
    autoFitWidth: z.boolean().default(false).describe('Automatically scale the font size to fit the element\'s width.'),
    autoFitHeight: z.boolean().default(false).describe('Automatically scale the font size to fit the element\'s height.'),
    maxLines: z.number().nullable().default(null).describe('The maximum number of lines that this element can display.'),
    lineHeight: z.number().default(32).describe('The height of each line of text.'),
    wrapLines: z.boolean().default(true).describe('Automatically wrap lines based on the element width.'),
    spacing: z.number().default(1).describe('The spacing between each letter of the text.'),
    color: Vec3Schema.default([1, 1, 1]).describe('The color of the element.'),
    opacity: z.number().default(1).describe('The opacity of the element.'),
    textureAsset: z.number().nullable().default(null).describe('The `id` of the texture asset to be used by the element.'),
    spriteAsset: z.number().nullable().default(null).describe('The `id` of the sprite asset to be used by the element.'),
    spriteFrame: z.number().default(0).describe('The frame from the sprite asset to render.'),
    pixelsPerUnit: z.number().nullable().default(null).describe('Number of pixels per PlayCanvas unit (used for 9-sliced sprites).'),
    width: z.number().default(32).describe('The width of the element.'),
    height: z.number().default(32).describe('The height of the element.'),
    margin: Vec4Schema.default([-16, -16, -16, -16]).describe('Spacing between each edge of the element and the respective anchor.'),
    alignment: Vec2Schema.default([0.5, 0.5]).describe('Horizontal and vertical alignment of the text relative to its element transform.'),
    outlineColor: Vec4Schema.default([0, 0, 0, 1]).describe('Text outline effect color and opacity.'),
    outlineThickness: z.number().default(0).describe('Text outline effect width (0–1).'),
    shadowColor: Vec4Schema.default([0, 0, 0, 1]).describe('Text shadow color and opacity.'),
    shadowOffset: Vec2Schema.default([0.0, 0.0]).describe('Horizontal and vertical offset of the text shadow.'),
    rect: Vec4Schema.default([0, 0, 1, 1]).describe('Texture rect for the image element (u, v, width, height).'),
    materialAsset: z.number().nullable().default(null).describe('The `id` of the material asset used by this element.'),
    autoWidth: z.boolean().default(false).describe('Automatically size width to match text content.'),
    autoHeight: z.boolean().default(false).describe('Automatically size height to match text content.'),
    fitMode: z.enum(['stretch', 'contain', 'cover']).default('stretch').describe('Set how the content should be fitted and preserve the aspect ratio.'),
    useInput: z.boolean().default(false).describe('Enable this to make the element respond to input events.'),
    batchGroupId: z.number().nullable().default(null).describe('The batch group id that this element belongs to.'),
    mask: z.boolean().default(false).describe('If true, this element acts as a mask for its children.'),
    layers: z.array(z.number()).default([4]).describe('An array of layer ids that this element belongs to.'),
    enableMarkup: z.boolean().default(false).describe('Enable markup processing (only for text elements).')
}).describe('The data for the element component.').optional();

const LightSchema = z.object({
    enabled: z.boolean().default(true).describe('Whether the component is enabled.'),
    type: z.enum(['directional', 'spot', 'omni']).default('directional').describe('The type of light. Can be: directional, spot, omni.'),
    bake: z.boolean().default(false).describe('If true the light will be rendered into lightmaps.'),
    bakeArea: z.number().default(0).describe('If bake is enabled, specifies the directional light penumbra angle in degrees, allowing soft shadows. Defaults to 0.'),
    bakeNumSamples: z.number().default(1).describe('If bake is enabled, specifies the number of samples used to bake this light into the lightmap.'),
    bakeDir: z.boolean().default(true).describe('If true and `bake` is true, the light\'s direction will contribute to directional lightmaps.'),
    affectDynamic: z.boolean().default(true).describe('If true the light will affect non-lightmapped objects.'),
    affectLightmapped: z.boolean().default(false).describe('If true the light will affect lightmapped objects.'),
    affectSpecularity: z.boolean().default(true).describe('If true the light will affect material specularity. For directional light only. Defaults to true.'),
    color: Vec3Schema.default([1, 1, 1]).describe('An array of 3 numbers that represents the color of the emitted light.'),
    intensity: z.number().default(1).describe('The intensity of the light, this acts as a scalar value for the light\'s color. This value can exceed 1.'),
    castShadows: z.boolean().default(false).describe('If true, the light will cause shadow casting models to cast shadows.'),
    shadowUpdateMode: z.number().default(2).describe('Tells the renderer how often shadows must be updated for this light.'),
    shadowType: z.number().default(0).describe('Type of shadows being rendered by this light.'),
    vsmBlurMode: z.number().default(1).describe('Blurring mode for variance shadow maps.'),
    vsmBlurSize: z.number().default(11).describe('Number of samples used for blurring a variance shadow map. Only uneven numbers work, even are incremented. Minimum value is 1, maximum is 25'),
    vsmBias: z.number().default(0.01).describe('Constant depth offset applied to a shadow map to eliminate rendering artifacts like shadow acne.'),
    shadowDistance: z.number().default(16).describe('The shadow distance is the maximum distance from the camera beyond which shadows from Directional Lights are no longer visible.'),
    shadowIntensity: z.number().default(1).describe('The intensity of the shadow darkening, 1 being shadows are entirely black.'),
    shadowResolution: z.number().default(1024).describe('The size of the texture used for the shadow map.'),
    numCascades: z.number().default(1).describe('Number of shadow cascades.'),
    cascadeDistribution: z.number().default(0.5).describe('The distribution of subdivision of the camera frustum for individual shadow cascades.'),
    shadowBias: z.number().default(0.2).describe('Constant depth offset applied to a shadow map to eliminate artifacts.'),
    normalOffsetBias: z.number().default(0.05).describe('Normal offset depth bias.'),
    range: z.number().default(8).describe('The distance from the spotlight source at which its contribution falls to zero.'),
    falloffMode: z.number().default(0).describe('Controls the rate at which a light attenuates from its position.'),
    innerConeAngle: z.number().default(40).describe('The angle at which the spotlight cone starts to fade off (degrees). Affects spot lights only.'),
    outerConeAngle: z.number().default(45).describe('The angle at which the spotlight cone has faded to nothing (degrees). Affects spot lights only.'),
    shape: z.number().min(0).max(3).default(0).describe('The shape of the light source. Can be: `pc.LIGHTSHAPE_PUNCTUAL`, `pc.LIGHTSHAPE_RECT`, `pc.LIGHTSHAPE_DISK`, `pc.LIGHTSHAPE_SPHERE`.'),
    cookieAsset: z.number().nullable().default(null).describe('The id of a texture asset that represents that light cookie.'),
    cookie: z.number().nullable().default(null).describe('The id of a projection texture asset. Must be 2D for spot and cubemap for omni (ignored if incorrect type is used).'),
    cookieIntensity: z.number().default(1.0).describe('Projection texture intensity.'),
    cookieFalloff: z.boolean().default(true).describe('Toggle normal spotlight falloff when projection texture is used.'),
    cookieChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).default('rgb').describe('Color channels of the projection texture to use. Can be "r", "g", "b", "a", "rgb" or any swizzled combination.'),
    cookieAngle: z.number().default(0.0).describe('Angle for spotlight cookie rotation.'),
    cookieScale: Vec2Schema.default([1.0, 1.0]).describe('Spotlight cookie scale.'),
    cookieOffset: Vec2Schema.default([0.0, 0.0]).describe('Spotlight cookie position offset.'),
    isStatic: z.boolean().default(false).describe('Mark light as non-movable (optimization).'),
    layers: z.array(z.number()).default([0]).describe('An array of layer id\'s that this light will affect.')
}).describe('The data for the light component.').optional();

const RenderSchema = z.object({
    enabled: z.boolean().default(true).describe('Whether the component is enabled.'),
    type: z.enum(['asset', 'box', 'capsule', 'sphere', 'cylinder', 'cone', 'plane']).default('asset').describe('The type of the render component. Can be: asset, box, capsule, cone, cylinder, plane, sphere.'),
    asset: z.number().nullable().default(null).describe('The `id` of the render asset for the render component (only applies to type "asset").'),
    materialAssets: z.array(z.number().nullable()).default([]).describe('An array of material asset `id`s that will be used to render the meshes. Each material corresponds to the respective mesh instance.'),
    layers: z.array(z.number()).default([0]).describe('An array of layer id\'s to which the meshes should belong.'),
    batchGroupId: z.number().nullable().default(null).describe('The batch group id that the meshes should belong to.'),
    castShadows: z.boolean().default(true).describe('If true, attached meshes will cast shadows for lights that have shadow casting enabled.'),
    castShadowsLightmap: z.boolean().default(true).describe('If true, the meshes will cast shadows when rendering lightmaps.'),
    receiveShadows: z.boolean().default(true).describe('If true, shadows will be cast on attached meshes.'),
    static: z.boolean().optional(), // No default specified
    lightmapped: z.boolean().default(false).describe('If true, the meshes will be lightmapped after using lightmapper.bake().'),
    lightmapSizeMultiplier: z.number().default(1.0).describe('Lightmap resolution multiplier.'),
    isStatic: z.boolean().default(false).describe('Mark meshes as non-movable (optimization).'),
    rootBone: z.string().nullable().default(null).describe('The `resource_id` of the entity to be used as the root bone for any skinned meshes that are rendered by this component.'),
    aabbCenter: Vec3Schema.describe('An array of 3 numbers controlling the center of the AABB to be used.'),
    aabbHalfExtents: Vec3Schema.describe('An array of 3 numbers controlling the half extents of the AABB to be used.')
}).describe('The data for the render component.').optional();

const RigidBodySchema = z.object({
    enabled: z.boolean().default(true).describe('Whether the component is enabled.'),
    type: z.enum(['static', 'dynamic', 'kinematic']).default('static').describe('The type of RigidBody determines how it is simulated. Can be one of: static, dynamic, kinematic.'),
    mass: z.number().default(1).describe('The mass of the body.'),
    linearDamping: z.number().default(0).describe('Controls the rate at which a body loses linear velocity over time.'),
    angularDamping: z.number().default(0).describe('Controls the rate at which a body loses angular velocity over time.'),
    linearFactor: Vec3Schema.default([1, 1, 1]).describe('An array of 3 numbers that represents the scaling factor for linear movement of the body in each axis.'),
    angularFactor: Vec3Schema.default([1, 1, 1]).describe('An array of 3 numbers that represents the scaling factor for angular movement of the body in each axis.'),
    friction: z.number().default(0.5).describe('The friction value used when contacts occur between two bodies.'),
    restitution: z.number().default(0.5).describe('The amount of energy lost when two objects collide, this determines the bounciness of the object.')
}).describe('The data for the rigidbody component.').optional();

const ScreenSchema = z.object({
    enabled: z.boolean().default(true).describe('Whether the component is enabled.'),
    screenSpace: z.boolean().default(true).describe('If true then the screen will display its child Elements in 2D. Set this to false to make this a 3D screen.'),
    scaleMode: z.enum(['none', 'blend']).default('blend').describe('Controls how a screen-space screen is resized when the window size changes. Can be: `pc.SCALEMODE_BLEND`: Use it to have the screen adjust between the difference of the window resolution and the screen\'s reference resolution. `pc.SCALEMODE_NONE`: Use it to make the screen always have a size equal to its resolution.'),
    scaleBlend: z.number().default(0.5).describe('Set this to 0 to only adjust to changes between the width of the window and the x of the reference resolution. Set this to 1 to only adjust to changes between the window height and the y of the reference resolution. A value in the middle will try to adjust to both.'),
    resolution: Vec2Schema.default([1280, 720]).describe('An array of 2 numbers that represents the resolution of the screen.'),
    referenceResolution: Vec2Schema.default([1280, 720]).describe('An array of 2 numbers that represents the reference resolution of the screen. If the window size changes the screen will adjust its size based on `scaleMode` using the reference resolution.'),
    priority: z.number().int().min(0).max(127).default(0).describe('Determines the order in which Screen components in the same layer are rendered (higher priority is rendered on top). Number must be an integer between 0 and 127.')
}).describe('The data for the screen component.').optional();

const ScriptAttributeSchema = z.any().describe('A dictionary that holds the values of each attribute. The keys in the dictionary are the attribute names.');

const ScriptInstanceSchema = z.object({
    enabled: z.boolean().describe('Whether the script instance is enabled.'),
    attributes: z.record(ScriptAttributeSchema).describe('A dictionary that holds the values of each attribute. The keys in the dictionary are the attribute names.')
});

const ScriptSchema = z.object({
    enabled: z.boolean().default(true).describe('Whether the component is enabled.'),
    order: z.array(z.string()).default([]).describe('An array of script names in the order in which they should be executed at runtime.'),
    scripts: z.record(ScriptInstanceSchema).default({}).describe('A dictionary that contains all the scripts attached to this script component. Each key in the dictionary is the script name.')
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

const ComponentsSchema = z.object({
    audiolistener: AudioListenerSchema,
    camera: CameraSchema,
    collision: CollisionSchema,
    element: ElementSchema,
    light: LightSchema,
    render: RenderSchema,
    rigidbody: RigidBodySchema,
    screen: ScreenSchema,
    script: ScriptSchema,
    sound: SoundSchema
}).describe('A dictionary that contains the components of the entity and their data.');

const EntitySchema = z.object({
    name: z.string().optional().describe('The name of the entity.'),
    enabled: z.boolean().default(true).describe('Whether the entity is enabled.'),
    tags: z.array(z.string()).default([]).describe('The tags of the entity.'),
    parent: z.string().describe('The `resource_id` of the parent entity.'),
    children: z.array(z.string()).default([]).describe('An array that contains the `resource_id`s of the entity\'s children.'),
    position: Vec3Schema.default([0, 0, 0]).describe('The position of the entity in local space (x, y, z).'),
    rotation: Vec3Schema.default([0, 0, 0]).describe('The rotation of the entity in local space (rx, ry, rz euler angles in degrees)'),
    scale: Vec3Schema.default([1, 1, 1]).describe('The scale of the entity in local space (sx, sy, sz).'),
    components: ComponentsSchema
}).optional();

export {
    AudioListenerSchema,
    CameraSchema,
    CollisionSchema,
    ComponentsSchema,
    ElementSchema,
    EntitySchema,
    LightSchema,
    RenderSchema,
    RigidBodySchema,
    ScreenSchema,
    ScriptSchema,
    SoundSchema
};

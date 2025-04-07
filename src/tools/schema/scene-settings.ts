import { z } from 'zod';

import { AssetIdSchema, RgbSchema, Vec3Schema } from './common';

const PhysicsSchema = z.object({
    gravity: Vec3Schema.optional().describe('An array of 3 numbers that represents the gravity force. Default: [0, -9.8, 0]')
}).describe('Physics related settings for the scene.');

const RenderSchema = z.object({
    fog: z.enum(['none', 'linear', 'exp', 'exp2']).optional().describe('The type of fog used in the scene. Can be one of `pc.FOG_NONE`, `pc.FOG_LINEAR`, `pc.FOG_EXP`, `pc.FOG_EXP2`. Default: `none`.'),
    fog_start: z.number().min(0).optional().describe('The distance from the viewpoint where linear fog begins. This property is only valid if the fog property is set to `pc.FOG_LINEAR`. Default: 1.0.'),
    fog_end: z.number().min(0).optional().describe('The distance from the viewpoint where linear fog reaches its maximum. This property is only valid if the fog property is set to `pc.FOG_LINEAR`. Default: 1000.0.'),
    fog_density: z.number().min(0).optional().describe('The density of the fog. This property is only valid if the fog property is set to `pc.FOG_EXP` or `pc.FOG_EXP2`. Default: 0.01.'),
    fog_color: RgbSchema.optional().describe('An array of 3 numbers representing the color of the fog. Default: [0.0, 0.0, 0.0].'),
    global_ambient: RgbSchema.optional().describe('An array of 3 numbers representing the color of the scene\'s ambient light. Default: [0.2, 0.2, 0.2].'),
    gamma_correction: z.union([
        z.literal(0).describe('GAMMA_NONE'),
        z.literal(1).describe('GAMMA_SRGB')
    ]).optional().describe('The gamma correction to apply when rendering the scene. Default: 1 (GAMMA_SRGB).'),
    lightmapSizeMultiplier: z.number().optional().describe('The lightmap resolution multiplier. Default: 16.'),
    lightmapMaxResolution: z.number().optional().describe('The maximum lightmap resolution. Default: 2048.'),
    lightmapMode: z.union([
        z.literal(0).describe('BAKE_COLOR'),
        z.literal(1).describe('BAKE_COLORDIR')
    ]).optional().describe('The lightmap baking mode. Default: 1 (BAKE_COLORDIR).'),
    tonemapping: z.number().optional().describe('The tonemapping transform to apply when writing fragments to the frame buffer. Default: 0.'),
    exposure: z.number().optional().describe('The exposure value tweaks the overall brightness of the scene. Default: 1.0.'),
    skybox: AssetIdSchema.optional().describe('The `id` of the cubemap texture to be used as the scene\'s skybox. Default: null.'),
    skyType: z.enum(['infinite', 'box', 'dome']).optional().describe('Type of skybox projection. Default: `infinite`.'),
    skyMeshPosition: Vec3Schema.optional().describe('An array of 3 numbers representing the position of the sky mesh. Default: [0.0, 0.0, 0.0].'),
    skyMeshRotation: Vec3Schema.optional().describe('An array of 3 numbers representing the rotation of the sky mesh. Default: [0.0, 0.0, 0.0].'),
    skyMeshScale: Vec3Schema.optional().describe('An array of 3 numbers representing the scale of the sky mesh. Default: [100.0, 100.0, 100.0].'),
    skyCenter: Vec3Schema.optional().describe('An array of 3 numbers representing the center of the sky mesh. Default: [0.0, 0.1, 0.0].'),
    skyboxIntensity: z.number().optional().describe('Multiplier for skybox intensity. Default: 1.'),
    skyboxMip: z.number().int().min(0).max(5).optional().describe('The mip level of the skybox to be displayed. Only valid for prefiltered cubemap skyboxes. Default: 0.'),
    skyboxRotation: Vec3Schema.optional().describe('An array of 3 numbers representing the rotation of the skybox. Default: [0, 0, 0].'),
    lightmapFilterEnabled: z.boolean().optional().describe('Enable filtering of lightmaps. Default: false.'),
    lightmapFilterRange: z.number().optional().describe('A range parameter of the bilateral filter. Default: 10.'),
    lightmapFilterSmoothness: z.number().optional().describe('A spatial parameter of the bilateral filter. Default: 0.2.'),
    ambientBake: z.boolean().optional().describe('Enable baking the ambient lighting into lightmaps. Default: false.'),
    ambientBakeNumSamples: z.number().optional().describe('Number of samples to use when baking ambient. Default: 1.'),
    ambientBakeSpherePart: z.number().optional().describe('How much of the sphere to include when baking ambient. Default: 0.4.'),
    ambientBakeOcclusionBrightness: z.number().optional().describe('Specifies the ambient occlusion brightness. Typical range is -1 to 1. Default: 0.'),
    ambientBakeOcclusionContrast: z.number().optional().describe('Specifies the ambient occlusion contrast. Typical range is -1 to 1. Default: 0.'),
    clusteredLightingEnabled: z.boolean().optional().describe('Enable the clustered lighting. Default: true.'),
    lightingCells: Vec3Schema.optional().describe('Number of cells along each world-space axis the space containing lights is subdivided into. Default: [10, 3, 10].'),
    lightingMaxLightsPerCell: z.number().optional().describe('Maximum number of lights a cell can store. Default: 255.'),
    lightingCookieAtlasResolution: z.number().optional().describe('Resolution of the atlas texture storing all non-directional cookie textures. Default: 2048.'),
    lightingShadowAtlasResolution: z.number().optional().describe('Resolution of the atlas texture storing all non-directional shadow textures. Default: 2048.'),
    lightingShadowType: z.union([
        z.literal(0).describe('SHADOW_PCF3_32F'),
        z.literal(4).describe('SHADOW_PCF5_32F'),
        z.literal(5).describe('SHADOW_PCF1_32F')
    ]).optional().describe('The type of shadow filtering used by all shadows. Default: 0 (SHADOW_PCF3_32F).'),
    lightingCookiesEnabled: z.boolean().optional().describe('Cluster lights support cookies. Default: false.'),
    lightingAreaLightsEnabled: z.boolean().optional().describe('Cluster lights support area lights. Default: false.'),
    lightingShadowsEnabled: z.boolean().optional().describe('Cluster lights support shadows. Default: true.')
}).describe('Render related settings for the scene.');

const SceneSettingsSchema = z.object({
    physics: PhysicsSchema.optional(),
    render: RenderSchema.optional()
}).describe('Scene settings.');

export { SceneSettingsSchema };

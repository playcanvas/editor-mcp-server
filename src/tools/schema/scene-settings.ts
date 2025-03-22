import { z } from 'zod';

import { Vec3Schema } from './common.ts';

const SceneSettingsSchema = z.object({
    physics: z.object({
        gravity: Vec3Schema.default([0, -9.8, 0]).describe('An array of 3 numbers that represents the gravity force.')
    }).describe('Physics related settings for the scene.'),
    render: z.object({
        fog: z.enum(['none', 'linear', 'exp', 'exp2']).default('none').describe('The type of fog used in the scene. Can be one of `pc.FOG_NONE`, `pc.FOG_LINEAR`, `pc.FOG_EXP`, `pc.FOG_EXP2`.'),
        fog_start: z.number().default(1.0).describe('The distance from the viewpoint where linear fog begins. This property is only valid if the fog property is set to `pc.FOG_LINEAR`.'),
        fog_end: z.number().default(1000.0).describe('The distance from the viewpoint where linear fog reaches its maximum. This property is only valid if the fog property is set to `pc.FOG_LINEAR`.'),
        fog_density: z.number().default(0.01).describe('The density of the fog. This property is only valid if the fog property is set to `pc.FOG_EXP` or `pc.FOG_EXP2`.'),
        fog_color: Vec3Schema.default([0.0, 0.0, 0.0]).describe('An array of 3 numbers representing the color of the fog.'),
        global_ambient: Vec3Schema.default([0.2, 0.2, 0.2]).describe('An array of 3 numbers representing the color of the scene\'s ambient light.'), // Replace with DEFAULT_AMBIENT_COLOR if needed
        gamma_correction: z.number().default(1).describe('The gamma correction to apply when rendering the scene. Can be one of `pc.GAMMA_NONE`, `pc.GAMMA_SRGB`.'),
        lightmapSizeMultiplier: z.number().default(16).describe('The lightmap resolution multiplier.'),
        lightmapMaxResolution: z.number().default(2048).describe('The maximum lightmap resolution.'),
        lightmapMode: z.number().default(1).describe('The lightmap baking mode. Can be one of `pc.BAKE_COLOR`, `pc.BAKE_COLORDIR`.'),
        tonemapping: z.number().default(0).describe('The tonemapping transform to apply when writing fragments to the frame buffer.'),
        exposure: z.number().default(1.0).describe('The exposure value tweaks the overall brightness of the scene.'),
        skybox: z.number().nullable().default(null).describe('The `id` of the cubemap texture to be used as the scene\'s skybox.'),
        skyType: z.enum(['infinite', 'box', 'dome']).default('infinite').describe('Type of skybox projection.'),
        skyMeshPosition: Vec3Schema.default([0.0, 0.0, 0.0]).describe('An array of 3 numbers representing the position of the sky mesh.'),
        skyMeshRotation: Vec3Schema.default([0.0, 0.0, 0.0]).describe('An array of 3 numbers representing the rotation of the sky mesh.'),
        skyMeshScale: Vec3Schema.default([100.0, 100.0, 100.0]).describe('An array of 3 numbers representing the scale of the sky mesh.'),
        skyCenter: Vec3Schema.default([0.0, 0.1, 0.0]).describe('An array of 3 numbers representing the center of the sky mesh.'),
        skyboxIntensity: z.number().default(1).describe('Multiplier for skybox intensity.'),
        skyboxMip: z.number().int().min(0).max(5).default(0).describe('The mip level of the skybox to be displayed. Only valid for prefiltered cubemap skyboxes.'),
        skyboxRotation: Vec3Schema.default([0, 0, 0]).describe('An array of 3 numbers representing the rotation of the skybox.'),
        lightmapFilterEnabled: z.boolean().default(false).describe('Enable filtering of lightmaps.'),
        lightmapFilterRange: z.number().default(10).describe('A range parameter of the bilateral filter.'),
        lightmapFilterSmoothness: z.number().default(0.2).describe('A spatial parameter of the bilateral filter.'),
        ambientBake: z.boolean().default(false).describe('Enable baking the ambient lighting into lightmaps.'),
        ambientBakeNumSamples: z.number().default(1).describe('Number of samples to use when baking ambient.'),
        ambientBakeSpherePart: z.number().default(0.4).describe('How much of the sphere to include when baking ambient.'),
        ambientBakeOcclusionBrightness: z.number().default(0).describe('Specifies the ambient occlusion brightness. Typical range is -1 to 1.'),
        ambientBakeOcclusionContrast: z.number().default(0).describe('Specifies the ambient occlusion contrast. Typical range is -1 to 1.'),
        clusteredLightingEnabled: z.boolean().default(true).describe('Enable the clustered lighting.'),
        lightingCells: Vec3Schema.default([10, 3, 10]).describe('Number of cells along each world-space axis the space containing lights is subdivided into.'),
        lightingMaxLightsPerCell: z.number().default(255).describe('Maximum number of lights a cell can store.'),
        lightingCookieAtlasResolution: z.number().default(2048).describe('Resolution of the atlas texture storing all non-directional cookie textures.'),
        lightingShadowAtlasResolution: z.number().default(2048).describe('Resolution of the atlas texture storing all non-directional shadow textures.'),
        lightingShadowType: z.number().default(0).describe('The type of shadow filtering used by all shadows. Can be SHADOW_PCF1, SHADOW_PCF3 or SHADOW_PCF5.'),
        lightingCookiesEnabled: z.boolean().default(false).describe('Cluster lights support cookies.'),
        lightingAreaLightsEnabled: z.boolean().default(false).describe('Cluster lights support area lights.'),
        lightingShadowsEnabled: z.boolean().default(true).describe('Cluster lights support shadows.')
    }).describe('Render settings for the scene.')
}).describe('Scene settings.');

export { SceneSettingsSchema };

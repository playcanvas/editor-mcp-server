import { z } from 'zod';

import { AssetIdSchema, RgbSchema, Vec3Schema } from './common';

const PhysicsSchema = z.object({
    gravity: Vec3Schema.optional().describe('Gravity force')
}).describe('Physics settings');

const RenderSchema = z.object({
    fog: z.enum(['none', 'linear', 'exp', 'exp2']).optional(),
    fog_start: z.number().min(0).optional(),
    fog_end: z.number().min(0).optional(),
    fog_density: z.number().min(0).optional(),
    fog_color: RgbSchema.optional(),
    global_ambient: RgbSchema.optional().describe('Ambient light color'),
    gamma_correction: z.union([
        z.literal(0).describe('None'),
        z.literal(1).describe('sRGB')
    ]).optional(),
    lightmapSizeMultiplier: z.number().optional(),
    lightmapMaxResolution: z.number().optional(),
    lightmapMode: z.union([
        z.literal(0).describe('Color'),
        z.literal(1).describe('ColorDir')
    ]).optional(),
    tonemapping: z.number().optional(),
    exposure: z.number().optional(),
    skybox: AssetIdSchema.optional().describe('Skybox cubemap'),
    skyType: z.enum(['infinite', 'box', 'dome']).optional(),
    skyMeshPosition: Vec3Schema.optional(),
    skyMeshRotation: Vec3Schema.optional(),
    skyMeshScale: Vec3Schema.optional(),
    skyCenter: Vec3Schema.optional(),
    skyboxIntensity: z.number().optional(),
    skyboxMip: z.number().int().min(0).max(5).optional(),
    skyboxRotation: Vec3Schema.optional(),
    lightmapFilterEnabled: z.boolean().optional(),
    lightmapFilterRange: z.number().optional(),
    lightmapFilterSmoothness: z.number().optional(),
    ambientBake: z.boolean().optional(),
    ambientBakeNumSamples: z.number().optional(),
    ambientBakeSpherePart: z.number().optional(),
    ambientBakeOcclusionBrightness: z.number().optional(),
    ambientBakeOcclusionContrast: z.number().optional(),
    clusteredLightingEnabled: z.boolean().optional(),
    lightingCells: Vec3Schema.optional(),
    lightingMaxLightsPerCell: z.number().optional(),
    lightingCookieAtlasResolution: z.number().optional(),
    lightingShadowAtlasResolution: z.number().optional(),
    lightingShadowType: z.union([
        z.literal(0).describe('PCF3_32F'),
        z.literal(4).describe('PCF5_32F'),
        z.literal(5).describe('PCF1_32F')
    ]).optional(),
    lightingCookiesEnabled: z.boolean().optional(),
    lightingAreaLightsEnabled: z.boolean().optional(),
    lightingShadowsEnabled: z.boolean().optional()
}).describe('Render settings');

const SceneSettingsSchema = z.object({
    physics: PhysicsSchema.optional(),
    render: RenderSchema.optional()
}).describe('Scene settings');

export { SceneSettingsSchema };

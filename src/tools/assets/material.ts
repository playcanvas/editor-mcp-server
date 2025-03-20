import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../../wss.ts';

const materialSchema = z.object({
    ambient: z.array(z.number()).length(3).optional(),
    aoMap: z.number().optional().nullable(),
    aoMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    aoMapUv: z.number().int().min(0).max(7).optional(),
    aoMapTiling: z.array(z.number()).length(2).optional(),
    aoMapOffset: z.array(z.number()).length(2).optional(),
    aoMapRotation: z.number().optional(),
    aoVertexColor: z.boolean().optional(),
    aoVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    aoIntensity: z.number().optional(),
    diffuse: z.array(z.number()).length(3).optional(),
    diffuseTint: z.boolean().optional(),
    diffuseMap: z.number().optional().nullable(),
    diffuseMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    diffuseMapUv: z.number().int().min(0).max(7).optional(),
    diffuseMapTiling: z.array(z.number()).length(2).optional(),
    diffuseMapOffset: z.array(z.number()).length(2).optional(),
    diffuseMapRotation: z.number().optional(),
    diffuseVertexColor: z.boolean().optional(),
    diffuseVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    specular: z.array(z.number()).length(3).optional(),
    specularMap: z.number().optional().nullable(),
    specularMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    specularMapUv: z.number().int().min(0).max(7).optional(),
    specularMapTiling: z.array(z.number()).length(2).optional(),
    specularMapOffset: z.array(z.number()).length(2).optional(),
    specularMapRotation: z.number().optional(),
    specularAntialias: z.boolean().optional(),
    specularTint: z.boolean().optional(),
    specularVertexColor: z.boolean().optional(),
    specularVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    occludeSpecular: z.number().int().min(0).max(2).optional(),
    specularityFactor: z.number().optional(),
    specularityFactorMap: z.number().optional().nullable(),
    specularityFactorMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    specularityFactorMapUv: z.number().int().min(0).max(7).optional(),
    specularityFactorMapTiling: z.array(z.number()).length(2).optional(),
    specularityFactorMapOffset: z.array(z.number()).length(2).optional(),
    specularityFactorMapRotation: z.number().optional(),
    specularityFactorTint: z.boolean().optional(),
    specularityFactorVertexColor: z.boolean().optional(),
    specularityFactorVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    enableGGXSpecular: z.boolean().optional(),
    anisotropy: z.number().min(-1).max(1).optional(),
    useMetalness: z.boolean().optional(),
    metalness: z.number().min(0).max(1).optional(),
    metalnessMap: z.number().optional().nullable(),
    metalnessMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    metalnessMapUv: z.number().int().min(0).max(7).optional(),
    metalnessMapTiling: z.array(z.number()).length(2).optional(),
    metalnessMapOffset: z.array(z.number()).length(2).optional(),
    metalnessMapRotation: z.number().optional(),
    metalnessVertexColor: z.boolean().optional(),
    metalnessVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    useMetalnessSpecularColor: z.boolean().optional(),
    conserveEnergy: z.boolean().optional(),
    shininess: z.number().min(0).max(100).optional(),
    glossMap: z.number().optional().nullable(),
    glossMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    glossMapUv: z.number().int().min(0).max(7).optional(),
    glossMapTiling: z.array(z.number()).length(2).optional(),
    glossMapOffset: z.array(z.number()).length(2).optional(),
    glossMapRotation: z.number().optional(),
    glossVertexColor: z.boolean().optional(),
    glossVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    glossInvert: z.boolean().optional(),
    clearCoat: z.number().min(0).max(1).optional(),
    clearCoatMap: z.number().optional().nullable(),
    clearCoatMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    clearCoatMapUv: z.number().int().min(0).max(7).optional(),
    clearCoatMapTiling: z.array(z.number()).length(2).optional(),
    clearCoatMapOffset: z.array(z.number()).length(2).optional(),
    clearCoatMapRotation: z.number().optional(),
    clearCoatVertexColor: z.boolean().optional(),
    clearCoatVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    clearCoatGloss: z.number().min(0).max(1).optional(),
    clearCoatGlossMap: z.number().optional().nullable(),
    clearCoatGlossMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    clearCoatGlossMapUv: z.number().int().min(0).max(7).optional(),
    clearCoatGlossMapTiling: z.array(z.number()).length(2).optional(),
    clearCoatGlossMapOffset: z.array(z.number()).length(2).optional(),
    clearCoatGlossMapRotation: z.number().optional(),
    clearCoatGlossVertexColor: z.boolean().optional(),
    clearCoatGlossVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    clearCoatGlossInvert: z.boolean().optional(),
    clearCoatNormalMap: z.number().optional().nullable(),
    clearCoatNormalMapUv: z.number().int().min(0).max(7).optional(),
    clearCoatNormalMapTiling: z.array(z.number()).length(2).optional(),
    clearCoatNormalMapOffset: z.array(z.number()).length(2).optional(),
    clearCoatNormalMapRotation: z.number().optional(),
    useSheen: z.boolean().optional(),
    sheen: z.array(z.number()).length(3).optional(),
    sheenMap: z.number().optional().nullable(),
    sheenMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    sheenMapUv: z.number().int().min(0).max(7).optional(),
    sheenMapTiling: z.array(z.number()).length(2).optional(),
    sheenMapOffset: z.array(z.number()).length(2).optional(),
    sheenMapRotation: z.number().optional(),
    sheenVertexColor: z.boolean().optional(),
    sheenVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    sheenGloss: z.number().optional(),
    sheenGlossMap: z.number().optional().nullable(),
    sheenGlossMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    sheenGlossMapUv: z.number().int().min(0).max(7).optional(),
    sheenGlossMapTiling: z.array(z.number()).length(2).optional(),
    sheenGlossMapOffset: z.array(z.number()).length(2).optional(),
    sheenGlossMapRotation: z.number().optional(),
    sheenGlossVertexColor: z.boolean().optional(),
    sheenGlossVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    sheenGlossInvert: z.boolean().optional(),
    emissive: z.array(z.number()).length(3).optional(),
    emissiveMap: z.number().optional().nullable(),
    emissiveMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    emissiveMapUv: z.number().int().min(0).max(7).optional(),
    emissiveMapTiling: z.array(z.number()).length(2).optional(),
    emissiveMapOffset: z.array(z.number()).length(2).optional(),
    emissiveMapRotation: z.number().optional(),
    emissiveIntensity: z.number().min(0).max(10).optional(),
    emissiveVertexColor: z.boolean().optional(),
    emissiveVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    normalMap: z.number().optional().nullable(),
    normalMapUv: z.number().int().min(0).max(7).optional(),
    normalMapTiling: z.array(z.number()).length(2).optional(),
    normalMapOffset: z.array(z.number()).length(2).optional(),
    normalMapRotation: z.number().optional(),
    bumpMapFactor: z.number().optional(),
    useDynamicRefraction: z.boolean().optional(),
    refraction: z.number().min(0).max(1).optional(),
    refractionMap: z.number().optional().nullable(),
    refractionMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    refractionMapUv: z.number().int().min(0).max(7).optional(),
    refractionMapTiling: z.array(z.number()).length(2).optional(),
    refractionMapOffset: z.array(z.number()).length(2).optional(),
    refractionMapRotation: z.number().optional(),
    refractionVertexColor: z.boolean().optional(),
    refractionVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    refractionIndex: z.number().min(0).max(1).optional(),
    dispersion: z.number().min(0).max(10).optional(),
    thickness: z.number().optional(),
    thicknessMap: z.number().optional().nullable(),
    thicknessMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    thicknessMapUv: z.number().int().min(0).max(7).optional(),
    thicknessMapTiling: z.array(z.number()).length(2).optional(),
    thicknessMapOffset: z.array(z.number()).length(2).optional(),
    thicknessMapRotation: z.number().optional(),
    thicknessVertexColor: z.boolean().optional(),
    thicknessVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    attenuation: z.array(z.number()).length(3).optional(),
    attenuationDistance: z.number().optional(),
    useIridescence: z.boolean().optional(),
    iridescence: z.number().optional(),
    iridescenceMap: z.number().optional().nullable(),
    iridescenceMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    iridescenceMapUv: z.number().int().min(0).max(7).optional(),
    iridescenceMapTiling: z.array(z.number()).length(2).optional(),
    iridescenceMapOffset: z.array(z.number()).length(2).optional(),
    iridescenceMapRotation: z.number().optional(),
    iridescenceRefractionIndex: z.number().optional(),
    iridescenceThicknessMap: z.number().optional().nullable(),
    iridescenceThicknessMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    iridescenceThicknessMapUv: z.number().int().min(0).max(7).optional(),
    iridescenceThicknessMapTiling: z.array(z.number()).length(2).optional(),
    iridescenceThicknessMapOffset: z.array(z.number()).length(2).optional(),
    iridescenceThicknessMapRotation: z.number().optional(),
    iridescenceThicknessMin: z.number().optional(),
    iridescenceThicknessMax: z.number().optional(),
    heightMap: z.number().optional().nullable(),
    heightMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    heightMapUv: z.number().int().min(0).max(7).optional(),
    heightMapTiling: z.array(z.number()).length(2).optional(),
    heightMapOffset: z.array(z.number()).length(2).optional(),
    heightMapRotation: z.number().optional(),
    heightMapFactor: z.number().min(0).max(2).optional(),
    alphaToCoverage: z.boolean().optional(),
    alphaTest: z.number().min(0).max(1).optional(),
    alphaFade: z.number().min(0).max(1).optional(),
    opacity: z.number().min(0).max(1).optional(),
    opacityMap: z.number().optional().nullable(),
    opacityMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    opacityMapUv: z.number().int().min(0).max(7).optional(),
    opacityMapTiling: z.array(z.number()).length(2).optional(),
    opacityMapOffset: z.array(z.number()).length(2).optional(),
    opacityMapRotation: z.number().optional(),
    opacityVertexColor: z.boolean().optional(),
    opacityVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    opacityFadesSpecular: z.boolean().optional(),
    opacityDither: z.enum(['none', 'bayer8', 'bluenoise', 'ignnoise']).optional(),
    opacityShadowDither: z.enum(['none', 'bayer8', 'bluenoise', 'ignnoise']).optional(),
    reflectivity: z.number().min(0).max(1).optional(),
    sphereMap: z.number().optional().nullable(),
    cubeMap: z.number().optional().nullable(),
    cubeMapProjection: z.number().int().min(0).max(1).optional(),
    cubeMapProjectionBox: z.object({
        center: z.array(z.number()).length(3),
        halfExtents: z.array(z.number()).length(3)
    }).optional(),
    lightMap: z.number().optional().nullable(),
    lightMapChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    lightMapUv: z.number().int().min(0).max(7).optional(),
    lightMapTiling: z.array(z.number()).length(2).optional(),
    lightMapOffset: z.array(z.number()).length(2).optional(),
    lightMapRotation: z.number().optional(),
    lightVertexColor: z.boolean().optional(),
    lightVertexColorChannel: z.enum(['r', 'g', 'b', 'a', 'rgb']).optional(),
    depthTest: z.boolean().optional(),
    depthWrite: z.boolean().optional(),
    depthBias: z.number().optional(),
    slopeDepthBias: z.number().optional(),
    cull: z.number().int().min(0).max(3).optional(),
    blendType: z.number().int().min(0).max(10).optional(),
    useFog: z.boolean().optional(),
    useLighting: z.boolean().optional(),
    useSkybox: z.boolean().optional(),
    useTonemap: z.boolean().optional(),
    twoSidedLighting: z.boolean().optional()
});

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'create_material',
        'Create a new material',
        {
            name: z.string().optional(),
            data: materialSchema
        },
        async (data) => {
            try {
                const res = await wss.send('assets:create', 'material', data);
                if (res === undefined) {
                    throw new Error('Failed to create material');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Created material: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: err.message
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        'set_material_diffuse',
        'Set diffuse property on a material',
        {
            assetId: z.number(),
            color: z.array(z.number()).length(3)
        },
        async ({ assetId, color }) => {
            try {
                const res = await wss.send('assets:property:set', assetId, 'diffuse', color);
                if (res === undefined) {
                    throw new Error('Failed to set diffuse property on material');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Set diffuse property on material ${assetId}: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: err.message
                    }],
                    isError: true
                };
            }
        }
    );
};

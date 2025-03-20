import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'modify_scene_settings',
        'Modify a scene\'s settings',
        {
            physics: z.object({
                gravity: z.array(z.number()).length(3).optional()
            }).optional(),
            render: z.object({
                exposure: z.number().optional(),
                fog: z.enum(['none', 'linear', 'exp', 'exp2']).optional(),
                fog_color: z.array(z.number()).length(3).optional(),
                fog_density: z.number().optional(),
                fog_end: z.number().optional(),
                fog_start: z.number().optional(),
                gamma_correction: z.number().optional(),
                global_ambient: z.array(z.number()).length(3).optional(),
                lightmapMaxResolution: z.number().optional(),
                lightmapMode: z.number().optional(),
                lightmapSizeMultiplier: z.number().optional(),
                skybox: z.number().optional(),
                skyboxIntensity: z.number().optional(),
                skyboxMip: z.number().optional(),
                skyboxRotation: z.array(z.number()).length(3).optional(),
                tonemapping: z.number().optional()
            }).optional()
        },
        (settings) => {
            return wss.call('scene:settings:modify', settings);
        }
    );
};

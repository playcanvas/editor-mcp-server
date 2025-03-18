import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { type WSS } from '../wss.ts';

export const register = (server: McpServer, wss: WSS) => {
    server.tool(
        'create_entity',
        'Create a new entity',
        {
            name: z.string()
        },
        async ({ name }) => {
            try {
                const res = await wss.send('entity:create', name);
                return {
                    content: [{
                        type: 'text',
                        text: `Created entity: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `Failed to create entity: ${err.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        'delete_entity',
        'Delete an entity',
        {
            id: z.string()
        },
        async ({ id }) => {
            try {
                const res = await wss.send('entity:delete', id);
                return {
                    content: [{
                        type: 'text',
                        text: `Deleted entity ${id}: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `Failed to delete entity ${id}: ${err.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        'list_entities',
        'List all entities',
        {},
        async () => {
            try {
                const res = await wss.send('entity:list');
                return {
                    content: [{
                        type: 'text',
                        text: `Entities: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `Failed to list entities: ${err.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        'set_entity_position',
        'Set the position of an entity',
        {
            id: z.string(),
            position: z.array(z.number()).length(3)
        },
        async ({ id, position }) => {
            try {
                const res = await wss.send('entity:position:set', id, position);
                return {
                    content: [{
                        type: 'text',
                        text: `Set position of entity ${id} to ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `Failed to set position of entity ${id}: ${err.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        'set_entity_scale',
        'Set the scale of an entity',
        {
            id: z.string(),
            scale: z.array(z.number()).length(3)
        },
        async ({ id, scale }) => {
            try {
                const res = await wss.send('entity:scale:set', id, scale);
                return {
                    content: [{
                        type: 'text',
                        text: `Set scale of entity ${id} to ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `Failed to set scale of entity ${id}: ${err.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        'create_render_component',
        'Create a render component on an entity',
        {
            id: z.string(),
            type: z.enum(['box', 'capsule', 'sphere', 'cylinder', 'cone', 'plane'])
        },
        async ({ id, type }) => {
            try {
                const res = await wss.send('entity:component:add', id, 'render', { type });
                return {
                    content: [{
                        type: 'text',
                        text: `Created render component: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `Failed to create render component: ${err.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        'set_render_component_material',
        'Set the material on a render component',
        {
            id: z.string(),
            assetId: z.number()
        },
        async ({ id, assetId }) => {
            try {
                const res = await wss.send('entity:component:property:set', id, 'render', 'materialAssets', [assetId]);
                return {
                    content: [{
                        type: 'text',
                        text: `Set material on render component ${id}: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `Failed to set material on render component ${id}: ${err.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        'create_script_component',
        'Create a script component on an entity',
        {
            id: z.string()
        },
        async ({ id }) => {
            try {
                const res = await wss.send('entity:component:add', id, 'script');
                return {
                    content: [{
                        type: 'text',
                        text: `Created script component: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `Failed to create script component: ${err.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    server.tool(
        'add_script_component_script',
        'Add a script to a script component',
        {
            id: z.string(),
            scriptName: z.number()
        },
        async ({ id, scriptName }) => {
            try {
                const res = await wss.send('entity:component:script:add', id, scriptName);
                return {
                    content: [{
                        type: 'text',
                        text: `Added script on script component ${id}: ${JSON.stringify(res)}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `Failed to add script on script component ${id}: ${err.message}`
                    }],
                    isError: true
                };
            }
        }
    );
};

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServer, type WebSocket } from 'ws';
import { z } from 'zod';

// Create a WebSocket server
class WSS {
    private _server: WebSocketServer;

    private _socket?: WebSocket;

    private _callbacks = new Map();

    private _id = 0;

    constructor(port: number) {
        this._server = new WebSocketServer({ port });
        this._waitForSocket();
    }

    private _waitForSocket() {
        this._server.on('connection', (ws) => {
            if (this._socket) {
                return;
            }
            console.log('[WSS] Connected');
            ws.on('message', (data) => {
                try {
                    const { id, res } = JSON.parse(data.toString());
                    if (this._callbacks.has(id)) {
                        this._callbacks.get(id)(res);
                        this._callbacks.delete(id);
                    }
                } catch (e) {
                    console.error('[WSS]', e);
                }
            });
            ws.on('close', () => {
                console.log('[WSS] Disconnected');
                this._socket = undefined;
                this._waitForSocket();
            });

            this._socket = ws;
        });
    }

    send(name: string, ...args: any[]) {
        return new Promise((resolve, reject) => {
            const id = this._id++;
            this._callbacks.set(id, resolve);
            if (!this._socket) {
                reject(new Error('No socket'));
                return;
            }
            this._socket?.send(JSON.stringify({ id, name, args }));
        });
    }
}
const wss = new WSS(52000);

// Create an MCP server
const server = new McpServer({
    name: 'PlayCanvas',
    version: '1.0.0'
});

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
    'create_component',
    'Create a new component on an entity',
    {
        id: z.string(),
        name: z.enum(['render']),
        type: z.enum(['box', 'capsule', 'sphere', 'cylinder', 'cone', 'plane'])
    },
    async ({ id, name, type }) => {
        try {
            const res = await wss.send('entity:component:add', id, name, { type });
            return {
                content: [{
                    type: 'text',
                    text: `Created ${name} component: ${JSON.stringify(res)}`
                }]
            };
        } catch (err: any) {
            return {
                content: [{
                    type: 'text',
                    text: `Failed to create ${name} component: ${err.message}`
                }],
                isError: true
            };
        }
    }
);

// server.tool(
//     'set_render_component_material',
//     'Set the material on a render component',
//     {
//         id: z.number(),
//         materialId: z.number()
//     },
//     ({ id, materialId }) => {
//         return {
//             content: [{
//                 type: 'text',
//                 text: `Set material ${materialId} on render component ${id}`
//             }]
//         };
//     }
// );

// server.tool(
//     'create_material',
//     'Create a new material',
//     {
//         name: z.string()
//     },
//     ({ name }) => {
//         return {
//             content: [{
//                 type: 'text',
//                 text: `Created material ${name}: ${JSON.stringify({ id: 1 })}`
//             }]
//         };
//     }
// );

// server.tool(
//     'set_material_diffuse',
//     'Set diffuse property on a material',
//     {
//         id: z.number(),
//         color: z.object({
//             r: z.number(),
//             g: z.number(),
//             b: z.number()
//         })
//     },
//     ({ id, color }) => {
//         return {
//             content: [{
//                 type: 'text',
//                 text: `Set diffuse color of material ${id} to ${JSON.stringify(color)}`
//             }]
//         };
//     }
// );

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);

// Ping Extension
setInterval(() => {
    wss.send('ping').catch(() => {});
}, 1000);

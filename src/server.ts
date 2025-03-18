import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServer, type WebSocket } from 'ws';
import { z } from 'zod';

// Create a WebSocket server
class WSS {
    private _server: WebSocketServer;

    private _socket?: WebSocket;

    private _handlers = new Map();

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
                    if (this._handlers.has(id)) {
                        this._handlers.get(id)(res);
                        this._handlers.delete(id);
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
            this._handlers.set(id, resolve);
            if (!this._socket) {
                reject(new Error('No socket'));
                return;
            }
            this._socket?.send(JSON.stringify({ id, name, args }));
        });
    }
}

const wss = new WSS(52000);
setInterval(() => {
    const now = Date.now();
    wss.send('ping').then(() => console.log('Ping', Date.now() - now)).catch(() => console.log('Ping failed'));
}, 1000);

// // Create an MCP server
// const server = new McpServer({
//     name: 'PlayCanvas',
//     version: '1.0.0'
// });

// server.tool(
//     'create_entity',
//     'Create a new entity',
//     {
//         name: z.string()
//     },
//     ({ name }) => {
//         return {
//             content: [{
//                 type: 'text',
//                 text: `Created entity ${name}: ${JSON.stringify({ id: 1 })}`
//             }]
//         };
//     }
// );

// server.tool(
//     'set_entity_position',
//     'Set the position of an entity',
//     {
//         id: z.number(),
//         position: z.object({
//             x: z.number(),
//             y: z.number(),
//             z: z.number()
//         })
//     },
//     ({ id, position }) => {
//         return {
//             content: [{
//                 type: 'text',
//                 text: `Set position of entity ${id} to ${JSON.stringify(position)}`
//             }]
//         };
//     }
// );

// server.tool(
//     'create_component',
//     'Create a new component on an entity',
//     {
//         id: z.number(),
//         name: z.string(),
//         type: z.string().optional().default('box')
//     },
//     ({ id, name, type }) => {
//         return {
//             content: [{
//                 type: 'text',
//                 text: `Created component ${name} of type ${type} on entity ${id}: ${JSON.stringify({
//                     id,
//                     name,
//                     type
//                 })}`
//             }]
//         };
//     }
// );

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

// // Start receiving messages on stdin and sending messages on stdout
// const transport = new StdioServerTransport();
// await server.connect(transport);

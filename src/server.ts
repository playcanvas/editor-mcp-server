import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { register as registerAsset } from './tools/asset.ts';
import { register as registerAssetMaterial } from './tools/assets/material.ts';
import { register as registerAssetScript } from './tools/assets/script.ts';
import { register as registerEntity } from './tools/entity.ts';
import { WSS } from './wss.ts';

// Create a WebSocket server
const wss = new WSS(52000);
setInterval(() => {
    wss.send('ping').catch(() => {});
}, 1000);

// Create an MCP server
const server = new McpServer({
    name: 'PlayCanvas',
    version: '1.0.0'
});

// Register tools
registerEntity(server, wss);
registerAsset(server, wss);
registerAssetMaterial(server, wss);
registerAssetScript(server, wss);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);

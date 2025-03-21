import child_process, { execSync } from 'child_process';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { register as registerAsset } from './tools/asset.ts';
import { register as registerAssetMaterial } from './tools/assets/material.ts';
import { register as registerAssetScript } from './tools/assets/script.ts';
import { register as registerEntity } from './tools/entity.ts';
import { register as registerScene } from './tools/scene.ts';
import { register as registerStore } from './tools/store.ts';
import { WSS } from './wss.ts';

const PORT = 52000;

// Kill existing processes
if (process.platform === 'win32') {
    const cmd = `netstat -ano | findstr 0.0.0.0:${PORT}`;
    const proc = child_process.spawnSync('cmd', ['/c', cmd], { shell: true });
    const pid = proc.stdout.toString().replace(/\s+/g, ' ').trim().split(' ').pop();
    if (pid) {
        child_process.spawnSync('taskkill', ['/F', '/PID', pid, '/T']);
    }
} else {
    // Kill any process using the port
    try {
        execSync(`lsof -ti :${PORT} | xargs kill -9`);
    } catch (err) {
        // Do nothing
    }
}

// Create a WebSocket server
const wss = new WSS(PORT);
setInterval(() => {
    wss.call('ping');
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
registerScene(server, wss);
registerStore(server, wss);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);

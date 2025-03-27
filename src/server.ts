import { execSync } from 'child_process';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { register as registerAsset } from './tools/asset';
import { register as registerAssetMaterial } from './tools/assets/material';
import { register as registerAssetScript } from './tools/assets/script';
import { register as registerEntity } from './tools/entity';
import { register as registerScene } from './tools/scene';
import { register as registerStore } from './tools/store';
import { WSS } from './wss';

const PORT = 52000;

const poll = (cond: () => boolean, rate: number = 1000) => {
    return new Promise<void>((resolve) => {
        const id = setInterval(() => {
            if (cond()) {
                clearInterval(id);
                resolve();
            }
        }, rate);
    });
};

const findPid = (port: number) => {
    if (process.platform === 'win32') {
        return execSync(`netstat -ano | findstr 0.0.0.0:${PORT}`).toString().trim().split(' ').pop();
    }
    return execSync(`lsof -i :${port} | grep LISTEN | awk '{print $2}'`).toString().trim();
};

const kill = (pid: string) => {
    if (process.platform === 'win32') {
        execSync(`taskkill /F /PID ${pid}`);
        return;
    }
    execSync(`kill -9 ${pid}`);
};

// Kill the existing server
const pid = findPid(PORT);
if (pid) {
    kill(pid);
}

// Wait for the server to stop
await poll(() => !findPid(PORT));

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

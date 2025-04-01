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
        try {
            return execSync(`netstat -ano | findstr 0.0.0.0:${PORT}`).toString().trim().split(' ').pop();
        } catch (e) {
            return '';
        }
    }
    return execSync(`lsof -i :${port} | grep LISTEN | awk '{print $2}'`).toString().trim();
};

const kill = (pid: string) => {
    if (process.platform === 'win32') {
        try {
            execSync(`taskkill /F /PID ${pid}`);
        } catch (e) {
            // Ignore
        }
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
server.connect(transport).then(() => {
    console.error('[MCP] Connected');
}).catch((e) => {
    console.error('[MCP] Error', e);
    process.exit(1);
});

// Clean up on exit
process.stdin.on('close', () => {
    server.close().finally(() => {
        console.error('[MCP] Closed');
        wss.close();
        process.exit(0);
    });
});

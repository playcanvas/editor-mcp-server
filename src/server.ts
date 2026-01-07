import { execSync } from 'child_process';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListPromptsRequestSchema, ListResourcesRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { register as registerAsset } from './tools/asset';
import { register as registerAssetMaterial } from './tools/assets/material';
import { register as registerAssetScript } from './tools/assets/script';
import { register as registerEntity } from './tools/entity';
import { register as registerScene } from './tools/scene';
import { register as registerStore } from './tools/store';
import { register as registerViewport } from './tools/viewport';
import { WSS } from './wss';

const PORT = parseInt(process.env.PORT || '52000', 10);

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
            // /F = force, /T = tree kill (kills child processes too)
            execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
        } catch (e) {
            // Ignore - process may already be dead
        }
        return;
    }
    try {
        execSync(`kill -9 ${pid}`);
    } catch (e) {
        // Ignore - process may already be dead
    }
};

// Kill any existing server on the port
const pid = findPid(PORT);
if (pid && pid !== String(process.pid)) {
    kill(pid);
    await poll(() => !findPid(PORT));
}

// Create a WebSocket server
const wss = new WSS(PORT);

// Create an MCP server
const mcp = new McpServer({
    name: 'PlayCanvas',
    version: '1.0.0'
}, {
    capabilities: {
        tools: {},
        resources: {},
        prompts: {}
    }
});
mcp.server.setRequestHandler(ListResourcesRequestSchema, () => ({ resources: [] }));
mcp.server.setRequestHandler(ListPromptsRequestSchema, () => ({ prompts: [] }));

// Tools
registerEntity(mcp, wss);
registerAsset(mcp, wss);
registerAssetMaterial(mcp, wss);
registerAssetScript(mcp, wss);
registerScene(mcp, wss);
registerStore(mcp, wss);
registerViewport(mcp, wss);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
mcp.connect(transport).then(() => {
    console.error('[MCP] Listening');
}).catch((e) => {
    console.error('[MCP] Error', e);
    process.exit(1);
});

const close = () => {
    mcp.close().finally(() => {
        console.error('[MCP] Closed');
        wss.close();
        process.exit(0);
    });
};

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
    console.error('[process] Uncaught exception', err);
    console.error('[process] Stack:', err.stack);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[process] Unhandled rejection at:', promise);
    console.error('[process] Reason:', reason);
});
process.on('exit', (code) => {
    console.error('[process] Exit with code:', code);
});

// Clean up on exit
process.stdin.on('close', () => {
    console.error('[process] stdin closed');
    close();
});
process.on('SIGINT', () => {
    console.error('[process] SIGINT');
    close();
});
process.on('SIGTERM', () => {
    console.error('[process] SIGTERM');
    close();
});
process.on('SIGQUIT', () => {
    console.error('[process] SIGQUIT');
    close();
});

import child_process, { execSync } from 'child_process';
import net from 'net';

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
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second

/**
 * Check if a port is in use
 */
function isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer()
        .once('error', () => {
            // Port is in use
            resolve(true);
        })
        .once('listening', () => {
            // Port is free
            server.close();
            resolve(false);
        })
        .listen(port);
    });
}

/**
 * Kill any process using the specified port
 */
function killProcessOnPort(port: number): void {
    if (process.platform === 'win32') {
        const cmd = `netstat -ano | findstr 0.0.0.0:${port}`;
        const proc = child_process.spawnSync('cmd', ['/c', cmd], { shell: true });
        const pid = proc.stdout.toString().replace(/\s+/g, ' ').trim().split(' ').pop();
        if (pid) {
            child_process.spawnSync('taskkill', ['/F', '/PID', pid, '/T']);
        }
    } else {
        // Kill any process using the port
        try {
            execSync(`lsof -ti :${port} | xargs kill -9`);
        } catch (err) {
            // Do nothing
        }
    }
}

/**
 * Sleep for a specified amount of time
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * Try to create a WSS server on the specified port
 */
async function tryCreateServer(): Promise<WSS | null> {
    // Check if port is in use
    const portInUse = await isPortInUse(PORT);

    if (portInUse) {
        console.log(`Port ${PORT} is busy. Attempting to free it...`);
        // Kill any process using the port
        killProcessOnPort(PORT);
        return null;
    }

    // Port is free, create the server
    console.log(`Port ${PORT} is available. Starting server...`);
    return new WSS(PORT);
}

/**
 * Initialize the WebSocket server with retry logic using a recursive approach
 */
async function initializeServer(retriesLeft = MAX_RETRIES): Promise<WSS> {
    if (retriesLeft <= 0) {
        throw new Error(`Failed to start server: Port ${PORT} is still in use after ${MAX_RETRIES} attempts.`);
    }

    const server = await tryCreateServer();

    if (server) {
        return server;
    }

    // Wait before trying again
    await sleep(RETRY_DELAY);

    // Recursively try again with one less retry
    return initializeServer(retriesLeft - 1);
}

// Start the server
(async () => {
    // Create a WebSocket server with retry logic
    const wss = await initializeServer();

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
})().catch((err) => {
    console.error('Server initialization failed:', err);
    process.exit(1);
});

import { execSync } from 'child_process';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListPromptsRequestSchema, ListResourcesRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { register as registerAsset } from './tools/asset';
import { register as registerAssetMaterial } from './tools/assets/material';
import { register as registerAssetScript } from './tools/assets/script';
import { register as registerEntity } from './tools/entity';
import { register as registerRuntime } from './tools/runtime';
import { register as registerScene } from './tools/scene';
import { register as registerStore } from './tools/store';
import { register as registerViewport } from './tools/viewport';
import { WSS } from './wss';

const PORT = parseInt(process.env.PORT || '52000', 10);

// Return the *deduped* list of PIDs listening on the port. A single process can
// produce multiple lsof/netstat lines (e.g. IPv4 + IPv6), so we must dedupe —
// otherwise a multi-line result would break the kill command and deadlock.
const findPids = (port: number): string[] => {
    try {
        const cmd = process.platform === 'win32' ?
            `netstat -ano | findstr :${port}` :
            `lsof -nP -iTCP:${port} -sTCP:LISTEN -t`;
        const lines = execSync(cmd).toString().split('\n');
        const pids = lines.map(line => line.trim().split(/\s+/).pop() || '').filter(p => /^\d+$/.test(p));
        return Array.from(new Set(pids));
    } catch {
        // No listener (lsof/netstat exit non-zero when nothing matches).
        return [];
    }
};

const kill = (pid: string) => {
    if (process.platform === 'win32') {
        try {
            // /F = force, /T = tree kill (kills child processes too)
            execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
        } catch {
            // Ignore - process may already be dead
        }
        return;
    }
    try {
        execSync(`kill -9 ${pid}`);
    } catch {
        // Ignore - process may already be dead
    }
};

const own = String(process.pid);
const stale = () => findPids(PORT).filter(p => p !== own);

// Wait — with a bounded timeout so startup never hangs — for the port to free up.
const waitForPortFree = (timeoutMs: number) => {
    const deadline = Date.now() + timeoutMs;
    return new Promise<void>((resolve) => {
        const tick = () => {
            if (!stale().length || Date.now() >= deadline) {
                resolve();
                return;
            }
            setTimeout(tick, 250);
        };
        tick();
    });
};

// Kill any existing server on the port (excluding ourselves) before binding.
const existing = stale();
if (existing.length) {
    console.error('[process] Killing stale process(es) on port', PORT, existing.join(', '));
    existing.forEach(kill);
    await waitForPortFree(5000);
    if (stale().length) {
        console.error('[process] Port', PORT, 'still in use after timeout; attempting to listen anyway');
    }
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
registerRuntime(mcp, wss);

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

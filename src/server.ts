import { execSync } from 'child_process';
import { readFileSync } from 'fs';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListPromptsRequestSchema, ListResourcesRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { WebSocket } from 'ws';

import { register as registerAsset } from './tools/asset.ts';
import { register as registerAssetMaterial } from './tools/assets/material.ts';
import { register as registerAssetScript } from './tools/assets/script.ts';
import { register as registerEntity } from './tools/entity.ts';
import { register as registerRuntime } from './tools/runtime.ts';
import { register as registerScene } from './tools/scene.ts';
import { register as registerStore } from './tools/store.ts';
import { register as registerViewport } from './tools/viewport.ts';
import { WSS } from './wss.ts';

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

// Ask whoever currently owns the port to gracefully hand it off, so the *newest*
// (active) client ends up controlling the editor. The owner releases the port
// without exiting, so its MCP client doesn't restart it — no kill/restart storm.
const requestYield = (port: number, timeoutMs: number) => {
    return new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
            if (!settled) {
                settled = true;
                resolve();
            }
        };
        let ws: WebSocket;
        try {
            ws = new WebSocket(`ws://127.0.0.1:${port}`);
        } catch {
            done();
            return;
        }
        const timer = setTimeout(() => {
            try {
                ws.close();
            } catch { /* noop */ }
            done();
        }, timeoutMs);
        ws.on('open', () => {
            try {
                ws.send(JSON.stringify({ yield: true }));
            } catch { /* noop */ }
        });
        ws.on('close', () => {
            clearTimeout(timer);
            done();
        });
        ws.on('error', () => {
            clearTimeout(timer);
            done();
        });
    });
};

// Take over the port from any existing instance so the active client controls
// the editor. Prefer a graceful handoff (no killing); fall back to reclaiming
// the port only if the current owner won't yield (old build, orphan, or hung).
const existing = stale();
if (existing.length) {
    if (process.env.MCP_TAKEOVER === '1') {
        console.error('[process] MCP_TAKEOVER=1: killing process(es) on port', PORT, existing.join(', '));
        existing.forEach(kill);
        await waitForPortFree(5000);
    } else {
        console.error('[process] Port', PORT, 'in use; requesting graceful handoff from the current owner');
        await requestYield(PORT, 1500);
        await waitForPortFree(3000);
        if (stale().length) {
            console.error('[process] No handoff; reclaiming port', PORT, 'from', stale().join(', '));
            stale().forEach(kill);
            await waitForPortFree(5000);
        }
    }
    if (stale().length) {
        console.error('[process] Port', PORT, 'still in use after timeout; will stand by and retry');
    }
}

// Create a WebSocket server
const wss = new WSS(PORT);

// Works from both src/server.ts and the bundled dist/server.mjs — each sits
// one level below package.json.
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));

// Create an MCP server
const mcp = new McpServer({
    name: 'PlayCanvas',
    version: pkg.version
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
process.stdin.on('end', () => {
    console.error('[process] stdin ended');
    close();
});

// If our parent process dies we get reparented to init (ppid 1). That means our
// MCP client/launcher is gone but we were left running — the main way stale
// servers pile up and keep hogging the port. Detect it and exit so the port is
// released for the active client instead of lingering as an orphan.
if (process.platform !== 'win32') {
    const parentWatch = setInterval(() => {
        if (process.ppid === 1) {
            console.error('[process] Parent gone (reparented to init); exiting to release the port');
            clearInterval(parentWatch);
            close();
        }
    }, 2000);
    parentWatch.unref();
}
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

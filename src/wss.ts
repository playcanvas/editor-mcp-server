import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { WebSocketServer, WebSocket } from 'ws';

const PING_DELAY = 1000;

const DEFAULT_TIMEOUT = 60_000;

// How often a standby instance retries binding the port. Multiple MCP clients
// (agents) each run their own server; only one can own the port and talk to the
// editor at a time. The others stand by and take over when the owner exits.
const BIND_RETRY_DELAY = 3_000;

/**
 * Metadata attached to every tool response. `status`/`message` describe the
 * outcome; the pagination fields describe a list slice. Everything lives under
 * `meta` so it never collides with business data in `data`.
 */
export type Meta = {
    tool: string;
    status: 'ok' | 'error';
    message?: string;
    total?: number;
    count?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
    [key: string]: unknown;
};

/**
 * The unified response envelope shared by every tool. Agents pattern-match on
 * the *shape* of a response, so keeping this identical across all tools removes
 * a major source of hallucinated field access.
 *
 * - `data` is always present; an empty result set is `[]`, never an error.
 * - errors live in `meta.status`/`meta.message` (never a top-level `error`).
 */
export type Envelope<T = unknown> = {
    data: T | null;
    meta: Meta;
};

/**
 * The raw payload returned by an extension method over the websocket.
 */
type RawResult = {
    data?: unknown;
    error?: string;
    meta?: Record<string, unknown>;
};

/**
 * Connection roles. The editor peer handles edit-time methods (entities,
 * assets, viewport, launch control). The runtime peer is the injected launch
 * page that handles `runtime:*` methods (capture, logs, etc.).
 */
type Role = 'editor' | 'runtime';

class WSS {
    private _server!: WebSocketServer;

    private _sockets: Record<Role, WebSocket | undefined> = { editor: undefined, runtime: undefined };

    private _callbacks = new Map<number, (res: RawResult) => void>();

    private _id = 0;

    private _pingInterval: ReturnType<typeof setInterval> | null = null;

    private _port: number;

    private _listening = false;

    private _bindTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(port: number) {
        this._port = port;
        this._bind();
    }

    /**
     * Try to own the port. If another MCP server instance already owns it
     * (EADDRINUSE), don't kill it and don't give up — stand by and retry, so
     * whoever currently owns the editor connection stays stable and we take
     * over automatically once they exit. This is what keeps multiple concurrent
     * agent MCP clients from fighting over the port.
     */
    private _bind() {
        const server = new WebSocketServer({ port: this._port });
        this._server = server;
        server.on('listening', () => {
            this._listening = true;
            console.error('[WSS] Listening on port', this._port);
        });
        server.on('error', (err: Error & { code?: string }) => {
            if (err.code === 'EADDRINUSE') {
                this._listening = false;
                console.error(`[WSS] Port ${this._port} is owned by another MCP server instance; standing by and retrying (only one instance controls the editor at a time).`);
                try {
                    server.close();
                } catch { /* already closing */ }
                if (this._bindTimer) {
                    clearTimeout(this._bindTimer);
                }
                this._bindTimer = setTimeout(() => this._bind(), BIND_RETRY_DELAY);
            } else {
                console.error('[WSS] Server error', err);
            }
        });
        this._attachConnectionHandler(server);
    }

    private _attachConnectionHandler(server: WebSocketServer) {
        // The `connection` listener is attached once per server instance and
        // lives for its whole life; it must NOT be re-added per disconnect (that
        // leaks listeners and double-handles messages).
        server.on('connection', (ws) => {
            // Default new peers to the editor role so clients that don't send a
            // `{ register }` handshake (e.g. older extension builds) still work.
            // A `{ register }` message can reassign the socket — notably the
            // launch page registers itself as 'runtime'.
            let role: Role = 'editor';
            if (!this._sockets.editor) {
                this._sockets.editor = ws;
                this._startPing();
            }
            console.error('[WSS] Peer connected (assumed editor; awaiting registration)');
            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.register === 'editor' || msg.register === 'runtime') {
                        const newRole: Role = msg.register;
                        // Vacate the optimistic slot if we're switching roles.
                        if (newRole !== role && this._sockets[role] === ws) {
                            this._sockets[role] = undefined;
                        }
                        role = newRole;
                        this._sockets[role] = ws;
                        console.error('[WSS] Registered', role);
                        if (role === 'editor') {
                            this._startPing();
                        }
                        return;
                    }
                    const { id, res } = msg;
                    const cb = this._callbacks.get(id);
                    if (cb) {
                        cb(res);
                        this._callbacks.delete(id);
                    }
                } catch (e) {
                    console.error('[WSS]', e);
                }
            });
            ws.on('close', () => {
                if (this._sockets[role] === ws) {
                    this._sockets[role] = undefined;
                    console.error('[WSS] Disconnected', role);
                    if (role === 'editor' && this._pingInterval) {
                        clearInterval(this._pingInterval);
                        this._pingInterval = null;
                    }
                }
            });
            // A socket 'error' with no listener is re-thrown by `ws` as an
            // uncaught exception. With the runtime peer reconnecting frequently
            // and abrupt tab closes, that would otherwise destabilise the whole
            // process. Handle it and let the 'close' that follows free the slot.
            ws.on('error', (err: Error) => {
                console.error('[WSS] Socket error', role, err?.message ?? err);
                try {
                    ws.close();
                } catch { /* already closing */ }
            });
        });
    }

    private _startPing() {
        if (this._pingInterval) {
            clearInterval(this._pingInterval);
            this._pingInterval = null;
        }
        this._pingInterval = setInterval(() => {
            const editor = this._sockets.editor;
            // Self-heal: if there is no live editor (e.g. a peer that grabbed the
            // slot optimistically turned out to be the runtime, or the editor
            // vanished), stop the loop instead of pinging into the void every
            // second. A fresh editor connection restarts it.
            if (!editor || editor.readyState !== WebSocket.OPEN) {
                if (this._pingInterval) {
                    clearInterval(this._pingInterval);
                    this._pingInterval = null;
                }
                return;
            }
            this._send('ping').catch(() => { /* ping failures are non-fatal */ });
        }, PING_DELAY);
    }

    /**
     * Whether a live runtime (launch) peer is currently connected.
     *
     * @returns True if the runtime socket is open.
     */
    hasRuntime(): boolean {
        return this._sockets.runtime?.readyState === WebSocket.OPEN;
    }

    /**
     * Wait for a runtime (launch) peer to connect, up to a timeout.
     *
     * @param timeoutMs - Maximum time to wait in milliseconds.
     * @returns Resolves true once the runtime is connected, false on timeout.
     */
    waitForRuntime(timeoutMs: number): Promise<boolean> {
        const start = Date.now();
        return new Promise((resolve) => {
            const check = () => {
                if (this.hasRuntime()) {
                    resolve(true);
                    return;
                }
                if (Date.now() - start >= timeoutMs) {
                    resolve(false);
                    return;
                }
                setTimeout(check, 250);
            };
            check();
        });
    }

    private _send(name: string, ...args: unknown[]) {
        // `runtime:*` methods go to the launch page; everything else (including
        // `launch:*` control + `ping`) goes to the editor page.
        const role: Role = name.startsWith('runtime:') ? 'runtime' : 'editor';
        const socket = this._sockets[role];
        return new Promise<RawResult>((resolve, reject) => {
            const id = this._id++;
            if (!socket) {
                if (role === 'runtime') {
                    reject(new Error('No running instance connected. Call launch_start first (and allow popups for the editor); the launched page connects back automatically.'));
                } else if (!this._listening) {
                    reject(new Error(`This MCP server is on standby because another instance owns port ${this._port} (only one instance can control the editor at a time). Close the other MCP client/instance, or start this one with MCP_TAKEOVER=1 to force takeover, then retry.`));
                } else {
                    reject(new Error('Editor not connected. Open the PlayCanvas Editor in Chrome and click CONNECT in the MCP extension popup, then retry.'));
                }
                return;
            }
            if (socket.readyState !== WebSocket.OPEN) {
                reject(new Error(`${role === 'runtime' ? 'Runtime' : 'Editor'} socket not open. Reconnect (or re-run launch_start) and retry.`));
                return;
            }
            const timer = setTimeout(() => {
                this._callbacks.delete(id);
                reject(new Error(`Timed out after ${DEFAULT_TIMEOUT}ms waiting for the ${role} to handle '${name}'. It may be busy or disconnected; verify the connection and retry, or split the request into smaller calls.`));
            }, DEFAULT_TIMEOUT);
            this._callbacks.set(id, (res: RawResult) => {
                clearTimeout(timer);
                resolve(res);
            });
            try {
                socket.send(JSON.stringify({ id, name, args }));
            } catch (err) {
                clearTimeout(timer);
                this._callbacks.delete(id);
                reject(err instanceof Error ? err : new Error(String(err)));
            }
        });
    }

    /**
     * Wrap a business payload (or error) in the unified envelope and produce an
     * MCP text response.
     *
     * @param name - The websocket method name surfaced in `meta.tool`.
     * @param raw - The raw payload from the extension, or null on transport error.
     * @param errorMessage - An overriding error message (e.g. a transport failure).
     * @returns The MCP tool response.
     */
    private _wrap(name: string, raw: RawResult | null, errorMessage?: string): CallToolResult {
        const isError = !!errorMessage || !!raw?.error;
        const meta: Meta = {
            tool: name,
            status: isError ? 'error' : 'ok'
        };
        if (isError) {
            meta.message = errorMessage ?? raw?.error;
        }
        if (raw?.meta) {
            Object.assign(meta, raw.meta);
        }
        const envelope: Envelope = {
            data: isError ? null : (raw?.data ?? null),
            meta
        };
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(envelope)
            }],
            ...(isError ? { isError: true } : {})
        };
    }

    /**
     * Send a raw method to a peer and return its unwrapped payload. Useful when
     * a tool needs to post-process the result before wrapping it.
     *
     * @param name - The method name (routed by prefix).
     * @param args - The method arguments.
     * @returns The raw payload from the peer.
     */
    raw(name: string, ...args: unknown[]): Promise<RawResult> {
        return this._send(name, ...args);
    }

    /**
     * Build a success MCP response in the unified envelope.
     *
     * @param name - The websocket method name surfaced in `meta.tool`.
     * @param data - The business payload.
     * @param meta - Optional extra meta fields.
     * @returns The MCP tool response.
     */
    ok(name: string, data: unknown, meta?: Record<string, unknown>): CallToolResult {
        return this._wrap(name, { data, meta });
    }

    /**
     * Build an error MCP response in the unified envelope.
     *
     * @param name - The websocket method name surfaced in `meta.tool`.
     * @param message - The actionable error message.
     * @returns The MCP tool response.
     */
    fail(name: string, message: string): CallToolResult {
        return this._wrap(name, null, message);
    }

    async call(name: string, ...args: unknown[]): Promise<CallToolResult> {
        try {
            const raw = await this._send(name, ...args);
            return this._wrap(name, raw);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return this._wrap(name, null, message);
        }
    }

    async callImage(name: string, ...args: unknown[]): Promise<CallToolResult> {
        try {
            const raw = await this._send(name, ...args);
            if (raw.error) {
                return this._wrap(name, raw);
            }
            if (!raw.data || typeof raw.data !== 'string') {
                return this._wrap(name, null, 'No image data received. Ensure a scene is loaded and the viewport has rendered at least one frame, then retry.');
            }
            const mimeType = (raw.meta?.mimeType as string) || 'image/webp';
            // Image tools still return a protocol image block, but attach a
            // parallel text block carrying the same meta so that "all metadata
            // lives in meta" holds for every tool (issue #11).
            const meta: Meta = { tool: name, status: 'ok', ...(raw.meta || {}) };
            return {
                content: [
                    {
                        type: 'image',
                        data: raw.data,
                        mimeType
                    },
                    {
                        type: 'text',
                        text: JSON.stringify({ data: null, meta })
                    }
                ]
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return this._wrap(name, null, message);
        }
    }

    close() {
        if (this._pingInterval) {
            clearInterval(this._pingInterval);
        }
        if (this._bindTimer) {
            clearTimeout(this._bindTimer);
            this._bindTimer = null;
        }
        this._listening = false;
        (['editor', 'runtime'] as Role[]).forEach((role) => {
            this._sockets[role]?.close(1000, 'FORCE');
            this._sockets[role] = undefined;
        });
        this._server.close();
        console.error('[WSS] Closed');
    }
}

export { WSS };

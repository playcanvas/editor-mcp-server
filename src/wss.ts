import { WebSocketServer, WebSocket } from 'ws';

const PING_DELAY = 1000;

const DEFAULT_TIMEOUT = 30_000;

/**
 * Metadata attached to every tool response. `_status`/`_message` are
 * underscore-prefixed so agents read them as metadata, not as business data.
 */
export type Meta = {
    tool: string;
    _status: 'ok' | 'error';
    _message?: string;
    total?: number;
    count?: number;
    _has_more?: boolean;
    _next_cursor?: string | null;
    [key: string]: unknown;
};

/**
 * The unified response envelope shared by every tool. Agents pattern-match on
 * the *shape* of a response, so keeping this identical across all tools removes
 * a major source of hallucinated field access.
 *
 * - `data` is always present; an empty result set is `[]`, never an error.
 * - errors live in `meta._status`/`meta._message` (never a top-level `error`).
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
    private _server: WebSocketServer;

    private _sockets: Record<Role, WebSocket | undefined> = { editor: undefined, runtime: undefined };

    private _callbacks = new Map();

    private _id = 0;

    private _pingInterval: ReturnType<typeof setInterval> | null = null;

    constructor(port: number) {
        this._server = new WebSocketServer({ port });
        this._server.on('listening', () => console.error('[WSS] Listening on port', port));
        this._server.on('error', (err: Error & { code?: string }) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`[WSS] Port ${port} already in use. Stop the other MCP server (or set a different PORT) and restart.`);
            } else {
                console.error('[WSS] Server error', err);
            }
        });
        this._waitForSocket();
    }

    private _waitForSocket() {
        // The `connection` listener is attached once and lives for the whole
        // server; it must NOT be re-added per disconnect (that leaks listeners
        // and double-handles messages).
        this._server.on('connection', (ws) => {
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
                    if (this._callbacks.has(id)) {
                        this._callbacks.get(id)(res);
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
        });
    }

    private _startPing() {
        if (this._pingInterval) {
            clearInterval(this._pingInterval);
        }
        this._pingInterval = setInterval(() => {
            this._send('ping').then(() => console.error('[WSS] Ping')).catch(() => {});
        }, PING_DELAY);
    }

    /**
     * Whether a live runtime (launch) peer is currently connected.
     *
     * @returns {boolean} True if the runtime socket is open.
     */
    hasRuntime(): boolean {
        return this._sockets.runtime?.readyState === WebSocket.OPEN;
    }

    /**
     * Wait for a runtime (launch) peer to connect, up to a timeout.
     *
     * @param {number} timeoutMs - Maximum time to wait in milliseconds.
     * @returns {Promise<boolean>} Resolves true once the runtime is connected, false on timeout.
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

    private _send(name: string, ...args: any[]) {
        // `runtime:*` methods go to the launch page; everything else (including
        // `launch:*` control + `ping`) goes to the editor page.
        const role: Role = name.startsWith('runtime:') ? 'runtime' : 'editor';
        const socket = this._sockets[role];
        return new Promise<RawResult>((resolve, reject) => {
            const id = this._id++;
            if (!socket) {
                if (role === 'runtime') {
                    reject(new Error('No running instance connected. Call launch_start first (and allow popups for the editor); the launched page connects back automatically.'));
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
            socket.send(JSON.stringify({ id, name, args }));
        });
    }

    /**
     * Wrap a business payload (or error) in the unified envelope and produce an
     * MCP text response.
     *
     * @param {string} tool - The public tool name surfaced in `meta.tool`.
     * @param {RawResult | null} raw - The raw payload from the extension, or null on transport error.
     * @param {string} [errorMessage] - An overriding error message (e.g. a transport failure).
     * @returns {{ content: any[], isError?: boolean }} The MCP tool response.
     */
    private _wrap(tool: string, raw: RawResult | null, errorMessage?: string): { content: any[], isError?: boolean } {
        const isError = !!errorMessage || !!raw?.error;
        const meta: Meta = {
            tool,
            _status: isError ? 'error' : 'ok'
        };
        if (isError) {
            meta._message = errorMessage ?? raw?.error;
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
     * @param {string} name - The method name (routed by prefix).
     * @param {...any} args - The method arguments.
     * @returns {Promise<RawResult>} The raw payload from the peer.
     */
    raw(name: string, ...args: any[]): Promise<RawResult> {
        return this._send(name, ...args);
    }

    /**
     * Build a success MCP response in the unified envelope.
     *
     * @param {string} tool - The public tool name.
     * @param {unknown} data - The business payload.
     * @param {Record<string, unknown>} [meta] - Optional extra meta fields.
     * @returns {{ content: any[], isError?: boolean }} The MCP tool response.
     */
    ok(tool: string, data: unknown, meta?: Record<string, unknown>): { content: any[], isError?: boolean } {
        return this._wrap(tool, { data, meta });
    }

    /**
     * Build an error MCP response in the unified envelope.
     *
     * @param {string} tool - The public tool name.
     * @param {string} message - The actionable error message.
     * @returns {{ content: any[], isError?: boolean }} The MCP tool response.
     */
    fail(tool: string, message: string): { content: any[], isError?: boolean } {
        return this._wrap(tool, null, message);
    }

    async call(tool: string, name: string, ...args: any[]): Promise<{ content: any[], isError?: boolean }> {
        try {
            const raw = await this._send(name, ...args);
            return this._wrap(tool, raw);
        } catch (err: any) {
            return this._wrap(tool, null, err.message);
        }
    }

    async callImage(tool: string, name: string, ...args: any[]): Promise<{ content: any[], isError?: boolean }> {
        try {
            const raw = await this._send(name, ...args);
            if (raw.error) {
                return this._wrap(tool, raw);
            }
            if (!raw.data || typeof raw.data !== 'string') {
                return this._wrap(tool, null, 'No image data received. Ensure a scene is loaded and the viewport has rendered at least one frame, then retry.');
            }
            const mimeType = (raw.meta?.mimeType as string) || 'image/webp';
            // Image tools still return a protocol image block, but attach a
            // parallel text block carrying the same meta so that "all metadata
            // lives in meta" holds for every tool (issue #11).
            const meta: Meta = { tool, _status: 'ok', ...(raw.meta || {}) };
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
        } catch (err: any) {
            return this._wrap(tool, null, err.message);
        }
    }

    close() {
        if (this._pingInterval) {
            clearInterval(this._pingInterval);
        }
        (['editor', 'runtime'] as Role[]).forEach((role) => {
            this._sockets[role]?.close(1000, 'FORCE');
            this._sockets[role] = undefined;
        });
        this._server.close();
        console.error('[WSS] Closed');
    }
}

export { WSS };

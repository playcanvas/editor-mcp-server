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

class WSS {
    private _server: WebSocketServer;

    private _socket?: WebSocket;

    private _callbacks = new Map();

    private _id = 0;

    private _pingInterval: ReturnType<typeof setInterval> | null = null;

    constructor(port: number) {
        this._server = new WebSocketServer({ port });
        console.error('[WSS] Listening on port', port);
        this._waitForSocket();
    }

    private _waitForSocket() {
        this._server.on('connection', (ws) => {
            if (this._socket) {
                return;
            }
            console.error('[WSS] Connected');
            ws.on('message', (data) => {
                try {
                    const { id, res } = JSON.parse(data.toString());
                    if (this._callbacks.has(id)) {
                        this._callbacks.get(id)(res);
                        this._callbacks.delete(id);
                    }
                } catch (e) {
                    console.error('[WSS]', e);
                }
            });
            ws.on('close', (_code, reason) => {
                console.error('[WSS] Disconnected');
                this._socket = undefined;
                if (reason.toString() !== 'FORCE') {
                    this._waitForSocket();
                }
            });

            this._socket = ws;

            if (this._pingInterval) {
                clearInterval(this._pingInterval);
            }
            this._pingInterval = setInterval(() => {
                this._send('ping').then(() => console.error('[WSS] Ping')).catch(() => {});
            }, PING_DELAY);
        });
    }

    private _send(name: string, ...args: any[]) {
        return new Promise<RawResult>((resolve, reject) => {
            const id = this._id++;
            if (!this._socket) {
                reject(new Error('Editor not connected. Open the PlayCanvas Editor in Chrome and click CONNECT in the MCP extension popup, then retry.'));
                return;
            }
            if (this._socket.readyState !== WebSocket.OPEN) {
                reject(new Error('Editor socket not open. Reconnect via the MCP extension popup, then retry.'));
                return;
            }
            const timer = setTimeout(() => {
                this._callbacks.delete(id);
                reject(new Error(`Timed out after ${DEFAULT_TIMEOUT}ms waiting for the editor to handle '${name}'. The editor may be busy or disconnected; verify the connection and retry, or split the request into smaller calls.`));
            }, DEFAULT_TIMEOUT);
            this._callbacks.set(id, (res: RawResult) => {
                clearTimeout(timer);
                resolve(res);
            });
            this._socket.send(JSON.stringify({ id, name, args }));
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
        if (this._socket) {
            this._socket.close(1000, 'FORCE');
        }
        this._server.close();
        console.error('[WSS] Closed');
    }
}

export { WSS };

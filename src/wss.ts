import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { WebSocketServer, WebSocket } from 'ws';

const PING_DELAY = 1000;

type Reply = { data?: unknown, error?: string };

class WSS {
    private _server: WebSocketServer;

    private _socket?: WebSocket;

    private _callbacks = new Map<number, (res: Reply) => void>();

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
                    const { id, res } = JSON.parse(data.toString()) as { id: number, res: Reply };
                    const cb = this._callbacks.get(id);
                    if (cb) {
                        cb(res);
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
                this.call('ping').then(() => console.error('[WSS] Ping'));
            }, PING_DELAY);
        });
    }

    private _send(name: string, ...args: unknown[]) {
        return new Promise<Reply>((resolve, reject) => {
            const id = this._id++;
            this._callbacks.set(id, resolve);
            if (!this._socket) {
                reject(new Error('No socket'));
                return;
            }
            if (this._socket.readyState !== WebSocket.OPEN) {
                reject(new Error('Socket not open'));
                return;
            }
            this._socket.send(JSON.stringify({ id, name, args }));
        });
    }

    async call(name: string, ...args: unknown[]): Promise<CallToolResult> {
        try {
            const { data, error } = await this._send(name, ...args);
            if (error) {
                throw new Error(error);
            }
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(data)
                }]
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{
                    type: 'text',
                    text: message
                }],
                isError: true
            };
        }
    }

    async callImage(name: string, ...args: unknown[]): Promise<CallToolResult> {
        try {
            const { data, error } = await this._send(name, ...args);
            if (error) {
                throw new Error(error);
            }
            return {
                content: [{
                    type: 'image',
                    data: String(data),
                    mimeType: 'image/jpeg'
                }]
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{
                    type: 'text',
                    text: message
                }],
                isError: true
            };
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

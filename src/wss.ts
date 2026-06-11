import { WebSocketServer, WebSocket } from 'ws';

const PING_DELAY = 1000;
const DEFAULT_TIMEOUT = 30_000;

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
                this.call('ping').then(() => console.error('[WSS] Ping'));
            }, PING_DELAY);
        });
    }

    private _send(name: string, ...args: any[]) {
        return new Promise<{ data?: any, error?: string, mimeType?: string }>((resolve, reject) => {
            if (!this._socket) {
                reject(new Error('No socket'));
                return;
            }
            if (this._socket.readyState !== WebSocket.OPEN) {
                reject(new Error('Socket not open'));
                return;
            }
            const id = this._id++;
            const timer = setTimeout(() => {
                this._callbacks.delete(id);
                reject(new Error(`[WSS] Timeout: '${name}' after ${DEFAULT_TIMEOUT}ms`));
            }, DEFAULT_TIMEOUT);
            this._callbacks.set(id, (res: any) => {
                clearTimeout(timer);
                resolve(res);
            });
            try {
                this._socket.send(JSON.stringify({ id, name, args }));
            } catch (err: any) {
                clearTimeout(timer);
                this._callbacks.delete(id);
                reject(new Error(`[WSS] Send failed: ${err.message}`));
            }
        });
    }

    async call(name: string, ...args: any[]): Promise<{ content: any[], isError?: boolean }> {
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
        } catch (err: any) {
            return {
                content: [{
                    type: 'text',
                    text: err.message
                }],
                isError: true
            };
        }
    }

    async callImage(name: string, ...args: any[]): Promise<{ content: any[], isError?: boolean }> {
        try {
            const { data, error, mimeType } = await this._send(name, ...args);
            if (error) {
                throw new Error(error);
            }
            if (!data || typeof data !== 'string' || data.trim().length === 0) {
                throw new Error('No image data received — viewport may be empty or not yet rendered');
            }
            return {
                content: [{
                    type: 'image',
                    data: data,
                    mimeType: mimeType || 'image/png'
                }]
            };
        } catch (err: any) {
            return {
                content: [{
                    type: 'text',
                    text: err.message
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

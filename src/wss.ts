import { WebSocketServer, type WebSocket } from 'ws';

class WSS {
    private _server: WebSocketServer;

    private _socket?: WebSocket;

    private _callbacks = new Map();

    private _id = 0;

    private _debug = false;

    constructor(port: number, debug = false) {
        try {
            this._server = new WebSocketServer({ port });
        } catch (e) {
            console.error('[WSS] Failed to create server', e);
        }
        this._debug = debug;
        this._waitForSocket();
    }

    private _log(...args: any) {
        if (this._debug) {
            console.log(...arguments);
        }
    }

    private _waitForSocket() {
        this._server.on('connection', (ws) => {
            if (this._socket) {
                return;
            }
            this._log('[WSS] Connected');
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
            ws.on('close', () => {
                this._log('[WSS] Disconnected');
                this._socket = undefined;
                this._waitForSocket();
            });

            this._socket = ws;
        });
    }

    private _send(name: string, ...args: any[]) {
        return new Promise<{ data?: any, error?: string }>((resolve, reject) => {
            const id = this._id++;
            this._callbacks.set(id, resolve);
            if (!this._socket) {
                reject(new Error('No socket'));
                return;
            }
            this._socket.send(JSON.stringify({ id, name, args }));
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
}

export { WSS };

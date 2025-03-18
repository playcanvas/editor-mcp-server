class WSC {
    _ws;

    _methods = new Map();

    constructor(address) {
        this._ws = new WebSocket(address);
        this._ws.onopen = () => {
            console.log('[WSC] Connected to:', address);
        };
        this._ws.onmessage = (event) => {
            try {
                const { id, name, args } = JSON.parse(event.data);
                const res = this._methods.get(name)?.(...args);
                this._ws.send(JSON.stringify({ id, res }));
            } catch (e) {
                console.error('[WSC]', e);
            }
        };
        this._ws.onclose = () => {
            console.log('[WSC] Disconnected from:', address);
        };
    }

    /**
     * @param {string} name - The name of the method to add.
     * @param {Function} fn - The function to call when the method is called.
     */
    method(name, fn) {
        if (this._methods.get(name)) {
            throw new Error(`[WSC] method '${name}' already registered`);
        }
        this._methods.set(name, fn);
    }

    /**
     * @param {string} name - The name of the method to call.
     * @param {...*} args - The arguments to pass to the method.
     * @returns {*} The return value of the method.
     */
    call(name, ...args) {
        return this._methods.get(name)?.(...args);
    }
}

const wsc = window.wsc = new WSC('ws://localhost:52000');
wsc.method('ping', () => 'pong');
wsc.method('entity:create', (name) => {
    const entity = window.editor.api.globals.entities.create({ name });
    if (!entity) {
        return undefined;
    }
    return entity.observer.json();
});

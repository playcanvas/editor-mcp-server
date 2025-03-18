class WSC {
    _ws;

    _methods = new Map();

    constructor(address) {
        this._connect(address);
    }

    /**
     * @param {string} address - The address to connect to.
     */
    _connect(address, retryTimeout = 3000) {
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
            setTimeout(() => this._connect(address), retryTimeout);
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

// general
wsc.method('ping', () => 'pong');

// entities
wsc.method('entity:create', (name) => {
    const entity = window.editor.api.globals.entities.create({ name });
    if (!entity) {
        return undefined;
    }
    return entity.json();
});
wsc.method('entity:delete', (id) => {
    const entity = window.editor.api.globals.entities.get(id);
    if (!entity) {
        return undefined;
    }
    window.editor.api.globals.entities.delete(entity);
    return true;
});
wsc.method('entity:list', () => {
    return window.editor.api.globals.entities.list().map(entity => entity.json());
});
wsc.method('entity:position:set', (id, position) => {
    const entity = window.editor.api.globals.entities.get(id);
    if (!entity) {
        return undefined;
    }
    entity.set('position', position);
    return position;
});
wsc.method('entity:scale:set', (id, scale) => {
    const entity = window.editor.api.globals.entities.get(id);
    if (!entity) {
        return undefined;
    }
    entity.set('scale', scale);
    return scale;
});
wsc.method('entity:component:add', (id, name, fields) => {
    const entity = window.editor.api.globals.entities.get(id);
    if (!entity) {
        return undefined;
    }
    if (entity.get(`components.${name}`)) {
        return undefined;
    }
    const data = window.editor.schema.components.getDefaultData(name);
    Object.assign(data, fields);
    entity.set(`components.${name}`, data);
    return data;
});

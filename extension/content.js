const log = msg => console.log(`%c[WSC] ${msg}`, 'color:#f60');
const error = msg => console.error(`%c[WSC] ${msg}`, 'color:#f60');

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
            log(`Connected to: ${address}`);
        };
        this._ws.onmessage = async (event) => {
            try {
                const { id, name, args } = JSON.parse(event.data);
                const res = await this._methods.get(name)?.(...args);
                this._ws.send(JSON.stringify({ id, res }));
            } catch (e) {
                error(e);
            }
        };
        this._ws.onclose = () => {
            log(`Disconnected from: ${address}`);
            setTimeout(() => this._connect(address), retryTimeout);
        };
    }

    /**
     * @param {string} name - The name of the method to add.
     * @param {Function} fn - The function to call when the method is called.
     */
    method(name, fn) {
        if (this._methods.get(name)) {
            error(`Method already exists: ${name}`);
            return;
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
    log(`Created entity(${entity.get('resource_id')})`);
    return entity.json();
});
wsc.method('entity:delete', (id) => {
    const entity = window.editor.api.globals.entities.get(id);
    if (!entity) {
        return undefined;
    }
    window.editor.api.globals.entities.delete(entity);
    log(`Deleted entity(${id})`);
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
    log(`Set entity(${id}) position: ${JSON.stringify(position)}`);
    return position;
});
wsc.method('entity:rotation:set', (id, rotation) => {
    const entity = window.editor.api.globals.entities.get(id);
    if (!entity) {
        return undefined;
    }
    entity.set('rotation', rotation);
    log(`Set entity(${id}) rotation: ${JSON.stringify(rotation)}`);
    return rotation;
});
wsc.method('entity:scale:set', (id, scale) => {
    const entity = window.editor.api.globals.entities.get(id);
    if (!entity) {
        return undefined;
    }
    entity.set('scale', scale);
    log(`Set entity(${id}) scale: ${JSON.stringify(scale)}`);
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
    log(`Added component(${name}) to entity(${id})`);
    return data;
});
wsc.method('entity:component:property:set', (id, name, prop, value) => {
    const entity = window.editor.api.globals.entities.get(id);
    if (!entity) {
        return undefined;
    }
    if (!entity.get(`components.${name}`)) {
        return undefined;
    }
    entity.set(`components.${name}.${prop}`, value);
    log(`Set component(${name}) property(${prop}) of entity(${id}) to: ${JSON.stringify(value)}`);
    return value;
});

// assets
wsc.method('asset:create', async (type, name, data) => {
    let asset;
    switch (type) {
        case 'material':
            asset = await window.editor.api.globals.assets.createMaterial({ name, data });
            break;
        case 'texture':
            asset = await window.editor.api.globals.assets.createTexture({ name, data });
            break;
        default:
            return undefined;
    }
    if (!asset) {
        return undefined;
    }
    log(`Created asset(${asset.get('id')})`);
    return asset.json();
});
wsc.method('asset:delete', (id) => {
    const asset = window.editor.api.globals.assets.get(id);
    if (!asset) {
        return undefined;
    }
    window.editor.api.globals.assets.delete(asset);
    log(`Deleted asset(${id})`);
    return true;
});
wsc.method('asset:list', () => {
    return window.editor.api.globals.assets.list().map(asset => asset.json());
});
wsc.method('asset:property:set', (id, prop, value) => {
    const asset = window.editor.api.globals.assets.get(id);
    if (!asset) {
        return undefined;
    }
    asset.set(`data.${prop}`, value);
    log(`Set asset(${id}) property(${prop}) to: ${JSON.stringify(value)}`);
    return value;
});

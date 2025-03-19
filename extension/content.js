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
            this.log(`Connected to: ${address}`);
        };
        this._ws.onmessage = async (event) => {
            try {
                const { id, name, args } = JSON.parse(event.data);
                const res = await this._methods.get(name)?.(...args);
                this._ws.send(JSON.stringify({ id, res }));
            } catch (e) {
                wsc.error(e);
            }
        };
        this._ws.onclose = () => {
            this.log(`Disconnected from: ${address}`);
            setTimeout(() => this._connect(address), retryTimeout);
        };
    }

    /**
     * @param {string} msg - The message to log.
     */
    log(msg) {
        console.log(`%c[WSC] ${msg}`, 'color:#f60');
    }

    /**
     * @param {string} msg - The error message to log.
     */
    error(msg) {
        console.wsc.error(`%c[WSC] ${msg}`, 'color:#f60');
    }

    /**
     * @param {string} name - The name of the method to add.
     * @param {Function} fn - The function to call when the method is called.
     */
    method(name, fn) {
        if (this._methods.get(name)) {
            this.error(`Method already exists: ${name}`);
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
wsc.method('entity:create', (options = {}) => {
    const entity = window.editor.api.globals.entities.create(options);
    if (!entity) {
        return undefined;
    }
    wsc.log(`Created entity(${entity.get('resource_id')})`);
    return entity.json();
});
wsc.method('entity:modify', (id, options = {}) => {
    const entity = window.editor.api.globals.entities.get(id);
    if (!entity) {
        return undefined;
    }
    if (Object.hasOwn(options, 'name')) {
        entity.set('name', options.name);
    }
    if (Object.hasOwn(options, 'position')) {
        entity.set('position', options.position);
    }
    if (Object.hasOwn(options, 'rotation')) {
        entity.set('rotation', options.rotation);
    }
    if (Object.hasOwn(options, 'scale')) {
        entity.set('scale', options.scale);
    }
    if (Object.hasOwn(options, 'enabled')) {
        entity.set('enabled', options.enabled);
    }
    if (Object.hasOwn(options, 'tags')) {
        entity.set('tags', options.tags);
    }
    wsc.log(`Modified entity(${id})`);
    return entity.json();
});
wsc.method('entity:reparent', (options) => {
    const entity = window.editor.api.globals.entities.get(options.id);
    if (!entity) {
        return undefined;
    }
    const parent = window.editor.api.globals.entities.get(options.parent);
    if (!parent) {
        return undefined;
    }
    entity.reparent(parent, options.index, {
        preserveTransform: options.preserveTransform
    });
    wsc.log(`Reparented entity(${options.id}) to entity(${options.parent})`);
    return entity.json();
});
wsc.method('entity:delete', (id) => {
    const entity = window.editor.api.globals.entities.get(id);
    if (!entity) {
        return undefined;
    }
    entity.delete();
    wsc.log(`Deleted entity(${id})`);
    return true;
});
wsc.method('entity:list', () => {
    return window.editor.api.globals.entities.list().map(entity => entity.json());
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
    wsc.log(`Added component(${name}) to entity(${id})`);
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
    wsc.log(`Set component(${name}) property(${prop}) of entity(${id}) to: ${JSON.stringify(value)}`);
    return true;
});
wsc.method('entity:component:script:add', (id, scriptName) => {
    const entity = window.editor.api.globals.entities.get(id);
    if (!entity) {
        return undefined;
    }
    if (!entity.get('components.script')) {
        return undefined;
    }
    entity.addScript(scriptName);
    wsc.log(`Added script(${scriptName}) to component(script) of entity(${id})`);
    return true;
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
        case 'script':
            asset = await window.editor.api.globals.assets.createScript({ filename: name, data });
            break;
        default:
            return undefined;
    }
    if (!asset) {
        return undefined;
    }
    wsc.log(`Created asset(${asset.get('id')})`);
    return asset.json();
});
wsc.method('asset:delete', (id) => {
    const asset = window.editor.api.globals.assets.get(id);
    if (!asset) {
        return undefined;
    }
    window.editor.api.globals.assets.delete([asset]);
    wsc.log(`Deleted asset(${id})`);
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
    wsc.log(`Set asset(${id}) property(${prop}) to: ${JSON.stringify(value)}`);
    return true;
});
wsc.method('asset:script:content:set', async (id, content) => {
    const asset = window.editor.api.globals.assets.get(id);
    if (!asset) {
        return undefined;
    }

    const form = new FormData();
    form.append('filename', asset.get('file.filename'));
    form.append('file', new Blob([content], { type: 'text/plain' }), asset.get('file.filename'));
    form.append('branchId', window.config.self.branch.id);

    try {
        const res = await fetch(`/api/assets/${id}`, {
            method: 'PUT',
            body: form,
            headers: {
                Authorization: `Bearer ${window.editor.api.globals.accessToken}`
            }
        });
        const data = await res.json();
        if (data.error) {
            return undefined;
        }
        wsc.log(`Set asset(${id}) script content`);
        return data;
    } catch (e) {
        return undefined;
    }
});

function iterateObject(obj, callback, currentPath = '') {
    Object.entries(obj).forEach(([key, value]) => {
        const path = currentPath ? `${currentPath}.${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            iterateObject(value, callback, path);
        } else {
            callback(path, value);
        }
    });
}
  
// scenes
wsc.method('scene:modify', (settings) => {
    iterateObject(settings, (path, value) => {
        window.editor.settings.scene.set(path, value);
    });

    wsc.log(`Modified scene settings`);
    return true;
});

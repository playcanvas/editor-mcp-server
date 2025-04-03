if (!window.editor) {
    throw new Error('PlayCanvas Editor not found');
}

/**
 * @param {string} msg - The message to log.
 */
const log = (msg) => {
    console.log(`%c[WSC] ${msg}`, 'color:#f60');
};

/**
 * @param {string} msg - The message to log.
 */
const error = (msg) => {
    console.error(`%c[WSC] ${msg}`, 'color:#f60');
};

/**
 * PlayCanvas Editor API observer package.
 */
const observer = window.editor.observer;

/**
 * PlayCanvas Editor API wrapper.
 */
const api = window.editor.api.globals;

/**
 * PlayCanvas REST API wrapper.
 *
 * @param {'GET' | 'POST' | 'PUT' | 'DELETE'} method - The HTTP method to use.
 * @param {string} path - The path to the API endpoint.
 * @param {FormData | Object} data - The data to send.
 * @param {boolean} auth - Whether to use authentication.
 * @returns {Promise<Object>} The response data.
 */
const rest = (method, path, data, auth = false) => {
    const init = {
        method,
        headers: {
            Authorization: auth ? `Bearer ${api.accessToken}` : undefined
        }
    };
    if (data instanceof FormData) {
        init.body = data;
    } else {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(data);
    }
    return fetch(`/api/${path}`, init).then(res => res.json());
};

/**
 * @param {Object} obj - The object to iterate.
 * @param {Function} callback - The callback to call for each key-value pair.
 * @param {string} currentPath - The current path of the object.
 */
const iterateObject = (obj, callback, currentPath = '') => {
    Object.entries(obj).forEach(([key, value]) => {
        const path = currentPath ? `${currentPath}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            iterateObject(value, callback, path);
        } else {
            callback(path, value);
        }
    });
};

class WSC extends observer.Events {
    static STATUS_CONNECTING = 'connecting';

    static STATUS_CONNECTED = 'connected';

    static STATUS_DISCONNECTED = 'disconnected';

    /**
     * @type {WebSocket}
     * @private
     */
    _ws;

    /**
     * @type {Map<string, Function}
     * @private
     */
    _methods = new Map();

    /**
     * @type {ReturnType<typeof setTimeout> |  null}
     * @private
     */
    _connectTimeout = null;

    /**
     * @type {WSC.STATUS_CONNECTING | WSC.STATUS_CONNECTED | WSC.STATUS_DISCONNECTED}
     * @private
     */
    _status = WSC.STATUS_DISCONNECTED;

    /**
     * @type {WSC.STATUS_CONNECTING | WSC.STATUS_CONNECTED | WSC.STATUS_DISCONNECTED}
     */
    get status() {
        return this._status;
    }

    /**
     * @param {string} address - The address to connect to.
     * @param {Function} resolve - The function to call when the connection is established.
     * @param {number} [retryTimeout] - The timeout to retry the connection.
     */
    connect(address, retryTimeout = 1000) {
        this._status = WSC.STATUS_CONNECTING;
        this.emit('status', this._status);
        log(`Connecting to ${address}`);

        if (this._connectTimeout) {
            clearTimeout(this._connectTimeout);
        }

        this._connect(address, retryTimeout, () => {
            this._ws.onclose = (evt) => {
                if (evt.reason === 'FORCE') {
                    return;
                }
                this._status = WSC.STATUS_DISCONNECTED;
                this.emit('status', this._status);
                log('Disconnected');
            };

            this._status = WSC.STATUS_CONNECTED;
            this.emit('status', this._status);
            log('Connected');
        });
    }

    /**
     * @param {string} address - The address to connect to.
     * @param {number} retryTimeout - The timeout to retry the connection.
     * @param {Function} resolve - The function to call when the connection is established
     * @private
     */
    _connect(address, retryTimeout, resolve) {
        this._ws = new WebSocket(address);
        this._ws.onopen = () => {
            resolve();
        };
        this._ws.onmessage = async (event) => {
            try {
                const { id, name, args } = JSON.parse(event.data);
                const res = await this.call(name, ...args);
                this._ws.send(JSON.stringify({ id, res }));
            } catch (e) {
                error(e);
            }
        };
        this._ws.onclose = () => {
            this._connectTimeout = setTimeout(() => {
                this._connectTimeout = null;
                this._connect(address, retryTimeout, resolve);
            }, retryTimeout);
        };
    }

    disconnect() {
        if (this._connectTimeout) {
            clearTimeout(this._connectTimeout);
        }
        if (this._ws) {
            this._ws.close(1000, 'FORCE');
            this._ws = null;
        }
        this._status = WSC.STATUS_DISCONNECTED;
        this.emit('status', this._status);
        log('Disconnected');
    }

    /**
     * @param {string} name - The name of the method to add.
     * @param {(...args: any[]) => { data?: any, error?: string }} fn - The function to call when the method is called.
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
     * @returns {{ data?: any, error?: string }} The response data.
     */
    call(name, ...args) {
        return this._methods.get(name)?.(...args);
    }
}

class Messenger extends observer.Events {
    _ctx;

    constructor(ctx) {
        super();
        this._ctx = ctx;

        window.addEventListener('message', (event) => {
            if (event.data?.ctx === this._ctx) {
                return;
            }
            const { name, args } = event.data;
            this.emit(name, ...args);
        });
    }

    send(name, ...args) {
        window.postMessage({ name, args, ctx: this._ctx });
    }
}

const wsc = new WSC();
const messenger = new Messenger('main');

// sync
messenger.on('sync', () => {
    messenger.send('status', wsc.status);
});
messenger.on('connect', ({ port = 52000 }) => {
    wsc.connect(`ws://localhost:${port}`);
});
messenger.on('disconnect', () => {
    wsc.disconnect();
});
wsc.on('status', (status) => {
    messenger.send('status', status);
});

// general
wsc.method('ping', () => 'pong');

// entities
wsc.method('entities:create', (entityDataArray) => {
    const entities = [];
    entityDataArray.forEach((entityData) => {
        // FIXME: Requires patch of editor
        let collision;
        if (entityData?.components?.collision) {
            collision = entityData.components.collision;
            delete entityData.components.collision;
        }

        const entity = api.entities.create(entityData);
        if (!entity) {
            return { error: 'Failed to create entity' };
        }
        entities.push(entity);

        // FIXME: Requires patch of editor
        if (collision) {
            entity.addComponent('collision', collision);
        }

        log(`Created entity(${entity.get('resource_id')})`);
    });
    return { data: entities.map(entity => entity.json()) };
});
wsc.method('entities:modify', (edits) => {
    edits.forEach(({ id, path, value }) => {
        const entity = api.entities.get(id);
        if (!entity) {
            return { error: 'Entity not found' };
        }
        entity.set(path, value);
        log(`Set property(${path}) of entity(${id}) to: ${JSON.stringify(value)}`);
    });
    return { data: true };
});
wsc.method('entities:duplicate', async (ids, options = {}) => {
    const entities = ids.map(id => api.entities.get(id));
    if (!entities.length) {
        return { error: 'Entities not found' };
    }
    const res = await api.entities.duplicate(entities, options);
    log(`Duplicated entities: ${res.map(entity => entity.get('resource_id')).join(', ')}`);
    return { data: res.map(entity => entity.json()) };
});
wsc.method('entities:reparent', (options) => {
    const entity = api.entities.get(options.id);
    if (!entity) {
        return { error: 'Entity not found' };
    }
    const parent = api.entities.get(options.parent);
    if (!parent) {
        return { error: 'Parent entity not found' };
    }
    entity.reparent(parent, options.index, {
        preserveTransform: options.preserveTransform
    });
    log(`Reparented entity(${options.id}) to entity(${options.parent})`);
    return { data: entity.json() };
});
wsc.method('entities:delete', async (ids) => {
    const entities = ids
    .map(id => api.entities.get(id))
    .filter(entity => entity !== api.entities.root);
    if (!entities.length) {
        return { error: 'No entities to delete' };
    }
    await api.entities.delete(entities);
    log(`Deleted entities: ${ids.join(', ')}`);
    return { data: true };
});
wsc.method('entities:list', () => {
    const entities = api.entities.list();
    if (!entities.length) {
        return { error: 'No entities found' };
    }
    log('Listed entities');
    return { data: entities.map(entity => entity.json()) };
});
wsc.method('entities:components:add', (id, components) => {
    const entity = api.entities.get(id);
    if (!entity) {
        return { error: 'Entity not found' };
    }
    Object.entries(components).forEach(([name, data]) => {
        entity.addComponent(name, data);
    });
    log(`Added components(${Object.keys(components).join(', ')}) to entity(${id})`);
    return { data: entity.json() };
});
wsc.method('entities:components:remove', (id, components) => {
    const entity = api.entities.get(id);
    if (!entity) {
        return { error: 'Entity not found' };
    }
    components.forEach((component) => {
        entity.removeComponent(component);
    });
    log(`Removed components(${components.join(', ')}) from entity(${id})`);
    return { data: entity.json() };
});
wsc.method('entities:components:script:add', (id, scriptName) => {
    const entity = api.entities.get(id);
    if (!entity) {
        return { error: 'Entity not found' };
    }
    if (!entity.get('components.script')) {
        return { error: 'Script component not found' };
    }
    entity.addScript(scriptName);
    log(`Added script(${scriptName}) to component(script) of entity(${id})`);
    return { data: entity.get('components.script') };
});

// assets
wsc.method('assets:create', async (type, options = {}) => {
    if (options?.data?.name) {
        options.name = options.data.name;
    }
    if (options?.folder) {
        options.folder = api.assets.get(options.folder);
    }
    let asset;
    switch (type) {
        case 'material':
            asset = await api.assets.createMaterial(options);
            break;
        case 'texture':
            asset = await api.assets.createTexture(options);
            break;
        case 'script':
            asset = await api.assets.createScript(options);
            break;
        default:
            return { error: 'Invalid asset type' };
    }
    if (!asset) {
        return { error: 'Failed to create asset' };
    }
    log(`Created asset(${asset.get('id')})`);
    return { data: asset.json() };
});
wsc.method('assets:delete', (ids) => {
    const assets = ids.map(id => api.assets.get(id));
    if (!assets.length) {
        return { error: 'Assets not found' };
    }
    api.assets.delete(assets);
    log(`Deleted assets: ${ids.join(', ')}`);
    return { data: true };
});
wsc.method('assets:list', (type) => {
    let assets = api.assets.list();
    if (type) {
        assets = assets.filter(asset => asset.get('type') === type);
    }
    log('Listed assets');
    return { data: assets.map(asset => asset.json()) };
});
wsc.method('assets:instantiate', async (ids) => {
    const assets = ids.map(id => api.assets.get(id));
    if (!assets.length) {
        return { error: 'Assets not found' };
    }
    if (assets.some(asset => asset.get('type') !== 'template')) {
        return { error: 'Invalid template asset' };
    }
    const entities = await api.assets.instantiateTemplates(assets);
    log(`Instantiated assets: ${ids.join(', ')}`);
    return { data: entities.map(entity => entity.json()) };
});
wsc.method('assets:property:set', (id, prop, value) => {
    const asset = api.assets.get(id);
    if (!asset) {
        return { error: 'Asset not found' };
    }
    asset.set(`data.${prop}`, value);
    log(`Set asset(${id}) property(${prop}) to: ${JSON.stringify(value)}`);
    return { data: asset.json() };
});
wsc.method('assets:script:text:set', async (id, text) => {
    const asset = api.assets.get(id);
    if (!asset) {
        return { error: 'Asset not found' };
    }

    const form = new FormData();
    form.append('filename', asset.get('file.filename'));
    form.append('file', new Blob([text], { type: 'text/plain' }), asset.get('file.filename'));
    form.append('branchId', window.config.self.branch.id);

    try {
        const data = await rest('PUT', `assets/${id}`, form, true);
        if (data.error) {
            return { error: data.error };
        }
        log(`Set asset(${id}) script text`);
        return { data };
    } catch (e) {
        return { error: e.message };
    }
});
wsc.method('assets:script:parse', async (id) => {
    const asset = api.assets.get(id);
    if (!asset) {
        return { error: 'Asset not found' };
    }
    // FIXME: This is a hacky way to get the parsed script data. Expose a proper API for this.
    const [error, data] = await new Promise((resolve) => {
        window.editor.call('scripts:parse', asset.observer, (...data) => resolve(data));
    });
    if (error) {
        return { error };
    }
    if (Object.keys(data.scripts).length === 0) {
        return { error: 'Failed to parse script' };
    }
    log(`Parsed asset(${id}) script`);
    return { data };
});

// scenes
wsc.method('scene:settings:modify', (settings) => {
    const scene = api.settings.scene;
    iterateObject(settings, (path, value) => {
        scene.set(path, value);
    });

    log('Modified scene settings');
    return { data: scene.json() };
});

// store

// playcanvas
wsc.method('store:playcanvas:list', async (options = {}) => {
    const params = [];

    if (options.search) {
        params.push(`search=${options.search}`);
    }

    params.push('regexp=true');

    if (options.order) {
        params.push(`order=${options.order}`);
    }

    if (options.skip) {
        params.push(`skip=${options.skip}`);
    }

    if (options.limit) {
        params.push(`limit=${options.limit}`);
    }

    try {
        const data = await rest('GET', `store?${params.join('&')}`);
        if (data.error) {
            return { error: data.error };
        }
        log(`Searched store: ${JSON.stringify(options)}`);
        return { data };
    } catch (e) {
        return { error: e.message };
    }
});
wsc.method('store:playcanvas:get', async (id) => {
    try {
        const data = await rest('GET', `store/${id}`);
        if (data.error) {
            return { error: data.error };
        }
        log(`Got store item(${id})`);
        return { data };
    } catch (e) {
        return { error: e.message };
    }
});
wsc.method('store:playcanvas:clone', async (id, name, license) => {
    try {
        const data = await rest('POST', `store/${id}/clone`, {
            scope: {
                type: 'project',
                id: window.config.project.id
            },
            name,
            store: 'playcanvas',
            targetFolderId: null,
            license
        });
        if (data.error) {
            return { error: data.error };
        }
        log(`Cloned store item(${id})`);
        return { data };
    } catch (e) {
        return { error: e.message };
    }
});

// sketchfab
wsc.method('store:sketchfab:list', async (options = {}) => {
    const params = [
        'restricted=0',
        'type=models',
        'downloadable=true'
    ];

    if (options.search) {
        params.push(`q=${options.search}`);
    }

    if (options.order) {
        params.push(`sort_by=${options.order}`);
    }

    if (options.skip) {
        params.push(`cursor=${options.skip}`);
    }

    if (options.limit) {
        params.push(`count=${Math.min(options.limit ?? 0, 24)}`);
    }

    try {
        const res = await fetch(`https://api.sketchfab.com/v3/search?${params.join('&')}`);
        const data = await res.json();
        if (data.error) {
            return { error: data.error };
        }
        log(`Searched Sketchfab: ${JSON.stringify(options)}`);
        return { data };
    } catch (e) {
        return { error: e.message };
    }
});
wsc.method('store:sketchfab:get', async (uid) => {
    try {
        const res = await fetch(`https://api.sketchfab.com/v3/models/${uid}`);
        const data = await res.json();
        if (data.error) {
            return { error: data.error };
        }
        log(`Got Sketchfab model(${uid})`);
        return { data };
    } catch (e) {
        return { error: e.message };
    }
});
wsc.method('store:sketchfab:clone', async (uid, name, license) => {
    try {
        const data = await rest('POST', `store/${uid}/clone`, {
            scope: {
                type: 'project',
                id: window.config.project.id
            },
            name,
            store: 'sketchfab',
            targetFolderId: null,
            license
        });
        if (data.error) {
            return { error: data.error };
        }
        log(`Cloned sketchfab item(${uid})`);
        return { data };
    } catch (e) {
        return { error: e.message };
    }
});

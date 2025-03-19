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
                console.error(e);
                this.error(e);
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
const wsc = new WSC('ws://localhost:52000');
const editorApi = window.editor.api.globals;

/**
 * @param {'GET' | 'POST' | 'PUT' | 'DELETE'} method - The HTTP method to use.
 * @param {string} path - The path to the API endpoint.
 * @param {FormData | Object} data - The data to send.
 * @param {boolean} auth - Whether to use authentication.
 * @returns {Promise<Object>} The response data.
 */
const restApi = (method, path, data, auth = false) => {
    return fetch(`/api/${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: auth ? `Bearer ${editorApi.accessToken}` : undefined
        },
        body: data instanceof FormData ? data : JSON.stringify(data)
    }).then(res => res.json());
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

// general
wsc.method('ping', () => 'pong');

// entities
wsc.method('entities:create', (options = {}) => {
    const entity = editorApi.entities.create(options);
    if (!entity) {
        return undefined;
    }
    wsc.log(`Created entity(${entity.get('resource_id')})`);
    return entity.json();
});
wsc.method('entities:modify', (id, options = {}) => {
    const entity = editorApi.entities.get(id);
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
wsc.method('entities:duplicate', async (ids, options = {}) => {
    const entities = ids.map(id => editorApi.entities.get(id));
    if (!entities.length) {
        return [];
    }
    const res = await editorApi.entities.duplicate(entities, options);
    wsc.log(`Duplicated entities: ${res.map(entity => entity.get('resource_id')).join(', ')}`);
    return res.map(entity => entity.json());
});
wsc.method('entities:reparent', (options) => {
    const entity = editorApi.entities.get(options.id);
    if (!entity) {
        return undefined;
    }
    const parent = editorApi.entities.get(options.parent);
    if (!parent) {
        return undefined;
    }
    entity.reparent(parent, options.index, {
        preserveTransform: options.preserveTransform
    });
    wsc.log(`Reparented entity(${options.id}) to entity(${options.parent})`);
    return entity.json();
});
wsc.method('entities:delete', async (ids) => {
    const entities = ids.map(id => editorApi.entities.get(id));
    if (!entities.length) {
        return [];
    }
    await editorApi.entities.delete(entities);
    wsc.log(`Deleted entities: ${ids.join(', ')}`);
    return true;
});
wsc.method('entities:list', () => {
    return editorApi.entities.list().map(entity => entity.json());
});
wsc.method('entities:components:add', (id, name, data) => {
    const entity = editorApi.entities.get(id);
    if (!entity) {
        return undefined;
    }
    if (entity.get(`components.${name}`)) {
        return undefined;
    }
    entity.addComponent(name, data);
    wsc.log(`Added component(${name}) to entity(${id})`);
    return true;
});
wsc.method('entities:components:property:set', (id, name, prop, value) => {
    const entity = editorApi.entities.get(id);
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
wsc.method('entities:components:script:add', (id, scriptName) => {
    const entity = editorApi.entities.get(id);
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
wsc.method('assets:create', async (type, name, data) => {
    let asset;
    switch (type) {
        case 'material':
            asset = await editorApi.assets.createMaterial({ name, data });
            break;
        case 'texture':
            asset = await editorApi.assets.createTexture({ name, data });
            break;
        case 'script':
            asset = await editorApi.assets.createScript({ filename: name, data });
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
wsc.method('assets:delete', (ids) => {
    const assets = ids.map(id => editorApi.assets.get(id));
    if (!assets.length) {
        return [];
    }
    editorApi.assets.delete(assets);
    wsc.log(`Deleted assets: ${ids.join(', ')}`);
    return true;
});
wsc.method('assets:list', () => {
    return editorApi.assets.list().map(asset => asset.json());
});
wsc.method('assets:instantiate', async (ids) => {
    const assets = ids.map(id => editorApi.assets.get(id));
    if (!assets.length) {
        return [];
    }
    const entities = await editorApi.assets.instantiateTemplates(assets);
    wsc.log(`Instantiated assets: ${ids.join(', ')}`);
    return entities.map(entity => entity.json());
});
wsc.method('assets:property:set', (id, prop, value) => {
    const asset = editorApi.assets.get(id);
    if (!asset) {
        return undefined;
    }
    asset.set(`data.${prop}`, value);
    wsc.log(`Set asset(${id}) property(${prop}) to: ${JSON.stringify(value)}`);
    return true;
});
wsc.method('assets:script:content:set', async (id, content) => {
    const asset = editorApi.assets.get(id);
    if (!asset) {
        return undefined;
    }

    const form = new FormData();
    form.append('filename', asset.get('file.filename'));
    form.append('file', new Blob([content], { type: 'text/plain' }), asset.get('file.filename'));
    form.append('branchId', window.config.self.branch.id);

    try {
        const data = await restApi('PUT', `assets/${id}`, form, true);
        if (data.error) {
            return undefined;
        }
        wsc.log(`Set asset(${id}) script content`);
        return data;
    } catch (e) {
        return undefined;
    }
});

// scenes
wsc.method('scene:modify', (settings) => {
    iterateObject(settings, (path, value) => {
        editorApi.settings.scene.set(path, value);
    });

    wsc.log('Modified scene settings');
    return true;
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
        const data = await restApi('GET', `store?${params.join('&')}`);
        if (data.error) {
            return undefined;
        }
        wsc.log(`Searched store: ${JSON.stringify(options)}`);
        return data;
    } catch (e) {
        return undefined;
    }
});
wsc.method('store:playcanvas:get', async (id) => {
    try {
        const data = await restApi('GET', `store/${id}`);
        if (data.error) {
            return undefined;
        }
        wsc.log(`Got store item(${id})`);
        return data;
    } catch (e) {
        return undefined;
    }
});
wsc.method('store:playcanvas:clone', async (id, name, license) => {
    try {
        const data = await restApi('POST', `store/${id}/clone`, {
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
            return undefined;
        }
        wsc.log(`Cloned store item(${id})`);
        return data;
    } catch (e) {
        return undefined;
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
            return undefined;
        }
        wsc.log(`Searched Sketchfab: ${JSON.stringify(options)}`);
        return data;
    } catch (e) {
        return undefined;
    }
});
wsc.method('store:sketchfab:get', async (uid) => {
    try {
        const res = await fetch(`https://api.sketchfab.com/v3/models/${uid}`);
        const data = await res.json();
        if (data.error) {
            return undefined;
        }
        wsc.log(`Got Sketchfab model(${uid})`);
        return data;
    } catch (e) {
        return undefined;
    }
});
wsc.method('store:sketchfab:clone', async (uid, name, license) => {
    try {
        const data = await restApi('POST', `store/${uid}/clone`, {
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
            return undefined;
        }
        wsc.log(`Cloned sketchfab item(${uid})`);
        return data;
    } catch (e) {
        return undefined;
    }
});

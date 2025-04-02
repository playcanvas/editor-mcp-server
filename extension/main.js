class UTILS {
    /**
     * @param {string} msg - The message to log.
     */
    static log(msg) {
        console.log(`%c[WSC] ${msg}`, 'color:#f60');
    }

    /**
     * @param {string} msg - The message to log.
     */
    static error(msg) {
        console.error(`%c[WSC] ${msg}`, 'color:#f60');
    }


    /**
     * PlayCanvas Editor API wrapper.
     *
     * @returns {Object} The PlayCanvas Editor API.
     */
    static get editorApi() {
        return window.editor.api.globals;
    }

    /**
     * PlayCanvas REST API wrapper.
     *
     * @param {'GET' | 'POST' | 'PUT' | 'DELETE'} method - The HTTP method to use.
     * @param {string} path - The path to the API endpoint.
     * @param {FormData | Object} data - The data to send.
     * @param {boolean} auth - Whether to use authentication.
     * @returns {Promise<Object>} The response data.
     */
    static restApi(method, path, data, auth = false) {
        const init = {
            method,
            headers: {
                Authorization: auth ? `Bearer ${window.editor.api.globals.accessToken}` : undefined
            }
        };
        if (data instanceof FormData) {
            init.body = data;
        } else {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(data);
        }
        return fetch(`/api/${path}`, init).then(res => res.json());
    }

    /**
     * @param {Object} obj - The object to iterate.
     * @param {Function} callback - The callback to call for each key-value pair.
     * @param {string} currentPath - The current path of the object.
     */
    static iterateObject(obj, callback, currentPath = '') {
        Object.entries(obj).forEach(([key, value]) => {
            const path = currentPath ? `${currentPath}.${key}` : key;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                UTILS.iterateObject(value, callback, path);
            } else {
                callback(path, value);
            }
        });
    }
}

class WSC {
    _ws;

    _methods = new Map();

    /**
     * @param {string} address - The address to connect to.
     * @param {number} retryTimeout - The timeout to retry the connection.
     */
    connect(address, retryTimeout = 3000) {
        this._ws = new WebSocket(address);
        this._ws.onopen = () => {
            UTILS.log(`Connected to: ${address}`);
        };
        this._ws.onmessage = async (event) => {
            try {
                const { id, name, args } = JSON.parse(event.data);
                const res = await this.call(name, ...args);
                this._ws.send(JSON.stringify({ id, res }));
            } catch (e) {
                UTILS.error(e);
            }
        };
        this._ws.onclose = () => {
            UTILS.log(`Disconnected from: ${address}`);
            setTimeout(() => this.connect(address), retryTimeout);
        };
    }

    /**
     * @param {string} name - The name of the method to add.
     * @param {(...args: any[]) => { data?: any, error?: string }} fn - The function to call when the method is called.
     */
    method(name, fn) {
        if (this._methods.get(name)) {
            UTILS.error(`Method already exists: ${name}`);
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

const wsc = new WSC();

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

        const entity = UTILS.editorApi.entities.create(entityData);
        if (!entity) {
            return { error: 'Failed to create entity' };
        }
        entities.push(entity);

        // FIXME: Requires patch of editor
        if (collision) {
            entity.addComponent('collision', collision);
        }

        UTILS.log(`Created entity(${entity.get('resource_id')})`);
    });
    return { data: entities.map(entity => entity.json()) };
});
wsc.method('entities:modify', (edits) => {
    edits.forEach(({ id, path, value }) => {
        const entity = UTILS.editorApi.entities.get(id);
        if (!entity) {
            return { error: 'Entity not found' };
        }
        entity.set(path, value);
        UTILS.log(`Set property(${path}) of entity(${id}) to: ${JSON.stringify(value)}`);
    });
    return { data: true };
});
wsc.method('entities:duplicate', async (ids, options = {}) => {
    const entities = ids.map(id => UTILS.editorApi.entities.get(id));
    if (!entities.length) {
        return { error: 'Entities not found' };
    }
    const res = await UTILS.editorApi.entities.duplicate(entities, options);
    UTILS.log(`Duplicated entities: ${res.map(entity => entity.get('resource_id')).join(', ')}`);
    return { data: res.map(entity => entity.json()) };
});
wsc.method('entities:reparent', (options) => {
    const entity = UTILS.editorApi.entities.get(options.id);
    if (!entity) {
        return { error: 'Entity not found' };
    }
    const parent = UTILS.editorApi.entities.get(options.parent);
    if (!parent) {
        return { error: 'Parent entity not found' };
    }
    entity.reparent(parent, options.index, {
        preserveTransform: options.preserveTransform
    });
    UTILS.log(`Reparented entity(${options.id}) to entity(${options.parent})`);
    return { data: entity.json() };
});
wsc.method('entities:delete', async (ids) => {
    const entities = ids
    .map(id => UTILS.editorApi.entities.get(id))
    .filter(entity => entity !== UTILS.editorApi.entities.root);
    if (!entities.length) {
        return { error: 'No entities to delete' };
    }
    await UTILS.editorApi.entities.delete(entities);
    UTILS.log(`Deleted entities: ${ids.join(', ')}`);
    return { data: true };
});
wsc.method('entities:list', () => {
    const entities = UTILS.editorApi.entities.list();
    if (!entities.length) {
        return { error: 'No entities found' };
    }
    UTILS.log('Listed entities');
    return { data: entities.map(entity => entity.json()) };
});
wsc.method('entities:components:add', (id, components) => {
    const entity = UTILS.editorApi.entities.get(id);
    if (!entity) {
        return { error: 'Entity not found' };
    }
    Object.entries(components).forEach(([name, data]) => {
        entity.addComponent(name, data);
    });
    UTILS.log(`Added components(${Object.keys(components).join(', ')}) to entity(${id})`);
    return { data: entity.json() };
});
wsc.method('entities:components:remove', (id, components) => {
    const entity = UTILS.editorApi.entities.get(id);
    if (!entity) {
        return { error: 'Entity not found' };
    }
    components.forEach((component) => {
        entity.removeComponent(component);
    });
    UTILS.log(`Removed components(${components.join(', ')}) from entity(${id})`);
    return { data: entity.json() };
});
wsc.method('entities:components:script:add', (id, scriptName) => {
    const entity = UTILS.editorApi.entities.get(id);
    if (!entity) {
        return { error: 'Entity not found' };
    }
    if (!entity.get('components.script')) {
        return { error: 'Script component not found' };
    }
    entity.addScript(scriptName);
    UTILS.log(`Added script(${scriptName}) to component(script) of entity(${id})`);
    return { data: entity.get('components.script') };
});

// assets
wsc.method('assets:create', async (type, options = {}) => {
    if (options?.data?.name) {
        options.name = options.data.name;
    }
    if (options?.folder) {
        options.folder = UTILS.editorApi.assets.get(options.folder);
    }
    let asset;
    switch (type) {
        case 'material':
            asset = await UTILS.editorApi.assets.createMaterial(options);
            break;
        case 'texture':
            asset = await UTILS.editorApi.assets.createTexture(options);
            break;
        case 'script':
            asset = await UTILS.editorApi.assets.createScript(options);
            break;
        default:
            return { error: 'Invalid asset type' };
    }
    if (!asset) {
        return { error: 'Failed to create asset' };
    }
    UTILS.log(`Created asset(${asset.get('id')})`);
    return { data: asset.json() };
});
wsc.method('assets:delete', (ids) => {
    const assets = ids.map(id => UTILS.editorApi.assets.get(id));
    if (!assets.length) {
        return { error: 'Assets not found' };
    }
    UTILS.editorApi.assets.delete(assets);
    UTILS.log(`Deleted assets: ${ids.join(', ')}`);
    return { data: true };
});
wsc.method('assets:list', (type) => {
    let assets = UTILS.editorApi.assets.list();
    if (type) {
        assets = assets.filter(asset => asset.get('type') === type);
    }
    UTILS.log('Listed assets');
    return { data: assets.map(asset => asset.json()) };
});
wsc.method('assets:instantiate', async (ids) => {
    const assets = ids.map(id => UTILS.editorApi.assets.get(id));
    if (!assets.length) {
        return { error: 'Assets not found' };
    }
    if (assets.some(asset => asset.get('type') !== 'template')) {
        return { error: 'Invalid template asset' };
    }
    const entities = await UTILS.editorApi.assets.instantiateTemplates(assets);
    UTILS.log(`Instantiated assets: ${ids.join(', ')}`);
    return { data: entities.map(entity => entity.json()) };
});
wsc.method('assets:property:set', (id, prop, value) => {
    const asset = UTILS.editorApi.assets.get(id);
    if (!asset) {
        return { error: 'Asset not found' };
    }
    asset.set(`data.${prop}`, value);
    UTILS.log(`Set asset(${id}) property(${prop}) to: ${JSON.stringify(value)}`);
    return { data: asset.json() };
});
wsc.method('assets:script:text:set', async (id, text) => {
    const asset = UTILS.editorApi.assets.get(id);
    if (!asset) {
        return { error: 'Asset not found' };
    }

    const form = new FormData();
    form.append('filename', asset.get('file.filename'));
    form.append('file', new Blob([text], { type: 'text/plain' }), asset.get('file.filename'));
    form.append('branchId', window.config.self.branch.id);

    try {
        const data = await UTILS.restApi('PUT', `assets/${id}`, form, true);
        if (data.error) {
            return { error: data.error };
        }
        UTILS.log(`Set asset(${id}) script text`);
        return { data };
    } catch (e) {
        return { error: e.message };
    }
});
wsc.method('assets:script:parse', async (id) => {
    const asset = UTILS.editorApi.assets.get(id);
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
    UTILS.log(`Parsed asset(${id}) script`);
    return { data };
});

// scenes
wsc.method('scene:settings:modify', (settings) => {
    const scene = UTILS.editorApi.settings.scene;
    UTILS.iterateObject(settings, (path, value) => {
        scene.set(path, value);
    });

    UTILS.log('Modified scene settings');
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
        const data = await UTILS.restApi('GET', `store?${params.join('&')}`);
        if (data.error) {
            return { error: data.error };
        }
        UTILS.log(`Searched store: ${JSON.stringify(options)}`);
        return { data };
    } catch (e) {
        return { error: e.message };
    }
});
wsc.method('store:playcanvas:get', async (id) => {
    try {
        const data = await UTILS.restApi('GET', `store/${id}`);
        if (data.error) {
            return { error: data.error };
        }
        UTILS.log(`Got store item(${id})`);
        return { data };
    } catch (e) {
        return { error: e.message };
    }
});
wsc.method('store:playcanvas:clone', async (id, name, license) => {
    try {
        const data = await UTILS.restApi('POST', `store/${id}/clone`, {
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
        UTILS.log(`Cloned store item(${id})`);
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
        UTILS.log(`Searched Sketchfab: ${JSON.stringify(options)}`);
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
        UTILS.log(`Got Sketchfab model(${uid})`);
        return { data };
    } catch (e) {
        return { error: e.message };
    }
});
wsc.method('store:sketchfab:clone', async (uid, name, license) => {
    try {
        const data = await UTILS.restApi('POST', `store/${uid}/clone`, {
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
        UTILS.log(`Cloned sketchfab item(${uid})`);
        return { data };
    } catch (e) {
        return { error: e.message };
    }
});

wsc.connect('ws://localhost:52000');

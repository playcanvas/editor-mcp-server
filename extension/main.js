(() => {
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
        return fetch(`/api/${path}`, init).then((res) => res.json());
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
        constructor() {
            super();

            window.addEventListener('message', (event) => {
                if (event.data?.ctx !== 'isolated') {
                    return;
                }
                const { name, args } = event.data;
                this.emit(name, ...args);
            });
        }

        send(name, ...args) {
            window.postMessage({ name, args, ctx: 'main' });
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

    // viewport
    wsc.method('viewport:capture', () => {
        const app = window.editor.call('viewport:app');
        if (!app) {
            return { error: 'Viewport app not found' };
        }

        const device = app.graphicsDevice;
        const gl = device.gl;
        if (!gl) {
            return { error: 'WebGL context not found' };
        }

        try {
            // Force a render to ensure we have the latest frame
            window.editor.call('viewport:render');
            app.tick();

            const width = device.width;
            const height = device.height;

            // Read pixels from the backbuffer
            const pixels = new Uint8Array(width * height * 4);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

            // Flip the image vertically (WebGL reads bottom-to-top)
            const flipped = new Uint8Array(width * height * 4);
            const rowSize = width * 4;
            for (let y = 0; y < height; y++) {
                flipped.set(
                    pixels.subarray((height - 1 - y) * rowSize, (height - y) * rowSize),
                    y * rowSize
                );
            }

            // Create source canvas with full resolution
            const srcCanvas = document.createElement('canvas');
            srcCanvas.width = width;
            srcCanvas.height = height;
            const srcCtx = srcCanvas.getContext('2d');
            const imageData = new ImageData(new Uint8ClampedArray(flipped.buffer), width, height);
            srcCtx.putImageData(imageData, 0, 0);

            // Scale down to max 800px width while maintaining aspect ratio
            const maxWidth = 800;
            let dstWidth = width;
            let dstHeight = height;
            if (width > maxWidth) {
                dstWidth = maxWidth;
                dstHeight = Math.round(height * (maxWidth / width));
            }

            // Create destination canvas and draw scaled image
            const dstCanvas = document.createElement('canvas');
            dstCanvas.width = dstWidth;
            dstCanvas.height = dstHeight;
            const dstCtx = dstCanvas.getContext('2d');
            dstCtx.drawImage(srcCanvas, 0, 0, dstWidth, dstHeight);

            // Convert to base64 WebP for smaller file size (falls back to PNG if unsupported)
            const dataUrl = dstCanvas.toDataURL('image/webp', 0.8);
            const base64 = dataUrl.split(',')[1];

            log(`Captured viewport screenshot (${dstWidth}x${dstHeight})`);
            return { data: base64 };
        } catch (e) {
            return { error: `Failed to capture viewport: ${e.message}` };
        }
    });
    wsc.method('viewport:focus', (ids, options = {}) => {
        const entities = ids.map((id) => api.entities.get(id)).filter(Boolean);
        if (!entities.length) {
            return { error: 'No valid entities found' };
        }
        api.selection.set(entities, { history: true });

        // Get camera and calculate target
        const camera = window.editor.call('camera:current');
        if (!camera) {
            return { error: 'Could not retrieve current camera' };
        }
        const aabb = window.editor.call('selection:aabb');
        if (!aabb) {
            return { error: 'Could not calculate selection bounds' };
        }

        // Calculate distance based on bounding box and FOV
        let distance = Math.max(aabb.halfExtents.x, aabb.halfExtents.y, aabb.halfExtents.z);
        distance /= Math.tan(0.5 * camera.camera.fov * Math.PI / 180.0);
        distance = distance * 1.1 + 1;

        // Apply orientation if specified
        if (options.view) {
            // Preset view angles (pitch, yaw)
            const views = {
                top: [-90, 0],
                bottom: [90, 0],
                front: [0, 0],
                back: [0, 180],
                left: [0, -90],
                right: [0, 90],
                perspective: [-25, 45]
            };
            const angles = views[options.view];
            if (angles) {
                camera.setEulerAngles(angles[0], angles[1], 0);
            }
        } else if (options.yaw !== undefined || options.pitch !== undefined) {
            const yaw = options.yaw ?? 45;
            const pitch = options.pitch ?? -25;
            camera.setEulerAngles(pitch, yaw, 0);
        }

        // Focus camera on target
        window.editor.call('camera:focus', aabb.center, distance);
        log(`Focused viewport on entities: ${ids.join(', ')}`);
        return { data: true };
    });

    // entities
    wsc.method('entities:create', (entityDataArray) => {
        const entities = [];
        for (const entityData of entityDataArray) {
            if (Object.hasOwn(entityData, 'parent')) {
                const parent = api.entities.get(entityData.parent);
                if (!parent) {
                    return { error: `Parent entity not found: ${entityData.parent}` };
                }
                entityData.entity.parent = parent;
            }

            const entity = api.entities.create(entityData.entity);
            if (!entity) {
                return { error: 'Failed to create entity' };
            }
            entities.push(entity);

            log(`Created entity(${entity.get('resource_id')})`);
        }
        return { data: entities.map((entity) => entity.get('resource_id')) };
    });
    wsc.method('entities:modify', (edits) => {
        for (const { id, path, value } of edits) {
            const entity = api.entities.get(id);
            if (!entity) {
                return { error: `Entity not found: ${id}` };
            }
            entity.set(path, value);
            log(`Set property(${path}) of entity(${id}) to: ${JSON.stringify(value)}`);
        }
        return { data: true };
    });
    wsc.method('entities:duplicate', async (ids, options = {}) => {
        const entities = ids.map((id) => api.entities.get(id));
        if (!entities.length) {
            return { error: 'Entities not found' };
        }
        const res = await api.entities.duplicate(entities, options);
        log(`Duplicated entities: ${res.map((entity) => entity.get('resource_id')).join(', ')}`);
        return { data: res.map((entity) => entity.get('resource_id')) };
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
        return { data: true };
    });
    wsc.method('entities:delete', async (ids) => {
        const entities = ids.map((id) => api.entities.get(id)).filter((entity) => entity !== api.entities.root);
        if (!entities.length) {
            return { error: 'No entities to delete' };
        }
        await api.entities.delete(entities);
        log(`Deleted entities: ${ids.join(', ')}`);
        return { data: true };
    });
    wsc.method('entities:list', (options = {}) => {
        let entities = api.entities.list();

        // Apply filters
        if (options.name) {
            const searchName = options.name.toLowerCase();
            entities = entities.filter((entity) => entity.get('name').toLowerCase().includes(searchName));
        }
        if (options.component) {
            entities = entities.filter((entity) => entity.get(`components.${options.component}`));
        }
        if (options.tag) {
            entities = entities.filter((entity) => entity.get('tags').includes(options.tag));
        }

        if (!entities.length) {
            return { error: 'No entities found' };
        }

        log('Listed entities');

        // Return full JSON or summary
        if (options.full) {
            return { data: entities.map((entity) => entity.json()) };
        }

        // Summary mode: return minimal data with component names
        return {
            data: entities.map((entity) => {
                const components = entity.get('components') || {};
                return {
                    resource_id: entity.get('resource_id'),
                    name: entity.get('name'),
                    parent: entity.get('parent'),
                    enabled: entity.get('enabled'),
                    tags: entity.get('tags') || [],
                    components: Object.keys(components)
                };
            })
        };
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
        return { data: true };
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
        return { data: true };
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
    wsc.method('assets:create', async (assets) => {
        try {
            // Map each asset definition to a promise that handles its creation
            const assetCreationPromises = assets.map(async ({ type, options }) => {
                if (options?.folder) {
                    options.folder = api.assets.get(options.folder);
                }

                let createPromise;

                // Determine the correct API call based on the asset type
                switch (type) {
                    case 'css':
                        createPromise = api.assets.createCss(options);
                        break;
                    case 'folder':
                        createPromise = api.assets.createFolder(options);
                        break;
                    case 'html':
                        createPromise = api.assets.createHtml(options);
                        break;
                    case 'material':
                        if (options?.data?.name) {
                            options.name = options.data.name;
                        }
                        createPromise = api.assets.createMaterial(options);
                        break;
                    case 'script':
                        createPromise = api.assets.createScript(options);
                        break;
                    case 'shader':
                        createPromise = api.assets.createShader(options);
                        break;
                    case 'template':
                        if (options?.entity) {
                            options.entity = api.entities.get(options.entity);
                        }
                        createPromise = api.assets.createTemplate(options);
                        break;
                    case 'text':
                        createPromise = api.assets.createText(options);
                        break;
                    default:
                        // Throw an error for this specific promise if type is invalid
                        throw new Error(`Invalid asset type: ${type}`);
                }

                // Await the specific asset creation promise
                const asset = await createPromise;

                // Check for creation failure and throw an error
                if (!asset) {
                    throw new Error(`Failed to create asset of type ${type}`);
                }

                // Log success and return the asset ID for this promise
                log(`Created asset(${asset.get('id')}) - Type: ${type}`);
                return asset.get('id');
            });

            // Wait for all creation promises to resolve concurrently
            const createdAssetsData = await Promise.all(assetCreationPromises);

            // Return the collected data if all promises succeeded
            return { data: createdAssetsData };
        } catch (error) {
            // Catch any error thrown during the mapping or from Promise.all
            const errorMessage =
                error instanceof Error ? error.message : 'An unknown error occurred during asset creation.';
            log(`Error creating assets: ${errorMessage}`);
            return { error: errorMessage };
        }
    });
    wsc.method('assets:delete', (ids) => {
        const assets = ids.map((id) => api.assets.get(id));
        if (!assets.length) {
            return { error: 'Assets not found' };
        }
        api.assets.delete(assets);
        log(`Deleted assets: ${ids.join(', ')}`);
        return { data: true };
    });
    wsc.method('assets:list', (options = {}) => {
        let assets = api.assets.list();

        // Apply filters
        if (options.type) {
            assets = assets.filter((asset) => asset.get('type') === options.type);
        }
        if (options.name) {
            const searchName = options.name.toLowerCase();
            assets = assets.filter((asset) => asset.get('name').toLowerCase().includes(searchName));
        }
        if (options.tag) {
            assets = assets.filter((asset) => (asset.get('tags') || []).includes(options.tag));
        }

        if (!assets.length) {
            return { error: 'No assets found' };
        }

        log('Listed assets');

        // Return full JSON or summary
        if (options.full) {
            return { data: assets.map((asset) => asset.json()) };
        }

        // Summary mode: return minimal data
        return {
            data: assets.map((asset) => {
                const path = asset.get('path') || [];
                return {
                    id: asset.get('id'),
                    name: asset.get('name'),
                    type: asset.get('type'),
                    folder: path.length > 0 ? path[path.length - 1] : null,
                    tags: asset.get('tags') || []
                };
            })
        };
    });
    wsc.method('assets:instantiate', async (ids) => {
        const assets = ids.map((id) => api.assets.get(id));
        if (!assets.length) {
            return { error: 'Assets not found' };
        }
        if (assets.some((asset) => asset.get('type') !== 'template')) {
            return { error: 'Invalid template asset' };
        }
        const entities = await api.assets.instantiateTemplates(assets);
        log(`Instantiated assets: ${ids.join(', ')}`);
        return { data: entities.map((entity) => entity.get('resource_id')) };
    });
    wsc.method('assets:property:set', (id, prop, value) => {
        const asset = api.assets.get(id);
        if (!asset) {
            return { error: 'Asset not found' };
        }
        asset.set(`data.${prop}`, value);
        log(`Set asset(${id}) property(${prop}) to: ${JSON.stringify(value)}`);
        return { data: true };
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
        return { data: true };
    });
    wsc.method('scene:settings:query', () => {
        const scene = api.settings.scene;
        log('Queried scene settings');
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
        const params = ['restricted=0', 'type=models', 'downloadable=true'];

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
})();

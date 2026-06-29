(() => {
    // This content script is injected (MAIN world, document_start) into the
    // PlayCanvas launch page. It acts as the MCP "runtime" peer: it captures
    // console output early, screenshots the *running* app, and answers
    // `runtime:*` calls from the MCP server.

    const LOG_CAP = 1000;

    /**
     * @param {string} msg - The message to log.
     */
    const log = (msg) => {
        // Use the original console (captured below) to avoid recursive buffering.
        original.log(`%c[WSC:runtime] ${msg}`, 'color:#0a6');
    };

    // ---- console / error capture (installed before the app boots) ----------

    const logs = [];
    const original = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        debug: console.debug.bind(console)
    };

    /**
     * @param {string} level - The log level.
     * @param {any[]} args - The console arguments.
     * @param {string} [stack] - Optional stack trace.
     */
    const push = (level, args, stack) => {
        const text = args.map((a) => {
            if (typeof a === 'string') {
                return a;
            }
            try {
                return JSON.stringify(a);
            } catch (e) {
                return String(a);
            }
        }).join(' ');
        logs.push({ time: Date.now(), level, text: stack ? `${text}\n${stack}` : text });
        if (logs.length > LOG_CAP) {
            logs.shift();
        }
    };

    ['log', 'info', 'warn', 'error', 'debug'].forEach((level) => {
        console[level] = (...args) => {
            push(level, args);
            original[level](...args);
        };
    });
    window.addEventListener('error', (e) => {
        push('error', [e.message], e.error?.stack || `${e.filename}:${e.lineno}:${e.colno}`);
    });
    window.addEventListener('unhandledrejection', (e) => {
        push('error', [`Unhandled promise rejection: ${e.reason?.message ?? e.reason}`], e.reason?.stack);
    });

    // ---- runtime methods ----------------------------------------------------

    const methods = new Map();

    /**
     * @returns {Object|null} The running PlayCanvas application, or null.
     */
    const getApp = () => {
        return (window.pc && (window.pc.app || (window.pc.Application && window.pc.Application.getApplication?.()))) || null;
    };

    methods.set('runtime:ping', () => ({ data: 'pong' }));

    methods.set('runtime:capture', () => new Promise((resolve) => {
        const app = getApp();
        if (!app || !app.graphicsDevice) {
            resolve({ error: 'Runtime app not ready yet. Wait for the scene to finish loading (poll read_runtime_logs) and retry.' });
            return;
        }
        const device = app.graphicsDevice;
        const gl = device.gl;
        if (!gl) {
            resolve({ error: 'WebGL context not found on the runtime app.' });
            return;
        }

        // Read the backbuffer at the end of a frame, while it is still valid.
        const onEnd = () => {
            app.off('frameend', onEnd);
            try {
                const width = device.width;
                const height = device.height;

                const pixels = new Uint8Array(width * height * 4);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

                // Flip vertically (WebGL reads bottom-to-top).
                const flipped = new Uint8Array(width * height * 4);
                const rowSize = width * 4;
                for (let y = 0; y < height; y++) {
                    flipped.set(
                        pixels.subarray((height - 1 - y) * rowSize, (height - y) * rowSize),
                        y * rowSize
                    );
                }

                const srcCanvas = document.createElement('canvas');
                srcCanvas.width = width;
                srcCanvas.height = height;
                const srcCtx = srcCanvas.getContext('2d');
                srcCtx.putImageData(new ImageData(new Uint8ClampedArray(flipped.buffer), width, height), 0, 0);

                const maxWidth = 800;
                let dstWidth = width;
                let dstHeight = height;
                if (width > maxWidth) {
                    dstWidth = maxWidth;
                    dstHeight = Math.round(height * (maxWidth / width));
                }

                const dstCanvas = document.createElement('canvas');
                dstCanvas.width = dstWidth;
                dstCanvas.height = dstHeight;
                dstCanvas.getContext('2d').drawImage(srcCanvas, 0, 0, dstWidth, dstHeight);

                const base64 = dstCanvas.toDataURL('image/webp', 0.8).split(',')[1];
                log(`Captured runtime screenshot (${dstWidth}x${dstHeight})`);
                resolve({ data: base64, meta: { mimeType: 'image/webp', width: dstWidth, height: dstHeight } });
            } catch (e) {
                resolve({ error: `Failed to capture runtime: ${e.message}` });
            }
        };
        app.on('frameend', onEnd);
    }));

    methods.set('runtime:logs', (options = {}) => {
        const order = { debug: 0, log: 1, info: 1, warn: 2, error: 3 };
        const minLevel = options.level && options.level !== 'all' ? (order[options.level] ?? 0) : 0;
        const keyword = options.keyword ? String(options.keyword).toLowerCase() : null;

        let filtered = logs.filter((entry) => (order[entry.level] ?? 1) >= minLevel);
        if (keyword) {
            filtered = filtered.filter((entry) => entry.text.toLowerCase().includes(keyword));
        }

        // Newest first so the most recent entries are returned by default.
        filtered = filtered.slice().reverse();

        const total = filtered.length;
        const limit = Number.isFinite(options.limit) ? Math.max(0, options.limit) : 100;
        const offset = Number.isFinite(options.offset) ? Math.max(0, options.offset) : 0;
        const page = limit > 0 ? filtered.slice(offset, offset + limit) : filtered.slice(offset);
        const end = offset + page.length;
        const hasMore = end < total;

        return {
            data: page,
            meta: {
                total,
                count: page.length,
                _has_more: hasMore,
                _next_cursor: hasMore ? String(end) : null
            }
        };
    });

    // ---- websocket client ---------------------------------------------------

    let ws = null;
    let retry = null;

    const connect = (address) => {
        ws = new WebSocket(address);
        ws.onopen = () => {
            ws.send(JSON.stringify({ register: 'runtime' }));
            log(`Connected to ${address}`);
        };
        ws.onmessage = async (event) => {
            try {
                const { id, name, args } = JSON.parse(event.data);
                const fn = methods.get(name);
                const res = fn ? await fn(...args) : { error: `Unknown runtime method: ${name}` };
                ws.send(JSON.stringify({ id, res }));
            } catch (e) {
                original.error('[WSC:runtime]', e);
            }
        };
        ws.onclose = () => {
            // Reconnect: the MCP server may restart while the runtime stays open.
            retry = setTimeout(() => connect(address), 1000);
        };
        ws.onerror = () => {
            try {
                ws.close();
            } catch (e) { /* ignore */ }
        };
    };

    const params = new URLSearchParams(location.search);
    const port = params.get('mcp_port');
    if (port) {
        connect(`ws://localhost:${port}`);
    } else {
        log('No mcp_port in URL; runtime peer idle (open via launch_start to enable).');
    }

    window.addEventListener('beforeunload', () => {
        if (retry) {
            clearTimeout(retry);
        }
        if (ws) {
            try {
                ws.close(1000, 'FORCE');
            } catch (e) { /* ignore */ }
        }
    });
})();

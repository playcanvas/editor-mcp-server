(() => {
    // This content script is injected (MAIN world, document_start) into the
    // PlayCanvas launch page. It acts as the MCP "runtime" peer: it captures
    // console output early, screenshots the *running* app, and answers
    // `runtime:*` calls from the MCP server.

    const LOG_CAP = 1000;

    /**
     * @param {number} ms - Milliseconds to wait.
     * @returns {Promise<void>} Resolves after the delay.
     */
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    /**
     * @param {string} msg - The message to log.
     */
    const log = (msg) => {
        // Use the original console (captured below) to avoid recursive buffering.
        original.log(`%c[WSC:runtime] ${msg}`, 'color:#0a6');
    };

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
                hasMore,
                nextCursor: hasMore ? String(end) : null
            }
        };
    });

    const SPECIAL_KEYS = {
        ' ': { key: ' ', code: 'Space', keyCode: 32 },
        'space': { key: ' ', code: 'Space', keyCode: 32 },
        'enter': { key: 'Enter', code: 'Enter', keyCode: 13 },
        'return': { key: 'Enter', code: 'Enter', keyCode: 13 },
        'escape': { key: 'Escape', code: 'Escape', keyCode: 27 },
        'esc': { key: 'Escape', code: 'Escape', keyCode: 27 },
        'tab': { key: 'Tab', code: 'Tab', keyCode: 9 },
        'backspace': { key: 'Backspace', code: 'Backspace', keyCode: 8 },
        'delete': { key: 'Delete', code: 'Delete', keyCode: 46 },
        'shift': { key: 'Shift', code: 'ShiftLeft', keyCode: 16 },
        'control': { key: 'Control', code: 'ControlLeft', keyCode: 17 },
        'ctrl': { key: 'Control', code: 'ControlLeft', keyCode: 17 },
        'alt': { key: 'Alt', code: 'AltLeft', keyCode: 18 },
        'arrowleft': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
        'left': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
        'arrowup': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
        'up': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
        'arrowright': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
        'right': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
        'arrowdown': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
        'down': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 }
    };

    /**
     * Resolve a friendly key name into the fields PlayCanvas / the DOM expect.
     *
     * @param {string} raw - The key name (e.g. 'w', 'Space', 'ArrowUp').
     * @returns {{ key: string, code: string, keyCode: number }} Key descriptor.
     */
    const keyInfo = (raw) => {
        const k = String(raw);
        const special = SPECIAL_KEYS[k.toLowerCase()];
        if (special) {
            return special;
        }
        if (k.length === 1) {
            const code = k.toUpperCase().charCodeAt(0);
            if (/[a-z]/i.test(k)) {
                return { key: k, code: `Key${k.toUpperCase()}`, keyCode: code };
            }
            if (/[0-9]/.test(k)) {
                return { key: k, code: `Digit${k}`, keyCode: code };
            }
            return { key: k, code: k, keyCode: code };
        }
        return { key: k, code: k, keyCode: 0 };
    };

    /**
     * @returns {HTMLCanvasElement|null} The running app's canvas, or null.
     */
    const getCanvas = () => {
        const app = getApp();
        return (app && app.graphicsDevice && app.graphicsDevice.canvas) || document.querySelector('canvas') || null;
    };

    const dispatchKey = (kind, info) => {
        const e = new KeyboardEvent(kind, { key: info.key, code: info.code, bubbles: true, cancelable: true, view: window });
        // keyCode/which are read-only and not settable via the constructor, but
        // PlayCanvas' keyboard handler reads them — so back them with getters.
        Object.defineProperty(e, 'keyCode', { get: () => info.keyCode });
        Object.defineProperty(e, 'which', { get: () => info.keyCode });
        window.dispatchEvent(e);
        document.dispatchEvent(e);
    };

    const dispatchMouse = (kind, canvas, x, y, button) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = rect.left + (x || 0);
        const clientY = rect.top + (y || 0);
        const buttons = kind === 'mousedown' ? (button === 2 ? 2 : button === 1 ? 4 : 1) : 0;
        canvas.dispatchEvent(new MouseEvent(kind, {
            clientX, clientY, button: button || 0, buttons, bubbles: true, cancelable: true, view: window
        }));
    };

    const dispatchTouch = (kind, canvas, x, y, id) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = rect.left + (x || 0);
        const clientY = rect.top + (y || 0);
        const touch = new Touch({ identifier: id || 0, target: canvas, clientX, clientY, pageX: clientX, pageY: clientY, radiusX: 1, radiusY: 1, force: 1 });
        const active = kind === 'touchend' ? [] : [touch];
        canvas.dispatchEvent(new TouchEvent(kind, {
            touches: active, targetTouches: active, changedTouches: [touch], bubbles: true, cancelable: true, view: window
        }));
    };

    methods.set('runtime:input', async (payload = {}) => {
        const events = Array.isArray(payload.events) ? payload.events : [];
        if (!events.length) {
            return { error: 'No input events provided.' };
        }
        const canvas = getCanvas();
        if (!canvas) {
            return { error: 'Runtime canvas not found. Ensure launch_start succeeded and the scene has loaded, then retry.' };
        }
        const betweenMs = Number.isFinite(payload.betweenMs) ? payload.betweenMs : 0;

        let dispatched = 0;
        for (const ev of events) {
            if (ev.type === 'key') {
                const info = keyInfo(ev.key);
                const action = ev.action || 'press';
                const repeat = Math.max(1, ev.repeat || 1);
                for (let i = 0; i < repeat; i++) {
                    if (action === 'down') {
                        dispatchKey('keydown', info);
                    } else if (action === 'up') {
                        dispatchKey('keyup', info);
                    } else {
                        dispatchKey('keydown', info);
                        if (ev.holdMs) {
                            // eslint-disable-next-line no-await-in-loop
                            await wait(ev.holdMs);
                        }
                        dispatchKey('keyup', info);
                    }
                    dispatched++;
                }
            } else if (ev.type === 'mouse') {
                if (ev.action === 'click') {
                    dispatchMouse('mousedown', canvas, ev.x, ev.y, ev.button);
                    dispatchMouse('mouseup', canvas, ev.x, ev.y, ev.button);
                } else {
                    dispatchMouse(`mouse${ev.action}`, canvas, ev.x, ev.y, ev.button);
                }
                dispatched++;
            } else if (ev.type === 'touch') {
                if (ev.action === 'tap') {
                    dispatchTouch('touchstart', canvas, ev.x, ev.y, ev.id);
                    dispatchTouch('touchend', canvas, ev.x, ev.y, ev.id);
                } else {
                    dispatchTouch(`touch${ev.action}`, canvas, ev.x, ev.y, ev.id);
                }
                dispatched++;
            }
            if (betweenMs) {
                // eslint-disable-next-line no-await-in-loop
                await wait(betweenMs);
            }
        }
        log(`Injected ${dispatched} input event(s)`);
        return { data: { dispatched } };
    });

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

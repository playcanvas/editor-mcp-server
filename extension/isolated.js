class MSGS {
    _ctx;

    _callbacks = new Map();

    _id = 0;

    constructor(ctx) {
        this._ctx = ctx;

        window.addEventListener('message', (event) => {
            if (event.data?.ctx === this._ctx) {
                return;
            }
            const { id, res } = event.data;
            if (this._callbacks.has(id)) {
                this._callbacks.get(id)(res);
                this._callbacks.delete(id);
            }
        });
    }

    /**
     * @param {string} name - The name of the method to call.
     * @param {...*} args - The arguments to pass to the method.
     * @returns {{ data?: any, error?: string }} The response data.
     */
    call(name, ...args) {
        const id = this._id++;
        return new Promise((resolve) => {
            this._callbacks.set(id, resolve);
            window.postMessage({ id, name, args, ctx: this._ctx });
        });
    }
}

const msgs = new MSGS('isolated');

chrome.runtime.onMessage.addListener((data, sender, sendResponse) => {
    const { name, args = [] } = data;
    msgs.call(name, ...args).then(sendResponse);
    return true;
});

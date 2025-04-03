const DEFAULT_PORT = 52000;

// UI
const root = document.createElement('div');
root.id = 'root';
document.body.appendChild(root);

const header = document.createElement('div');
header.classList.add('header');
header.textContent = 'PlayCanvas Editor MCP Extension';
root.appendChild(header);

const body = document.createElement('div');
body.classList.add('body');
root.appendChild(body);

const statusGroup = document.createElement('div');
statusGroup.classList.add('group');
body.appendChild(statusGroup);

const statusInd = document.createElement('div');
statusInd.classList.add('indicator');
statusGroup.appendChild(statusInd);

const statusLabel = document.createElement('label');
statusLabel.classList.add('label');
statusLabel.textContent = 'Disconnected';
statusGroup.appendChild(statusLabel);

const portInput = document.createElement('input');
portInput.classList.add('input');
portInput.type = 'text';
portInput.placeholder = 'Enter port number';
portInput.value = DEFAULT_PORT;
body.appendChild(portInput);

const errorLabel = document.createElement('label');
errorLabel.classList.add('label', 'error');
errorLabel.textContent = 'No Errors';
body.appendChild(errorLabel);

const connectBtn = document.createElement('button');
connectBtn.classList.add('button');
connectBtn.textContent = 'CONNECT';
body.appendChild(connectBtn);

/**
 * Creates a state management hook.
 *
 * @param {string} defaultState - The default state.
 * @returns {[function(): string, function(string): void]} The state getter and setter.
 */
const useState = (defaultState) => {
    let state;
    const get = () => state;
    const set = (value, error) => {
        state = value;
        switch (state) {
            case 'disconnected': {
                statusInd.classList.remove('connecting', 'connected');
                statusInd.classList.add('disconnected');
                statusLabel.textContent = 'Disconnected';

                portInput.disabled = false;
                portInput.classList.remove('disabled');

                connectBtn.textContent = 'CONNECT';

                break;
            }
            case 'connecting': {
                statusInd.classList.remove('connected', 'disconnected');
                statusInd.classList.add('connecting');
                statusLabel.textContent = 'Connecting';

                portInput.disabled = true;
                portInput.classList.add('disabled');

                connectBtn.textContent = 'CANCEL';
                break;
            }
            case 'connected': {
                statusInd.classList.remove('disconnected', 'connecting');
                statusInd.classList.add('connected');
                statusLabel.textContent = 'Connected';

                portInput.disabled = true;
                portInput.classList.add('disabled');

                connectBtn.textContent = 'DISCONNECT';
                break;
            }
            default: {
                console.warn('Unknown status:', status);
                break;
            }
        }

        if (error) {
            errorLabel.textContent = error;
            errorLabel.classList.remove('hidden');
        } else {
            errorLabel.classList.add('hidden');
        }
    };
    set(defaultState);
    return [get, set];
};
const [getState, setState] = useState('disconnected');

/**
 * Event handler
 */
class EventHandler {
    _handlers = new Map();

    /**
     * @param {string} name - The name of the event to add.
     * @param {(...args: any[]) => void} fn - The function to call when the event is triggered.
     */
    on(name, fn) {
        if (!this._handlers.has(name)) {
            this._handlers.set(name, []);
        }
        this._handlers.get(name).push(fn);
    }

    /**
     * @param {string} name - The name of the event to remove.
     * @param {(...args: any[]) => void} fn - The function to remove.
     */
    off(name, fn) {
        if (!this._handlers.has(name)) {
            return;
        }
        const methods = this._handlers.get(name);
        const index = methods.indexOf(fn);
        if (index !== -1) {
            methods.splice(index, 1);
        }
        if (methods.length === 0) {
            this._handlers.delete(name);
        }
    }

    /**
     * @param {string} name - The name of the event to trigger.
     * @param {...*} args - The arguments to pass to the event.
     */
    fire(name, ...args) {
        if (!this._handlers.has(name)) {
            return;
        }
        const handlers = this._handlers.get(name);
        for (let i = 0; i < handlers.length; i++) {
            handlers[i](...args);
        }
    }
}

// Listen for messages from the content script
const listener = new EventHandler();
listener.on('status', (status) => {
    setState(status);
});
chrome.runtime.onMessage.addListener((data) => {
    const { name, args } = data;
    listener.fire(name, ...args);
});

/**
 * Sends a message to the content script.
 *
 * @param {string} name - The name of the message to send.
 * @param {...*} args - The arguments to pass to the message.
 * @returns {Promise<void>} A promise that resolves when the message is sent.
 */
const send = async (name, ...args) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        console.warn('No active tab found');
        return;
    }
    chrome.tabs.sendMessage(tab.id, { name, args });
};

// Event listeners
connectBtn.addEventListener('click', () => {
    if (getState() === 'disconnected') {
        setState('connecting');
        send('connect', {
            port: portInput.value
        }).catch((e) => {
            console.error('SEND ERROR:', e);
            setState('disconnected', e.message);
        });
    } else {
        send('disconnect').catch((e) => {
            console.error('SEND ERROR:', e);
            setState('disconnected', e.message);
        });
    }
});

send('sync');

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

const autoGroup = document.createElement('div');
autoGroup.classList.add('group');
body.appendChild(autoGroup);

const autoCheckbox = document.createElement('div');
autoCheckbox.classList.add('checkbox');
autoGroup.appendChild(autoCheckbox);

const autoLabel = document.createElement('label');
autoLabel.classList.add('label');
autoLabel.textContent = 'Auto connect';
autoGroup.appendChild(autoLabel);

const connectBtn = document.createElement('button');
connectBtn.classList.add('button');
connectBtn.textContent = 'CONNECT';
body.appendChild(connectBtn);

// state management
const useState = (defaultState) => {
    let state = defaultState;
    const get = () => state;
    const set = (value) => {
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
    };
    return [get, set];
};
const [getState, setState] = useState('disconnected');

// Dummy connection logic
const connect = async (auto = false) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        throw new Error('No active tab found');
    }
    const res = await chrome.tabs.sendMessage(tab.id, {
        type: 'connect',
        auto,
        port: parseInt(portInput.value, 10) ?? DEFAULT_PORT
    });
    if (res.error) {
        throw new Error(res.error);
    }
};
const disconnect = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        throw new Error('No active tab found');
    }
    const res = await chrome.tabs.sendMessage(tab.id, {
        type: 'disconnect'
    });
    if (res.error) {
        throw new Error(res.error);
    }
};

// Event listeners
autoCheckbox.addEventListener('click', () => {
    autoCheckbox.classList.toggle('checked');
    connectBtn.classList.toggle('disabled');

    if (getState() === 'disconnected') {
        setState('connecting');
        connect().then(() => {
            setState('connected');
        }).catch(() => {
            setState('disconnected');
        });
    }
});
connectBtn.addEventListener('click', () => {
    if (getState() === 'disconnected') {
        setState('connecting');
        connect().then(() => {
            setState('connected');
        }).catch(() => {
            setState('disconnected');
        });
    } else {
        disconnect().then(() => {
            setState('disconnected');
        }).catch(() => {
            setState('disconnected');
        });
    }
});

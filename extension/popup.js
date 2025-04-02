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
portInput.value = '52000';
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
    return (value) => {
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
};
const setState = useState('disconnected');

// Dummy connection logic
let timeout;
const connect = () => {
    return new Promise((resolve) => {
        timeout = setTimeout(() => {
            resolve();
        }, 2000);
    });
};
const disconnect = () => {
    return new Promise((resolve) => {
        clearTimeout(timeout);
        resolve();
    });
};

// Event listeners
autoCheckbox.addEventListener('click', () => {
    autoCheckbox.classList.toggle('checked');
    connectBtn.classList.toggle('disabled');

    if (status === 'disconnected') {
        setState('connecting');
        connect().then(() => {
            setState('connected');
        });
    }
});
connectBtn.addEventListener('click', () => {
    if (status === 'disconnected') {
        setState('connecting');
        connect().then(() => {
            setState('connected');
        });
    } else {
        disconnect().then(() => {
            setState('disconnected');
        });
    }
});

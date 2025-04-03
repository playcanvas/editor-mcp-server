const ctx = 'isolated';
window.addEventListener('message', (event) => {
    if (event.data?.ctx === ctx) {
        return;
    }
    const { name, args } = event.data;
    chrome.runtime.sendMessage({ name, args });
});
chrome.runtime.onMessage.addListener((data) => {
    const { name, args } = data;
    window.postMessage({ name, args, ctx });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(message);
    sendResponse({ status: 'ok' });
});

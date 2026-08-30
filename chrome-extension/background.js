
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'LOGIN_PLATFORM') {
    const targetUrl = request.targetUrl;
    if (request.credentials) {
      chrome.storage.local.set({ 
        pendingLogin: {
          credentials: request.credentials,
          timestamp: Date.now()
        } 
      }, () => {
        chrome.tabs.create({ url: targetUrl });
      });
    } else {
    }
    sendResponse({ status: 'processing' });
    return true;
  }
  if (request.action === 'CONTENT_READY') {
    chrome.storage.local.get(['pendingLogin'], (result) => {
      if (result.pendingLogin && (Date.now() - result.pendingLogin.timestamp < 60000)) { 
        sendResponse({ credentials: result.pendingLogin.credentials });
      } else {
        sendResponse({ credentials: null });
      }
    });
    return true; 
  }
  if (request.action === 'CLEAR_CREDENTIALS') {
    chrome.storage.local.remove('pendingLogin', () => {
    });
    sendResponse({ status: 'cleared' });
  }
});

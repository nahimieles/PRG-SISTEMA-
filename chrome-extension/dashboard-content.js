
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.type === "TO_EXTENSION_LOGIN") {
    chrome.runtime.sendMessage({
      action: "LOGIN_PLATFORM",
      companyId: event.data.companyId,
      platform: event.data.platform,
      baseUrl: window.location.origin,
      targetUrl: event.data.targetUrl,
      credentials: event.data.credentials
    });
  }
});
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

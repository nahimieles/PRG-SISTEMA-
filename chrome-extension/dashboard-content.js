// chrome-extension/dashboard-content.js

// Escuchar mensajes de la página web (Next.js)
window.addEventListener("message", (event) => {
  // Asegurarnos de que el mensaje viene de la misma ventana
  if (event.source !== window) return;

  // Filtrar solo los mensajes dirigidos a la extensión
  if (event.data && event.data.type === "TO_EXTENSION_LOGIN") {
    // Reenviar el mensaje al background.js
    chrome.runtime.sendMessage({
      action: "LOGIN_PLATFORM",
      companyId: event.data.companyId,
      platform: event.data.platform,
      baseUrl: window.location.origin,
      targetUrl: event.data.targetUrl
    });
  }
});

// Opcional: inyectar un script en la página para decirle a React que la extensión está instalada
const script = document.createElement('script');
script.textContent = `window.__EXTENSION_INSTALLED__ = true;`;
(document.head || document.documentElement).appendChild(script);
script.remove();

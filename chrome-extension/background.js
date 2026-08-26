// chrome-extension/background.js

// Escuchar mensajes desde los content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'LOGIN_PLATFORM') {
    const targetUrl = request.targetUrl;
    if (request.credentials) {
      // Guardar credenciales en storage local temporalmente
      chrome.storage.local.set({ 
        pendingLogin: {
          credentials: request.credentials,
          timestamp: Date.now()
        } 
      }, () => {
        // Crear la pestaña UNA VEZ guardadas las credenciales
        chrome.tabs.create({ url: targetUrl });
      });
    } else {
      console.error('No se proporcionaron credenciales en el mensaje.');
    }

    // Enviar respuesta inmediata a la web
    sendResponse({ status: 'processing' });
    return true;
  }
  
  if (request.action === 'CONTENT_READY') {
    // Buscar si hay credenciales en storage
    chrome.storage.local.get(['pendingLogin'], (result) => {
      if (result.pendingLogin && (Date.now() - result.pendingLogin.timestamp < 60000)) { // 60 segundos de validez
        sendResponse({ credentials: result.pendingLogin.credentials });
      } else {
        sendResponse({ credentials: null });
      }
    });
    return true; // Necesario porque chrome.storage.local.get es asíncrono
  }

  if (request.action === 'CLEAR_CREDENTIALS') {
    chrome.storage.local.remove('pendingLogin', () => {
      console.log('Credenciales borradas tras inicio de sesión exitoso.');
    });
    sendResponse({ status: 'cleared' });
  }
});

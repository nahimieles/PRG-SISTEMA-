// chrome-extension/background.js

// Escuchar mensajes desde los content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'LOGIN_PLATFORM') {
    const { companyId, platform, baseUrl, targetUrl } = request;
    
    // 1. Hacer fetch seguro al backend usando la sesión de la aplicación web
    const apiUrl = `${baseUrl}/api/extension/credentials?companyId=${companyId}&platform=${platform}`;
    
    fetch(apiUrl, {
      method: 'GET',
      credentials: 'include' // Esto asegura que las cookies de administrador viajen al servidor
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.credentials) {
        // 2. Guardar credenciales en storage local temporalmente
        chrome.storage.local.set({ 
          pendingLogin: {
            credentials: data.credentials,
            timestamp: Date.now()
          } 
        }, () => {
          // 3. Crear la pestaña UNA VEZ guardadas las credenciales
          chrome.tabs.create({ url: targetUrl });
        });
      } else {
        console.error('Error del backend:', data.error);
      }
    })
    .catch(error => console.error('Error fetching credentials:', error));

    // Enviar respuesta inmediata a la web
    sendResponse({ status: 'processing' });
    return true;
  }
  
  if (request.action === 'CONTENT_READY') {
    // Buscar si hay credenciales en storage
    chrome.storage.local.get(['pendingLogin'], (result) => {
      if (result.pendingLogin && (Date.now() - result.pendingLogin.timestamp < 60000)) { // 60 segundos de validez
        sendResponse({ credentials: result.pendingLogin.credentials });
        
        // Opcional: No borrarlo inmediatamente porque en SRI hay redirección OIDC y se necesitarán de nuevo
        // Lo dejamos que expire solo con el tiempo.
      } else {
        sendResponse({ credentials: null });
      }
    });
    return true; // Necesario porque chrome.storage.local.get es asíncrono
  }
});

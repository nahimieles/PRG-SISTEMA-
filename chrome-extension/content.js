// chrome-extension/content.js

// Almacenar el dominio actual
const hostname = window.location.hostname;

async function simulateTyping(inputElement, text) {
  if (!text) return;
  inputElement.focus();
  
  // Method 1: React/Angular Native Setter
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(inputElement, text);
  } else {
    inputElement.value = text;
  }
  
  // Method 2: Fallback direct assignment just in case
  inputElement.value = text;
  inputElement.setAttribute('value', text);
  
  // Dispatch events to trigger framework updates
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Pequeña pausa
  await new Promise(resolve => setTimeout(resolve, 50));
  inputElement.blur();
}

// Función para simular tipeo real humano letra por letra (para SRI y formularios estrictos)
async function simulateTypingSlowly(inputElement, text) {
  if (!text) return;
  inputElement.focus();
  inputElement.value = '';
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const keyCode = char.charCodeAt(0);
    
    inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: char, keyCode, charCode: keyCode, bubbles: true }));
    inputElement.dispatchEvent(new KeyboardEvent('keypress', { key: char, keyCode, charCode: keyCode, bubbles: true }));
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(inputElement, inputElement.value + char);
    } else {
      inputElement.value = inputElement.value + char;
    }
    
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new KeyboardEvent('keyup', { key: char, keyCode, charCode: keyCode, bubbles: true }));
    
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  
  inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  inputElement.blur();
}

function waitForElement(selector, maxWaitMs = 15000) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }
    
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, maxWaitMs);
  });
}

async function performLogin(credentials) {
  console.log('[Accesos Empresariales Bot] Iniciando performLogin para:', hostname);
  try {
    if (hostname.includes('sri.gob.ec')) {
      const userSelector = 'input[id="usuario"], input[id="username"], input[name="username"], input[name="usuario"], input[formcontrolname="usuario"], input[type="text"]';
      const passSelector = 'input[id="password"], input[name="password"], input[type="password"]';
      const btnSelector = 'button[type="submit"], input[type="submit"], button.p-button, #kc-login, button[name="submit"]';

      console.log('[Accesos Empresariales Bot] Buscando campos de SRI...');
      const userInput = await waitForElement(userSelector);
      const passInput = await waitForElement(passSelector);
      
      console.log('[Accesos Empresariales Bot] userInput encontrado:', !!userInput);
      console.log('[Accesos Empresariales Bot] passInput encontrado:', !!passInput);

      if (userInput && passInput) {
        console.log('[Accesos Empresariales Bot] Simulando escritura lenta del usuario...');
        await simulateTypingSlowly(userInput, credentials.username || '');
        
        console.log('[Accesos Empresariales Bot] Simulando escritura de la clave...');
        await simulateTypingSlowly(passInput, credentials.password || '');
        
        console.log('[Accesos Empresariales Bot] Pausa de 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('[Accesos Empresariales Bot] Buscando botón de submit:', btnSelector);
        const submitBtn = document.querySelector(btnSelector);
        console.log('[Accesos Empresariales Bot] Botón encontrado:', !!submitBtn);
        if (submitBtn) {
          console.log('[Accesos Empresariales Bot] Haciendo click en ingresar...');
          submitBtn.click();
        } else {
          console.error('[Accesos Empresariales Bot] No se encontró el botón de ingresar');
        }
      } else {
        console.error('[Accesos Empresariales Bot] No se encontraron los campos de usuario o contraseña');
      }
    } else if (hostname.includes('iess.gob.ec')) {
      // Selectores IESS
      const userSelector = 'input[id*="cedula"], input[id*="ruc"], input[name*="cedula"]';
      const passSelector = 'input[type="password"]';
      const btnSelector = 'input[type="submit"], button[type="submit"]';

      const userInput = await waitForElement(userSelector);
      const passInput = await waitForElement(passSelector);
      
      if (userInput && passInput) {
        await simulateTyping(userInput, credentials.username);
        await simulateTyping(passInput, credentials.password);
        
        // Dar tiempo a frameworks (Angular/React) para actualizar sus estados internos
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const submitBtn = document.querySelector(btnSelector);
        if (submitBtn) {
          submitBtn.click();
        }
      }
    } else if (hostname.includes('contifico.com') || hostname.includes('siigo.com')) {
      // Contífico / Siigo
      const userSelector = 'input[id="username_input"], input[id="email"], input[name="email"], input[type="text"], input[type="email"], input[name*="login"]';
      const passSelector = 'input[id="password_input"], input[id="password"], input[type="password"]';
      const btnSelector = 'button[type="submit"], input[type="submit"], button[id="login_button"]';

      const userInput = await waitForElement(userSelector);
      const passInput = await waitForElement(passSelector);
      
      if (userInput && passInput) {
        await simulateTyping(userInput, credentials.username);
        await simulateTyping(passInput, credentials.password);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const submitBtn = document.querySelector(btnSelector);
        if (submitBtn) {
          submitBtn.click();
        }
      }
    } else if (hostname.includes('perseo.app') || hostname.includes('perseo')) {
      // Perseo
      // Flujo: 1. Ingresar RUC -> Buscar 2. Ingresar Password -> Ingresar
      const rucSelector = 'input[placeholder*="RUC"], input[placeholder*="Cédula"], input[placeholder*="pasaporte"], input[name="ruc"], input[name="identificacion"], input[type="text"]';
      const passSelector = 'input[type="password"]';
      
      let passInput = document.querySelector(passSelector);
      
      if (!passInput) {
        // Pantalla paso 1: RUC
        const rucInput = await waitForElement(rucSelector, 5000);
        if (rucInput) {
          await simulateTyping(rucInput, credentials.username);
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Encontrar botón "Buscar mi sistema"
          const buttons = Array.from(document.querySelectorAll('button'));
          const searchBtn = buttons.find(b => b.innerText && b.innerText.toLowerCase().includes('buscar')) || document.querySelector('button[type="submit"]');
          
          if (searchBtn) {
            searchBtn.click();
          }
        }
        // Esperar a que aparezca el campo de contraseña
        passInput = await waitForElement(passSelector, 10000);
      }
      
      if (passInput) {
        await simulateTyping(passInput, credentials.password);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        const loginBtn = buttons.find(b => {
          const text = (b.innerText || b.value || '').toLowerCase();
          return text.includes('ingresar') || text.includes('iniciar');
        }) || document.querySelector('button[type="submit"]');
        
        if (loginBtn) {
          loginBtn.click();
        }
      }
    }
  } catch (err) {
    console.error('[Accesos Empresariales Bot] Error fatal en performLogin:', err);
  }
}

// Inicializar: Preguntar al background si hay credenciales para nosotros con reintentos
console.log('[Accesos Empresariales Bot] Script cargado. Solicitando credenciales al background...');

function requestCredentials(retries = 10) {
  chrome.runtime.sendMessage({ action: 'CONTENT_READY' }, (response) => {
    if (response && response.credentials) {
      console.log('[Accesos Empresariales Bot] Credenciales recibidas del background');
      performLogin(response.credentials);
    } else {
      if (retries > 0) {
        console.log(`[Accesos Empresariales Bot] No recibidas, reintentando en 200ms... (Quedan ${retries} intentos)`);
        setTimeout(() => requestCredentials(retries - 1), 200);
      } else {
        console.log('[Accesos Empresariales Bot] No hay credenciales pendientes para esta pestaña después de varios intentos');
      }
    }
  });
}

requestCredentials();

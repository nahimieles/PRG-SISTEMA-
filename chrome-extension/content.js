
const hostname = window.location.hostname;
async function simulateTyping(inputElement, text) {
  if (!text) return;
  inputElement.focus();
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(inputElement, text);
  } else {
    inputElement.value = text;
  }
  inputElement.value = text;
  inputElement.setAttribute('value', text);
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 50));
  inputElement.blur();
}
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
function isElementVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
}
function waitForElement(selector, maxWaitMs = 15000) {
  return new Promise((resolve) => {
    const checkNodes = () => {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (isElementVisible(el)) {
          return el;
        }
      }
      return null;
    };
    const initialMatch = checkNodes();
    if (initialMatch) return resolve(initialMatch);
    const observer = new MutationObserver(() => {
      const match = checkNodes();
      if (match) {
        observer.disconnect();
        resolve(match);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, maxWaitMs);
  });
}
async function performLogin(credentials) {
  try {
    if (hostname.includes('sri.gob.ec')) {
      const userSelector = 'input[id="usuario"]:not([type="hidden"]), input[id="username"]:not([type="hidden"])';
      const passSelector = 'input[id="password"]:not([type="hidden"]), input[type="password"]:not([type="hidden"])';
      const btnSelector = 'button[type="submit"], input[type="submit"], button.p-button, #kc-login, button[name="submit"]';
      const userInput = await waitForElement(userSelector);
      const passInput = await waitForElement(passSelector);
      if (userInput && passInput) {
        await simulateTyping(userInput, credentials.username || '');
        await simulateTyping(passInput, credentials.password || '');
        await new Promise(resolve => setTimeout(resolve, 500));
        const submitBtn = document.querySelector(btnSelector);
        if (submitBtn) {
          chrome.runtime.sendMessage({ action: 'CLEAR_CREDENTIALS' });
          submitBtn.click();
        } else {
        }
      } else {
      }
    } else if (hostname.includes('iess.gob.ec')) {
      const userSelector = 'input[id*="cedula"], input[id*="ruc"], input[name*="cedula"]';
      const passSelector = 'input[type="password"]';
      const btnSelector = 'input[type="submit"], button[type="submit"]';
      const userInput = await waitForElement(userSelector);
      const passInput = await waitForElement(passSelector);
      if (userInput && passInput) {
        await simulateTyping(userInput, credentials.username);
        await simulateTyping(passInput, credentials.password);
        await new Promise(resolve => setTimeout(resolve, 500));
        const submitBtn = document.querySelector(btnSelector);
        if (submitBtn) {
          chrome.runtime.sendMessage({ action: 'CLEAR_CREDENTIALS' });
          submitBtn.click();
        }
      }
    } else if (hostname.includes('contifico.com') || hostname.includes('siigo.com')) {
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
          chrome.runtime.sendMessage({ action: 'CLEAR_CREDENTIALS' });
          submitBtn.click();
        }
      }
    } else if (hostname.includes('perseo.app') || hostname.includes('perseo')) {
      const rucSelector = 'input[placeholder*="RUC"], input[placeholder*="Cédula"], input[placeholder*="pasaporte"], input[name="ruc"], input[name="identificacion"], input[type="text"]';
      const passSelector = 'input[type="password"]';
      let passInput = document.querySelector(passSelector);
      if (!passInput) {
        const rucInput = await waitForElement(rucSelector, 5000);
        if (rucInput) {
          await simulateTyping(rucInput, credentials.username);
          await new Promise(resolve => setTimeout(resolve, 300));
          const buttons = Array.from(document.querySelectorAll('button'));
          const searchBtn = buttons.find(b => b.innerText && b.innerText.toLowerCase().includes('buscar')) || document.querySelector('button[type="submit"]');
          if (searchBtn) {
            searchBtn.click();
          }
        }
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
          chrome.runtime.sendMessage({ action: 'CLEAR_CREDENTIALS' });
          loginBtn.click();
        }
      }
    }
  } catch (err) {
  }
}
function requestCredentials(retries = 10) {
  chrome.runtime.sendMessage({ action: 'CONTENT_READY' }, (response) => {
    if (response && response.credentials) {
      performLogin(response.credentials);
    } else {
      if (retries > 0) {
        setTimeout(() => requestCredentials(retries - 1), 200);
      } else {
      }
    }
  });
}
requestCredentials();

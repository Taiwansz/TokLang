// TokLang Browser Extension - Content Script

function injectCompressButton() {
  // Common textareas for ChatGPT, Claude, and Gemini
  const targets = [
    '#prompt-textarea',
    '#min-textarea',
    'textarea[placeholder*="ChatGPT"]',
    'textarea[placeholder*="Claude"]',
    'textarea[placeholder*="Gemini"]',
    'div[contenteditable="true"]',
    'textarea'
  ];

  for (const selector of targets) {
    const inputEl = document.querySelector(selector);
    if (!inputEl || inputEl.dataset.toklangInjected) continue;

    // Mark as injected
    inputEl.dataset.toklangInjected = "true";

    // Create TokLang compress button
    const btn = document.createElement('button');
    btn.innerText = '⚡ Comprimir';
    btn.style.position = 'absolute';
    btn.style.right = '45px';
    btn.style.bottom = '8px';
    btn.style.zIndex = '9999';
    btn.style.background = '#00ff88';
    btn.style.color = '#0c0f16';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.padding = '5px 9px';
    btn.style.fontFamily = 'monospace';
    btn.style.fontSize = '10px';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';
    btn.style.opacity = '0.75';
    btn.style.transition = 'opacity 0.2s';
    
    btn.addEventListener('mouseover', () => btn.style.opacity = '1');
    btn.addEventListener('mouseout', () => btn.style.opacity = '0.75');

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const text = inputEl.value || inputEl.innerText || '';
      if (!text.trim()) return;

      // 1. Try local compression
      const customVocab = null; // Can be fetched from chrome.storage.local
      const engine = window.TokLangEngine;
      let result = null;
      if (engine) {
        result = engine.compressLocally(text, customVocab);
      }

      if (result) {
        updateInputValue(inputEl, result);
        showTemporaryToast(btn, 'Comprimido!');
      } else {
        // Fallback to online API if key exists in storage
        chrome.storage.local.get(['apiKey'], (data) => {
          const key = data.apiKey;
          if (!key) {
            showTemporaryToast(btn, 'Faça Login na Extensão');
            return;
          }
          btn.innerText = '⌛...';
          fetch('https://toklang.dev/api/v1/compress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': key
            },
            body: JSON.stringify({ prompt: text })
          })
          .then(res => res.json())
          .then(data => {
            if (data.compressed) {
              updateInputValue(inputEl, data.compressed);
              showTemporaryToast(btn, 'Comprimido!');
            } else {
              showTemporaryToast(btn, 'Prompt longo');
            }
          })
          .catch(() => {
            showTemporaryToast(btn, 'Erro API');
          })
          .finally(() => {
            btn.innerText = '⚡ Comprimir';
          });
        });
      }
    });

    // Ingress inside parent container of input element
    const parent = inputEl.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(btn);
    }
  }
}

function updateInputValue(el, value) {
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    el.value = value;
  } else if (el.getAttribute('contenteditable') === 'true') {
    el.innerText = value;
  }
  // Dispatch input & change events for React/Vue frameworks to detect the value change
  const event = new Event('input', { bubbles: true });
  el.dispatchEvent(event);
  const changeEvent = new Event('change', { bubbles: true });
  el.dispatchEvent(changeEvent);
}

function showTemporaryToast(btn, message) {
  const original = btn.innerText;
  btn.innerText = message;
  setTimeout(() => {
    btn.innerText = original;
  }, 2000);
}

// Poll periodically to inject on dynamically loaded prompt textareas
setInterval(injectCompressButton, 1000);

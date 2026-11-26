// TokLang v2.0 Browser Extension - Content Script (Offline-First, Zero Emojis, Industrial Pop Palette)

function injectCompressButton() {
  const targets = [
    '#prompt-textarea',
    '#min-textarea',
    'textarea[placeholder*="ChatGPT"]',
    'textarea[placeholder*="Claude"]',
    'textarea[placeholder*="Gemini"]',
    'div[contenteditable="true"]',
    'textarea',
  ];

  for (const selector of targets) {
    const inputEl = document.querySelector(selector);
    if (!inputEl || inputEl.dataset.toklangInjected) continue;

    inputEl.dataset.toklangInjected = 'true';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerText = 'TokLang v2';
    btn.style.position = 'absolute';
    btn.style.right = '48px';
    btn.style.bottom = '8px';
    btn.style.zIndex = '9999';
    btn.style.background = '#C9341B';
    btn.style.color = '#F5F2EA';
    btn.style.border = '1px solid rgba(14, 17, 22, 0.2)';
    btn.style.borderRadius = '6px';
    btn.style.padding = '5px 10px';
    btn.style.fontFamily = '"JetBrains Mono", monospace';
    btn.style.fontSize = '11px';
    btn.style.fontWeight = '600';
    btn.style.cursor = 'pointer';
    btn.style.opacity = '0.9';
    btn.style.transition = 'transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.16s ease';

    btn.addEventListener('mouseover', () => { btn.style.opacity = '1'; });
    btn.addEventListener('mouseout', () => { btn.style.opacity = '0.9'; });
    btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.96)'; });
    btn.addEventListener('mouseup', () => { btn.style.transform = 'scale(1)'; });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const text = inputEl.value || inputEl.innerText || '';
      if (!text.trim()) return;

      const engine = window.TokLangEngine;
      if (!engine || typeof engine.compile !== 'function') {
        showTemporaryToast(btn, 'Engine v2 indisponivel');
        return;
      }

      const report = engine.compile(text, { mode: 'balanced' });
      if (report && report.text) {
        updateInputValue(inputEl, report.text);
        showTemporaryToast(btn, `-${Math.round(report.savingsPct)}% BPE`);
      }
    });

    const parent = inputEl.parentElement;
    if (parent) {
      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
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
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function showTemporaryToast(btn, message) {
  const original = btn.innerText;
  btn.innerText = message;
  setTimeout(() => {
    btn.innerText = original;
  }, 2200);
}

setInterval(injectCompressButton, 1000);

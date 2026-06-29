// TokLang Browser Extension - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('api-key-input');
  const saveBtn = document.getElementById('save-btn');
  const statusEl = document.getElementById('status-msg');

  // Load saved API Key
  chrome.storage.local.get(['apiKey'], (data) => {
    if (data.apiKey) {
      inputEl.value = data.apiKey;
    }
  });

  // Save API Key
  saveBtn.addEventListener('click', () => {
    const key = inputEl.value.trim();
    chrome.storage.local.set({ apiKey: key }, () => {
      statusEl.textContent = 'Chave salva com sucesso!';
      setTimeout(() => {
        statusEl.textContent = '';
      }, 2000);
    });
  });
});

/**
 * TokLang SDK - Official JavaScript Client
 */
class TokLang {
  constructor(apiKey, options = {}) {
    if (!apiKey) throw new Error('TokLang API Key is required');
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'https://toklang.dev/api/v1';
  }

  /**
   * Comprime um prompt usando compressão semântica.
   * @param {string} prompt - O prompt em linguagem natural.
   * @returns {Promise<Object>} - Objeto contendo o texto comprimido e a economia.
   */
  async compress(prompt) {
    try {
      const response = await fetch(`${this.baseUrl}/compress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro na compressão do TokLang');
      }

      return data;
    } catch (error) {
      console.error('[TokLang SDK] Error:', error.message);
      throw error;
    }
  }
}

// Export para uso em Node.js ou Navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokLang;
} else {
  window.TokLang = TokLang;
}

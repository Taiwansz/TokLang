/**
 * TokLang SDK - Official JavaScript Client & Middleware
 */

// If imported in Node, try to load TokLangEngine
let LocalEngine = null;
if (typeof require !== 'undefined') {
  try {
    LocalEngine = require('./toklang-engine');
  } catch (e) {}
}

function countTokens(t) {
  if (!t || !t.trim()) return 0;
  const words = t.trim().split(/\s+/).length;
  const puncMatches = t.match(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]]/g);
  const puncCount = puncMatches ? puncMatches.length : 0;
  return Math.max(1, Math.round(words * 1.25 + puncCount * 0.4));
}

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
    // Check local engine first
    const engine = LocalEngine || (typeof window !== 'undefined' && window.TokLangEngine);
    if (engine) {
      const local = engine.compressLocally(prompt);
      if (local) {
        const tokBefore = countTokens(prompt);
        const tokAfter = countTokens(local);
        return {
          compressed: local,
          savings: Math.max(0, Math.round((1 - tokAfter / tokBefore) * 100)) + '%'
        };
      }
    }

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

class TokLangMiddleware {
  constructor(config = {}) {
    this.target = config.target || 'openai';
    this.apiKey = config.apiKey;
    this.tokLangKey = config.tokLangKey;
    this.baseUrl = config.baseUrl || 'https://toklang.dev/api/v1';

    const compressFn = async (prompt) => {
      // Try local engine first
      const engine = LocalEngine || (typeof window !== 'undefined' && window.TokLangEngine);
      if (engine) {
        const local = engine.compressLocally(prompt);
        if (local) return local;
      }
      if (!this.tokLangKey) return prompt; // Return uncompressed if key missing
      
      try {
        const response = await fetch(`${this.baseUrl}/compress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.tokLangKey
          },
          body: JSON.stringify({ prompt })
        });
        if (response.ok) {
          const data = await response.json();
          return data.compressed;
        }
      } catch (e) {
        console.warn('[TokLang SDK Middleware] Compression request failed, passing original prompt.', e);
      }
      return prompt;
    };

    if (this.target === 'openai') {
      this.chat = {
        completions: {
          create: async (params) => {
            // Intercept user messages and compress
            if (params && params.messages && Array.isArray(params.messages)) {
              for (const msg of params.messages) {
                if (msg.role === 'user' && typeof msg.content === 'string') {
                  msg.content = await compressFn(msg.content);
                }
              }
            }

            if (!this.apiKey) {
              console.warn('[TokLang Middleware] OpenAI API Key missing. Returning simulation.');
              return {
                choices: [{
                  message: {
                    role: 'assistant',
                    content: 'Simulated OpenAI completion via TokLangMiddleware.'
                  }
                }]
              };
            }

            // Real HTTP call to OpenAI completions
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
              },
              body: JSON.stringify(params)
            });
            return await response.json();
          }
        }
      };
    } else if (this.target === 'anthropic') {
      this.messages = {
        create: async (params) => {
          if (params && params.messages && Array.isArray(params.messages)) {
            for (const msg of params.messages) {
              if (msg.role === 'user' && typeof msg.content === 'string') {
                msg.content = await compressFn(msg.content);
              }
            }
          }

          if (!this.apiKey) {
            console.warn('[TokLang Middleware] Anthropic API Key missing. Returning simulation.');
            return {
              content: [{ type: 'text', text: 'Simulated Anthropic response via TokLangMiddleware.' }]
            };
          }

          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': this.apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(params)
          });
          return await response.json();
        }
      };
    }
  }
}

// Export para uso em Node.js ou Navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TokLang, TokLangMiddleware };
} else {
  window.TokLang = TokLang;
  window.TokLangMiddleware = TokLangMiddleware;
}

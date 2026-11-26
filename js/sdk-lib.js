/**
 * TokLang v2.0 SDK - Official JavaScript Client & CAPC Middleware
 * Offline-first deterministic compilation with real BPE monotonicity guard
 * and Cache-Aware Prompt Compression (CAPC) for OpenAI and Anthropic SDKs.
 */

let LocalEngine = null;
if (typeof require !== 'undefined') {
  try {
    LocalEngine = require('./toklang-engine');
  } catch (_) {
    LocalEngine = null;
  }
}

function getEngine() {
  const engine = LocalEngine || (typeof window !== 'undefined' && window.TokLangEngine);
  if (!engine) {
    throw new Error('TokLangEngine v2 not found in runtime.');
  }
  return engine;
}

class TokLang {
  constructor(apiKey = null, options = {}) {
    if (options.requireApiKey && !apiKey) {
      throw new Error('TokLang API Key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'https://toklang.dev/api/v1';
    this.customVocab = options.customVocab || null;
    this.defaultMode = options.mode || 'balanced';
    this.defaultEncoding = options.encoding || 'o200k_base';
  }

  compile(prompt, options = {}) {
    const engine = getEngine();
    return engine.compile(prompt, {
      mode: options.mode || this.defaultMode,
      encoding: options.encoding || this.defaultEncoding,
      maxTokens: options.maxTokens || null,
      query: options.query || '',
      focusTerms: options.focusTerms || [],
      customVocab: options.customVocab || this.customVocab,
    });
  }

  compileMessages(messages, options = {}) {
    const engine = getEngine();
    return engine.compileMessages(messages, {
      provider: options.provider || 'openai',
      mode: options.mode || this.defaultMode,
      encoding: options.encoding || this.defaultEncoding,
      customVocab: options.customVocab || this.customVocab,
      maxDynamicTokensPerMessage: options.maxDynamicTokensPerMessage || null,
      cacheHitRate: options.cacheHitRate,
    });
  }

  async compress(prompt, options = {}) {
    const report = this.compile(prompt, options);
    if (!options.remote) {
      return {
        compressed: report.text,
        savings: `${Math.round(report.savingsPct)}%`,
        savingsPct: report.savingsPct,
        tokensBefore: report.tokensBefore,
        tokensAfter: report.tokensAfter,
        tokensSaved: report.tokensSaved,
        attentionFlopsReductionPct: report.attentionFlopsReductionPct,
        prefixHash: report.prefixHash,
        stagesApplied: report.stagesApplied,
        audit: report.audit,
        latencyMs: report.latencyMs,
      };
    }

    if (!this.apiKey) {
      throw new Error('TokLang API Key is required for remote mode');
    }

    const response = await fetch(`${this.baseUrl}/compress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        prompt,
        mode: options.mode || this.defaultMode,
        maxTokens: options.maxTokens || null,
        query: options.query || '',
        encoding: options.encoding || this.defaultEncoding,
        customVocab: options.customVocab || this.customVocab,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'TokLang remote compression error');
    }
    return data;
  }

  encodeStructured(value) {
    return getEngine().encodeStructured(value);
  }

  decodeStructured(encoded) {
    return getEngine().decodeStructured(encoded);
  }

  expand(toklangText, options = {}) {
    const customVocab = options.customVocab || this.customVocab;
    return getEngine().expand(toklangText, customVocab);
  }
}

class TokLangMiddleware {
  constructor(config = {}) {
    this.target = (config.target || 'openai').toLowerCase();
    this.apiKey = config.apiKey || null;
    this.tokLangKey = config.tokLangKey || null;
    this.baseUrl = config.baseUrl || 'https://toklang.dev/api/v1';
    this.customVocab = config.customVocab || null;
    this.mode = config.mode || 'balanced';
    this.maxDynamicTokensPerMessage = config.maxDynamicTokensPerMessage || null;
    this.lastReport = null;

    const compilePayloadMessages = (messages, provider) => {
      const engine = getEngine();
      const report = engine.compileMessages(messages, {
        provider,
        mode: this.mode,
        customVocab: this.customVocab,
        maxDynamicTokensPerMessage: this.maxDynamicTokensPerMessage,
      });
      this.lastReport = report;
      return report.messages;
    };

    if (this.target === 'openai') {
      this.chat = {
        completions: {
          create: async (params) => {
            const nextParams = { ...params };
            if (nextParams && Array.isArray(nextParams.messages)) {
              nextParams.messages = compilePayloadMessages(nextParams.messages, 'openai');
            }

            if (!this.apiKey) {
              return {
                choices: [{
                  message: {
                    role: 'assistant',
                    content: 'Simulated OpenAI completion via TokLangMiddleware v2.',
                  },
                }],
                toklang: this.lastReport,
              };
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
              },
              body: JSON.stringify(nextParams),
            });
            return await response.json();
          },
        },
      };
    } else if (this.target === 'anthropic') {
      this.messages = {
        create: async (params) => {
          const nextParams = { ...params };
          const combined = [];
          const hasTopLevelSystem = typeof nextParams.system === 'string' && nextParams.system.trim().length > 0;
          if (hasTopLevelSystem) {
            combined.push({ role: 'system', content: nextParams.system });
          }
          if (Array.isArray(nextParams.messages)) {
            for (const m of nextParams.messages) combined.push(m);
          }

          if (combined.length > 0) {
            const compiled = compilePayloadMessages(combined, 'anthropic');
            if (hasTopLevelSystem) {
              const sysMsg = compiled.shift();
              nextParams.system = sysMsg.cache_control
                ? [{ type: 'text', text: sysMsg.content, cache_control: sysMsg.cache_control }]
                : sysMsg.content;
            }
            nextParams.messages = compiled;
          }

          if (!this.apiKey) {
            return {
              content: [{ type: 'text', text: 'Simulated Anthropic response via TokLangMiddleware v2.' }],
              toklang: this.lastReport,
            };
          }

          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': this.apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(nextParams),
          });
          return await response.json();
        },
      };
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TokLang, TokLangMiddleware };
} else {
  window.TokLang = TokLang;
  window.TokLangMiddleware = TokLangMiddleware;
}

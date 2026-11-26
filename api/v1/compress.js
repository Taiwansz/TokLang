import { createClient } from '@supabase/supabase-js';
import TokLangEngine from '../../js/toklang-engine.js';

const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = req.headers['x-api-key'];
  const { prompt, messages, mode = 'balanced', maxTokens = null, query = '', encoding = 'o200k_base', provider = 'openai', customVocab = null } = req.body || {};

  if (!apiKey) return res.status(401).json({ error: 'API Key missing' });
  if (!prompt && !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Either prompt or messages[] is required' });
  }

  try {
    let profile = null;
    let mergedVocab = customVocab;

    if (supabase) {
      const { data: dbProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('api_key', apiKey)
        .single();

      if (profileError || !dbProfile) {
        return res.status(403).json({ error: 'Invalid API Key' });
      }
      profile = dbProfile;

      const plan = (profile.plan || 'free').toLowerCase();
      if (plan === 'free') {
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        const { count } = await supabase
          .from('history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .gte('created_at', startOfToday.toISOString());

        if (count >= 5) {
          return res.status(402).json({ error: 'Daily quota of 5 compressions exceeded for Free plan.' });
        }
      } else if (plan === 'starter') {
        const { count } = await supabase
          .from('history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);

        if (count >= 500) {
          return res.status(402).json({ error: 'Monthly quota exceeded for Starter plan.' });
        }
      }

      const { data: vocabList } = await supabase
        .from('vocabulary')
        .select('term, definition')
        .eq('user_id', profile.id);

      if (vocabList && vocabList.length > 0 && !mergedVocab) {
        mergedVocab = vocabList;
      }
    }

    // CAPC Multi-turn Messages compilation (100% deterministic, zero external LLM roundtrip)
    if (Array.isArray(messages)) {
      const capcReport = TokLangEngine.compileMessages(messages, {
        provider,
        mode,
        encoding,
        customVocab: mergedVocab,
      });

      return res.status(200).json({
        version: capcReport.version,
        provider: capcReport.provider,
        messages: capcReport.messages,
        cache: capcReport.cache,
        metrics: capcReport.metrics,
        economics: capcReport.economics,
        audit: capcReport.audit,
      });
    }

    // Single prompt/payload compilation (100% deterministic, BPE-verified, zero external LLM call)
    const report = TokLangEngine.compile(prompt, {
      mode,
      maxTokens,
      query,
      encoding,
      customVocab: mergedVocab,
    });

    if (supabase && profile) {
      await supabase.from('history').insert({
        user_id: profile.id,
        original_text: prompt,
        compressed_text: report.text,
        tokens_before: report.tokensBefore,
        tokens_after: report.tokensAfter,
        savings_pct: Math.round(report.savingsPct),
      });

      if (profile.webhook_url) {
        fetch(profile.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'prompt.compressed',
            version: report.version,
            user_id: profile.id,
            original_text: prompt,
            compressed_text: report.text,
            tokens_before: report.tokensBefore,
            tokens_after: report.tokensAfter,
            savings_pct: report.savingsPct,
            prefix_hash: report.prefixHash,
          }),
        }).catch((e) => console.error('Webhook delivery failed:', e.message));
      }
    }

    return res.status(200).json({
      version: report.version,
      compressed: report.text,
      savings: `${Math.round(report.savingsPct)}%`,
      savings_pct: report.savingsPct,
      tokens_before: report.tokensBefore,
      tokens_after: report.tokensAfter,
      tokens_saved: report.tokensSaved,
      attention_flops_reduction_pct: report.attentionFlopsReductionPct,
      prefix_hash: report.prefixHash,
      stages_applied: report.stagesApplied,
      tokenizer: report.tokenizer,
      latency_ms: report.latencyMs,
      audit: report.audit,
    });
  } catch (error) {
    console.error('TokLang v2 API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

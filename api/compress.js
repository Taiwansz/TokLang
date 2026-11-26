import { createClient } from '@supabase/supabase-js';
import TokLangEngine from '../js/toklang-engine.js';

async function fireEmailAlert({ type, user, used, limit }) {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-toklang-internal': process.env.INTERNAL_API_SECRET || '',
      },
      body: JSON.stringify({
        type,
        to: user.email,
        name: user.user_metadata?.name || user.email.split('@')[0],
        plan: (user.user_metadata?.plan || 'free').toLowerCase(),
        used,
        limit,
      }),
    });
  } catch (e) {
    console.warn('[compress] Email alert failed (non-blocking):', e.message);
  }
}

const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, mode = 'balanced', maxTokens = null, query = '', encoding = 'o200k_base', customVocab = null } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  let user = null;
  let userVocab = customVocab;
  const authHeader = req.headers.authorization;

  if (supabase && authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const { data: { user: supabaseUser } } = await supabase.auth.getUser(token);
      user = supabaseUser;
    } catch (e) {
      console.warn('Could not verify user token:', e.message);
    }
  }

  if (supabase && user) {
    const plan = (user.user_metadata?.plan || 'free').toLowerCase();

    if (plan === 'free') {
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfToday.toISOString());

      const LIMIT = 5;
      if (count >= LIMIT) {
        fireEmailAlert({ type: 'usage_alert', user, used: count, limit: LIMIT });
        return res.status(402).json({ error: 'Limite diário de 5 compressões atingido para o Plano Free.' });
      }
      if (count + 1 >= Math.floor(LIMIT * 0.8)) {
        fireEmailAlert({ type: 'usage_alert', user, used: count + 1, limit: LIMIT });
      }
    } else if (plan === 'starter') {
      const { count } = await supabase
        .from('history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const LIMIT = 500;
      if (count >= LIMIT) {
        fireEmailAlert({ type: 'usage_alert', user, used: count, limit: LIMIT });
        return res.status(402).json({ error: 'Limite mensal de 500 compressões atingido para o Plano Starter.' });
      }
      if (count + 1 >= Math.floor(LIMIT * 0.8)) {
        fireEmailAlert({ type: 'usage_alert', user, used: count + 1, limit: LIMIT });
      }
    }

    if (!userVocab) {
      const { data: vocabRows } = await supabase
        .from('vocabulary')
        .select('term, definition')
        .eq('user_id', user.id);
      if (vocabRows && vocabRows.length > 0) userVocab = vocabRows;
    }
  }

  try {
    // 100% deterministic local v2 compilation with real BPE verification (zero external LLM cost/latency)
    const report = TokLangEngine.compile(prompt, {
      mode,
      maxTokens,
      query,
      encoding,
      customVocab: userVocab,
    });

    return res.status(200).json({
      version: report.version,
      compressed: report.text,
      tokens_before: report.tokensBefore,
      tokens_after: report.tokensAfter,
      tokens_saved: report.tokensSaved,
      savings_pct: report.savingsPct,
      attention_flops_reduction_pct: report.attentionFlopsReductionPct,
      prefix_hash: report.prefixHash,
      stages_applied: report.stagesApplied,
      tokenizer: report.tokenizer,
      latency_ms: report.latencyMs,
      audit: report.audit,
    });
  } catch (error) {
    console.error('TokLang v2 Compression error:', error);
    return res.status(500).json({ error: error.message });
  }
}

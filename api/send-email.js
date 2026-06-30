import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Limites por plano ─────────────────────────────────────────────────────────
const PLAN_LIMITS = {
  free:    { daily: 5,    monthly: null },
  starter: { daily: null, monthly: 500  },
  pro:     { daily: null, monthly: 2000 },
  team:    { daily: null, monthly: null }, // ilimitado
};

// ── Templates de E-mail ───────────────────────────────────────────────────────

function templateUsageAlert({ name, email, plan, used, limit, percent }) {
  const isOver = percent >= 100;
  const color  = isOver ? '#ef4444' : '#f59e0b';
  const title  = isOver
    ? `Você atingiu 100% do seu limite — ${plan.charAt(0).toUpperCase() + plan.slice(1)}`
    : `Você usou ${percent}% do seu limite — ${plan.charAt(0).toUpperCase() + plan.slice(1)}`;

  return {
    subject: isOver ? '[TokLang] Limite atingido — faça upgrade' : `[TokLang] ${percent}% do limite usado`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Inter',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #1e1e2e;border-radius:16px;overflow:hidden">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0d1117 0%,#161b22 100%);padding:32px 40px;border-bottom:1px solid #1e1e2e">
          <p style="margin:0;font-size:22px;font-weight:800;color:#f0f0ff">
            Tok<span style="color:#00ff88">Lang</span>
          </p>
        </td></tr>
        <!-- Alert bar -->
        <tr><td style="background:${isOver ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'};border-bottom:1px solid ${isOver ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'};padding:16px 40px">
          <p style="margin:0;font-size:13px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:1px">
            ${isOver ? 'Limite Atingido' : 'Alerta de Uso'}
          </p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#f0f0ff;line-height:1.3">${title}</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#8b8b9e;line-height:1.6">
            Olá, <strong style="color:#f0f0ff">${name}</strong>. Aqui está um resumo do seu uso atual no TokLang.
          </p>
          <!-- Usage bar -->
          <div style="background:#1a1a2e;border-radius:12px;padding:20px 24px;margin-bottom:28px">
            <div style="display:flex;justify-content:space-between;margin-bottom:10px">
              <span style="font-size:13px;color:#8b8b9e">Compressões usadas</span>
              <span style="font-size:13px;font-weight:700;color:${color}">${used} / ${limit ?? '∞'}</span>
            </div>
            <div style="background:#0d0d1a;border-radius:6px;height:8px;overflow:hidden">
              <div style="background:${color};width:${Math.min(percent,100)}%;height:8px;border-radius:6px"></div>
            </div>
          </div>
          ${isOver ? `
          <p style="margin:0 0 24px;font-size:14px;color:#8b8b9e;line-height:1.6">
            Você atingiu o limite do plano <strong style="color:#f0f0ff">${plan}</strong>. 
            Faça upgrade para continuar comprimindo sem interrupções.
          </p>
          <a href="https://toklang.dev/pages/pricing.html" style="display:inline-block;background:linear-gradient(135deg,#00ff88,#00cc6a);color:#0a0a0f;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none">
            Ver planos de upgrade
          </a>` : `
          <p style="margin:0 0 24px;font-size:14px;color:#8b8b9e;line-height:1.6">
            Você ainda tem <strong style="color:#f0f0ff">${limit - used} compressões</strong> restantes.
            Se precisar de mais, confira nossos planos.
          </p>
          <a href="https://toklang.dev/pages/dashboard.html" style="display:inline-block;background:linear-gradient(135deg,#00ff88,#00cc6a);color:#0a0a0f;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none">
            Ver meu Dashboard
          </a>`}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid #1e1e2e">
          <p style="margin:0;font-size:11px;color:#4a4a5e;line-height:1.5">
            Este e-mail foi enviado para <strong style="color:#6b6b7e">${email}</strong> porque você tem uma conta TokLang.<br>
            <a href="https://toklang.dev" style="color:#00ff88;text-decoration:none">toklang.dev</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  };
}

function templateSubscriptionConfirmed({ name, email, plan, price }) {
  const planNames = { pro: 'Pro', team: 'Team', starter: 'Starter' };
  const planLabel = planNames[plan] || plan;

  return {
    subject: `[TokLang] Assinatura confirmada — Plano ${planLabel}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Inter',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #1e1e2e;border-radius:16px;overflow:hidden">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0d1117 0%,#161b22 100%);padding:32px 40px;border-bottom:1px solid #1e1e2e">
          <p style="margin:0;font-size:22px;font-weight:800;color:#f0f0ff">
            Tok<span style="color:#00ff88">Lang</span>
          </p>
        </td></tr>
        <!-- Success bar -->
        <tr><td style="background:rgba(0,255,136,0.06);border-bottom:1px solid rgba(0,255,136,0.15);padding:16px 40px">
          <p style="margin:0;font-size:13px;font-weight:700;color:#00ff88;text-transform:uppercase;letter-spacing:1px">
            Pagamento Confirmado
          </p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#f0f0ff;line-height:1.3">
            Bem-vindo ao Plano ${planLabel}, ${name}!
          </h1>
          <p style="margin:0 0 28px;font-size:14px;color:#8b8b9e;line-height:1.6">
            Sua assinatura foi ativada com sucesso. A partir de agora seu plano ${planLabel} 
            está disponível no seu Dashboard.
          </p>
          <!-- Plan card -->
          <div style="background:#1a1a2e;border:1px solid rgba(0,255,136,0.2);border-radius:12px;padding:20px 24px;margin-bottom:28px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#f0f0ff">Plano ${planLabel}</p>
                <p style="margin:0;font-size:13px;color:#8b8b9e">Renovação mensal automática</p>
              </div>
              <p style="margin:0;font-size:20px;font-weight:800;color:#00ff88">${price}</p>
            </div>
          </div>
          <a href="https://toklang.dev/pages/dashboard.html" style="display:inline-block;background:linear-gradient(135deg,#00ff88,#00cc6a);color:#0a0a0f;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none">
            Acessar o Dashboard
          </a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid #1e1e2e">
          <p style="margin:0;font-size:11px;color:#4a4a5e;line-height:1.5">
            Este e-mail foi enviado para <strong style="color:#6b6b7e">${email}</strong>.<br>
            Dúvidas? Responda este e-mail ou acesse <a href="https://toklang.dev" style="color:#00ff88;text-decoration:none">toklang.dev</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  };
}

function templateWeeklyReport({ name, email, plan, used, limit, topUsageDays }) {
  const percent = limit ? Math.round((used / limit) * 100) : null;

  return {
    subject: `[TokLang] Seu relatório semanal de uso`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Inter',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #1e1e2e;border-radius:16px;overflow:hidden">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0d1117 0%,#161b22 100%);padding:32px 40px;border-bottom:1px solid #1e1e2e">
          <p style="margin:0;font-size:22px;font-weight:800;color:#f0f0ff">
            Tok<span style="color:#00ff88">Lang</span>
          </p>
        </td></tr>
        <!-- Report bar -->
        <tr><td style="background:rgba(99,102,241,0.08);border-bottom:1px solid rgba(99,102,241,0.2);padding:16px 40px">
          <p style="margin:0;font-size:13px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:1px">
            Relatório Semanal
          </p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#f0f0ff;line-height:1.3">
            Resumo da semana, ${name}
          </h1>
          <p style="margin:0 0 28px;font-size:14px;color:#8b8b9e;line-height:1.6">
            Aqui está um resumo do seu uso do TokLang nos últimos 7 dias.
          </p>
          <!-- Stats -->
          <div style="display:grid;gap:12px;margin-bottom:28px">
            <div style="background:#1a1a2e;border-radius:12px;padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:13px;color:#8b8b9e">Compressões esta semana</span>
              <span style="font-size:20px;font-weight:800;color:#00ff88">${used}</span>
            </div>
            ${limit ? `<div style="background:#1a1a2e;border-radius:12px;padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:13px;color:#8b8b9e">Limite do plano (${plan})</span>
              <span style="font-size:13px;font-weight:700;color:#f0f0ff">${used}/${limit} (${percent}%)</span>
            </div>` : `<div style="background:#1a1a2e;border-radius:12px;padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:13px;color:#8b8b9e">Plano</span>
              <span style="font-size:13px;font-weight:700;color:#00ff88">${plan} — Ilimitado</span>
            </div>`}
          </div>
          <a href="https://toklang.dev/pages/dashboard.html" style="display:inline-block;background:linear-gradient(135deg,#00ff88,#00cc6a);color:#0a0a0f;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none">
            Ver meu Dashboard
          </a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid #1e1e2e">
          <p style="margin:0;font-size:11px;color:#4a4a5e;line-height:1.5">
            Este e-mail foi enviado para <strong style="color:#6b6b7e">${email}</strong>.<br>
            Para cancelar relatórios semanais, acesse as configurações do <a href="https://toklang.dev/pages/dashboard.html" style="color:#00ff88;text-decoration:none">Dashboard</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  };
}

// ── Handler principal ─────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Proteção interna: apenas chamadas server-side (sem exposição pública)
  const internalSecret = req.headers['x-toklang-internal'];
  if (internalSecret !== process.env.INTERNAL_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type, to, name, plan, used, limit } = req.body;

  if (!type || !to) {
    return res.status(400).json({ error: 'Missing required fields: type, to' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured — skipping email');
    return res.status(200).json({ skipped: true, reason: 'No RESEND_API_KEY' });
  }

  let template;
  const percent = limit ? Math.round((used / limit) * 100) : 0;

  if (type === 'usage_alert') {
    template = templateUsageAlert({ name, email: to, plan, used, limit, percent });
  } else if (type === 'subscription_confirmed') {
    const prices = { starter: 'R$ 10/mês', pro: 'R$ 35/mês', team: 'R$ 80/mês' };
    template = templateSubscriptionConfirmed({ name, email: to, plan, price: prices[plan] || '' });
  } else if (type === 'weekly_report') {
    template = templateWeeklyReport({ name, email: to, plan, used, limit });
  } else {
    return res.status(400).json({ error: `Unknown email type: ${type}` });
  }

  try {
    const { data, error } = await resend.emails.send({
      from:    'TokLang <notificacoes@toklang.dev>',
      to:      [to],
      subject: template.subject,
      html:    template.html,
    });

    if (error) throw new Error(error.message);

    return res.status(200).json({ sent: true, id: data?.id });
  } catch (err) {
    console.error('[send-email] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

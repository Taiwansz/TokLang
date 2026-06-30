import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mapeamento de Price ID do Stripe para Nome do Plano no TokLang
const PRICE_PLAN_MAP = {
  'price_1TncHw238tVr1DQSsxeUAEOu': 'pro',
  'price_1TncHx238tVr1DQSOX9zHT8I': 'team'
};

const PLAN_PRICES = { starter: 'R$ 10/mês', pro: 'R$ 35/mês', team: 'R$ 80/mês' };

export const config = {
  api: {
    bodyParser: false, // Necessário para verificar a assinatura do Stripe
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// ── Helper: dispara e-mail de confirmação (fire-and-forget) ───────────────────
async function sendSubscriptionEmail({ userEmail, userName, plan }) {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    await fetch(`${baseUrl}/api/send-email`, {
      method:  'POST',
      headers: {
        'Content-Type':       'application/json',
        'x-toklang-internal': process.env.INTERNAL_API_SECRET || '',
      },
      body: JSON.stringify({
        type:  'subscription_confirmed',
        to:    userEmail,
        name:  userName,
        plan,
        price: PLAN_PRICES[plan] || '',
      }),
    });
  } catch (e) {
    console.warn('[webhook] Subscription email failed (non-blocking):', e.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Lógica para quando o pagamento é concluído com sucesso
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId  = session.metadata.userId;
    const priceId = session.line_items?.data[0]?.price.id || session.metadata.priceId;
    const plan    = PRICE_PLAN_MAP[priceId] || 'pro';

    console.log(`Atualizando plano do usuário ${userId} para ${plan}`);

    // Atualizar metadados do usuário no Supabase Auth
    const { data: updatedUser, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { plan }
    });

    if (error) {
      console.error('Erro ao atualizar plano no Supabase:', error);
      return res.status(500).json({ error: 'Erro ao atualizar banco de dados' });
    }

    // Enviar e-mail de confirmação de assinatura
    const userEmail = session.customer_details?.email || updatedUser?.user?.email || '';
    const userName  = session.customer_details?.name  || updatedUser?.user?.user_metadata?.name || '';
    if (userEmail) {
      sendSubscriptionEmail({ userEmail, userName, plan });
    }
  }

  res.status(200).json({ received: true });
}


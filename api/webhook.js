import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mapeamento de Price ID do Stripe para Nome do Plano no TokLang
const PRICE_PLAN_MAP = {
  'price_1TYyeH238tVr1DQSmKDrWSd5': 'pro',
  'price_1TYydo238tVr1DQSJuuDPcZ3': 'enterprise'
};

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
    const userId = session.metadata.userId;
    const priceId = session.line_items?.data[0]?.price.id || session.metadata.priceId;

    // Se o preço não estiver no metadata, tentamos pegar da sessão
    // Nota: Em produção, você deve garantir que o PriceID chegue aqui.
    
    const plan = PRICE_PLAN_MAP[priceId] || 'pro'; // Fallback para pro se necessário

    console.log(`Atualizando plano do usuário ${userId} para ${plan}`);

    // Atualizar metadados do usuário no Supabase Auth
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { plan: plan }
    });

    if (error) {
      console.error('Erro ao atualizar plano no Supabase:', error);
      return res.status(500).json({ error: 'Erro ao atualizar banco de dados' });
    }
  }

  res.status(200).json({ received: true });
}

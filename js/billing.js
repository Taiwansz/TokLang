/* ===== BILLING & STRIPE ===== */

// Mapeamento de planos para IDs de Preço do Stripe
// VOCÊ DEVE SUBSTITUIR ESSES IDS PELOS SEUS NO PAINEL DO STRIPE
const STRIPE_PRICES = {
  pro: 'price_1TYyeH238tVr1DQSmKDrWSd5',
  enterprise: 'price_1TYydo238tVr1DQSJuuDPcZ3'
};

async function subscribe(planName) {
  const u = await getUser();
  
  if (!u) {
    showToast('Você precisa estar logado para assinar.', '🔐');
    navigate('login');
    return;
  }

  const priceId = STRIPE_PRICES[planName];
  if (!priceId) return;

  showToast('Iniciando checkout seguro...', '💳');

  try {
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: priceId,
        userId: (await supabase.auth.getUser()).data.user.id,
        email: u.email
      })
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url; // Redireciona para o Stripe
    } else {
      throw new Error(data.error || 'Erro ao criar sessão');
    }
  } catch (err) {
    showToast('Erro: ' + err.message, '⚠');
  }
}

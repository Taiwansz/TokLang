/* ===== SUPABASE CONFIGURATION ===== */
// Substitua pelas suas chaves do Supabase em produção
const SUPABASE_URL = 'https://orxyjsqtbjygatxkjrql.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeHlqc3F0Ymp5Z2F0eGtqcnFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMjU4NzgsImV4cCI6MjA5NDgwMTg3OH0.1su1oVJ5SfcZAapvHuldbkyfPEdiq3fGleZvET0_bU8';

let supabase = null;

// Inicialização segura
if (typeof supabase === 'undefined') {
  // Caso o script do CDN não tenha carregado
  console.warn('Supabase SDK não encontrado. Verifique sua conexão.');
} else {
  supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Exemplo de como usar Auth com Supabase futuramente:
 * 
 * async function signUp(email, password) {
 *   const { user, error } = await supabase.auth.signUp({ email, password });
 *   return { user, error };
 * }
 */

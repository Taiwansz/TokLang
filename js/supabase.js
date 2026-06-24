/* ===== SUPABASE CONFIGURATION ===== */
// Substitua pelas suas chaves do Supabase em produção
const SUPABASE_URL = 'https://orxyjsqtbjygatxkjrql.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeHlqc3F0Ymp5Z2F0eGtqcnFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMjU4NzgsImV4cCI6MjA5NDgwMTg3OH0.1su1oVJ5SfcZAapvHuldbkyfPEdiq3fGleZvET0_bU8';

let supabaseClient = null;
window.IS_DEMO = SUPABASE_URL === 'https://orxyjsqtbjygatxkjrql.supabase.co'; // Se usar URL default do repo, é demo


// Certificar que a variável global sempre exista (mesmo que nula) para evitar ReferenceError
window.supabase = window.supabase || null;

if (typeof window.supabase === 'undefined' || window.supabase === null) {
  console.warn('Supabase SDK não encontrado. Verifique sua conexão.');
} else {
  // Cria o cliente e o atribui a uma variável global 'supabase' que o resto do app espera
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabase = supabaseClient;
}

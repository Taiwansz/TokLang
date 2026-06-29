/* ===== SUPABASE CONFIGURATION ===== */
// Default demo keys (used if no custom credentials are configured in environment variables)
const DEMO_URL = 'https://orxyjsqtbjygatxkjrql.supabase.co';
const DEMO_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeHlqc3F0Ymp5Z2F0eGtqcnFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMjU4NzgsImV4cCI6MjA5NDgwMTg3OH0.1su1oVJ5SfcZAapvHuldbkyfPEdiq3fGleZvET0_bU8';

window.IS_DEMO = true;
const supabaseLib = window.supabase;
window.supabase = null;

// Initialize Supabase synchronously with demo keys first to prevent ReferenceErrors
if (supabaseLib) {
  window.supabase = supabaseLib.createClient(DEMO_URL, DEMO_KEY);
  console.log('[SUPABASE] Initialized in DEMO mode by default.');
} else {
  console.warn('Supabase SDK not loaded.');
}

// Function to fetch production environment variables dynamically on page load and update client
async function syncProductionConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const config = await res.json();
      if (config.supabaseUrl && config.supabaseAnonKey) {
        window.IS_DEMO = false;
        if (supabaseLib) {
          window.supabase = supabaseLib.createClient(config.supabaseUrl, config.supabaseAnonKey);
          console.log('[SUPABASE] Client successfully updated to PRODUCTION credentials.');
        }
      }
    }
  } catch (e) {
    console.warn('[SUPABASE] Could not check production config, continuing in DEMO mode:', e);
  }
}

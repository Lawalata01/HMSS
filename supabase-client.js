if (!window.supabase || !window.HMSS_SUPABASE_CONFIG) {
  throw new Error('Supabase belum siap. Periksa koneksi CDN dan konfigurasi proyek HMSS.');
}

const hmssSupabase = window.supabase.createClient(
  window.HMSS_SUPABASE_CONFIG.url,
  window.HMSS_SUPABASE_CONFIG.publishableKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

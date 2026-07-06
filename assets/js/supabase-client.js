(function () {
  const config = window.SUPABASE_CONFIG;
  const isConfigured =
    config &&
    config.url &&
    config.anonKey &&
    !config.url.includes("VOTRE-PROJET") &&
    !config.anonKey.includes("VOTRE_CLE");

  if (!isConfigured) {
    console.warn(
      "Supabase n'est pas configuré. Modifiez assets/js/config.js avec l'URL et la clé anon de votre projet."
    );
    window.supabaseClient = null;
    return;
  }

  window.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
})();

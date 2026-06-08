/**
 * supabase.js — Cliente de Supabase para el frontend de Terrium
 *
 * Cargamos el SDK de Supabase desde CDN y exportamos el cliente
 * para ser usado por los demás módulos (auth.js, api.js, etc.)
 *
 * Las variables SUPABASE_URL y SUPABASE_ANON_KEY se inyectan desde
 * el servidor (nginx) o se pueden configurar directamente aquí para
 * desarrollo local.
 */

const SUPABASE_URL  = window.__SUPABASE_URL__  || 'https://tvinjfhjsqoiptduozaa.supabase.co';
const SUPABASE_ANON = window.__SUPABASE_ANON__ || 'REEMPLAZAR_CON_ANON_KEY_DE_SETTINGS_API';

// ── Inicialización ────────────────────────────────────────────────────────────
let supabaseClient = null;

const initSupabase = () => {
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.warn('⚠️ SDK de Supabase no cargado todavía. Asegurate de incluir el script del CDN antes de supabase.js');
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.log('✅ Cliente de Supabase inicializado');
  }
  return supabaseClient;
};

// ── Helpers de Auth con Supabase ──────────────────────────────────────────────
const supabaseAuth = {
  /**
   * Registrar un nuevo usuario con email/password
   */
  signUp: async (email, password, metadata = {}) => {
    const client = initSupabase();
    if (!client) return { error: { message: 'Supabase no disponible' } };
    return client.auth.signUp({ email, password, options: { data: metadata } });
  },

  /**
   * Iniciar sesión con email/password
   */
  signIn: async (email, password) => {
    const client = initSupabase();
    if (!client) return { error: { message: 'Supabase no disponible' } };
    return client.auth.signInWithPassword({ email, password });
  },

  /**
   * Cerrar sesión
   */
  signOut: async () => {
    const client = initSupabase();
    if (!client) return;
    return client.auth.signOut();
  },

  /**
   * Obtener la sesión activa
   */
  getSession: async () => {
    const client = initSupabase();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session ?? null;
  },

  /**
   * Obtener el usuario actual
   */
  getUser: async () => {
    const client = initSupabase();
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data?.user ?? null;
  },

  /**
   * Escuchar cambios de sesión
   */
  onAuthChange: (callback) => {
    const client = initSupabase();
    if (!client) return;
    client.auth.onAuthStateChange((_event, session) => callback(session));
  },
};

// ── Storage helpers ───────────────────────────────────────────────────────────
const supabaseStorage = {
  /**
   * Subir una imagen de propiedad al bucket "property-images"
   */
  uploadPropertyImage: async (file, path) => {
    const client = initSupabase();
    if (!client) return { error: { message: 'Supabase no disponible' } };
    return client.storage.from('property-images').upload(path, file, { upsert: true });
  },

  /**
   * Obtener URL pública de una imagen
   */
  getPublicUrl: (path) => {
    const client = initSupabase();
    if (!client) return null;
    const { data } = client.storage.from('property-images').getPublicUrl(path);
    return data?.publicUrl ?? null;
  },
};

// ── Exports globales ──────────────────────────────────────────────────────────
window.initSupabase    = initSupabase;
window.supabaseAuth    = supabaseAuth;
window.supabaseStorage = supabaseStorage;

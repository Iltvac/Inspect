import { createClient } from '@supabase/supabase-js'

// Значения берутся из .env.local (см. .env.example)
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Нет VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY: создай .env.local по образцу .env.example')
}

// PKCE: ссылки из писем приходят как ?code=…, а не через #, который занят под адреса страниц
export const supabase = createClient(url, anonKey, { auth: { flowType: 'pkce' } })

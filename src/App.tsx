import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { ToastProvider } from './components/Toast'
import { IconLogout } from './components/Icons'
import Login from './pages/Login'
import NewPassword from './pages/NewPassword'
import List from './pages/List'
import Editor from './pages/Editor'
import Report from './pages/Report'

export default function App() {
  const location = useLocation()
  // Отчёт для клиента открывается без входа
  if (location.pathname.startsWith('/r/')) {
    return <Routes><Route path="/r/:token" element={<Report />} /></Routes>
  }
  return <PrivateApp />
}

function PrivateApp() {
  // undefined — ещё не знаем, null — не вошёл, Session — вошёл
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [recovering, setRecovering] = useState(false) // пришли по ссылке «сбросить пароль»

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <p className="center muted">Загрузка…</p>
  if (session === null) return <Login />
  if (recovering) return <NewPassword onDone={() => setRecovering(false)} />

  function logout() {
    if (!confirm('Выйти из аккаунта?')) return
    try { Object.keys(localStorage).filter((k) => k.startsWith('inspect-cache:')).forEach((k) => localStorage.removeItem(k)) } catch { /* ignore */ }
    void supabase.auth.signOut()
  }

  return (
    <ToastProvider>
      <div className="app">
        <header className="topbar">
          <Link to="/" className="brand"><span className="brand-dot" />Автоподбор</Link>
          <button className="icon-btn" onClick={logout} title="Выйти" aria-label="Выйти"><IconLogout /></button>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<List />} />
            <Route path="/i/:id" element={<Editor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  )
}

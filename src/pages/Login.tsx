import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import Field from '../components/Field'

type Mode = 'signIn' | 'signUp' | 'reset'

export default function Login() {
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function switchTo(m: Mode) {
    setMode(m); setError(null); setInfo(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    if (mode === 'reset') {
      // Письмо со ссылкой; по ссылке приложение откроется с формой нового пароля (см. App.tsx)
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: import.meta.env.VITE_PUBLIC_URL || window.location.href })
      if (error) setError(error.message)
      else setInfo('Письмо со ссылкой отправлено. Открой его на этом же компьютере.')
    } else {
      const { data, error } = mode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: import.meta.env.VITE_PUBLIC_URL || window.location.href } })
      if (error) setError(error.message === 'Invalid login credentials' ? 'Неверная почта или пароль' : error.message)
      // Если в Supabase включено подтверждение почты, сессии ещё нет: просим открыть письмо
      else if (mode === 'signUp' && !data.session) { setInfo('Мы отправили письмо. Нажми в нём ссылку, потом вернись сюда и войди.'); setMode('signIn') }
      // При успехе App сам узнает о входе через onAuthStateChange
    }
    setBusy(false)
  }

  return (
    <div className="login-wrap">
      <form className="card login form" onSubmit={submit}>
        <img src="icon-192.png" alt="" className="login-logo" />
        <h1>Автоподбор</h1>
        <p className="muted">
          {mode === 'reset' ? 'Пришлём ссылку для нового пароля' : 'Осмотры машин и отчёты для клиентов'}
        </p>
        <Field label="Почта"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></Field>
        {mode !== 'reset' && (
          <Field label="Пароль" hint={mode === 'signUp' ? 'Не меньше 6 символов' : undefined}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} />
          </Field>
        )}
        {error && <p className="error">{error}</p>}
        {info && <p className="ok">{info}</p>}
        <button type="submit" disabled={busy}>
          {mode === 'signIn' ? 'Войти' : mode === 'signUp' ? 'Создать аккаунт' : 'Прислать ссылку'}
        </button>
        {mode === 'signIn' && <button type="button" className="link" onClick={() => switchTo('reset')}>Забыли пароль?</button>}
        <button type="button" className="link" onClick={() => switchTo(mode === 'signIn' ? 'signUp' : 'signIn')}>
          {mode === 'signIn' ? 'Нет аккаунта? Зарегистрироваться' : 'Вернуться ко входу'}
        </button>
      </form>
    </div>
  )
}

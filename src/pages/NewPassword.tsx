import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import Field from '../components/Field'

// Открывается после перехода по ссылке из письма «сбросить пароль»
export default function NewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password !== repeat) return setError('Пароли не совпадают')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(error.message)
    onDone()
  }

  return (
    <div className="login-wrap">
      <form className="card login form" onSubmit={submit}>
        <h1>Новый пароль</h1>
        <Field label="Новый пароль" hint="Не меньше 6 символов">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" autoFocus />
        </Field>
        <Field label="Ещё раз">
          <input type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required minLength={6} autoComplete="new-password" />
        </Field>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>Сохранить пароль</button>
      </form>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

export default function Auth({ mode, onAuth }) {
  const reg = mode === 'register'
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try { onAuth(await api(reg ? '/register' : '/login', { method: 'POST', body: f })) }
    catch (ex) { setErr(ex.message) }
  }
  return (
    <form onSubmit={submit} className="card max-w-sm mx-auto space-y-4">
      <h1 className="text-xl font-semibold">{reg ? 'Create your account' : 'Welcome back'}</h1>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {reg && <input className="input" placeholder="Name" required value={f.name} onChange={set('name')} />}
      <input className="input" type="email" placeholder="Email" required value={f.email} onChange={set('email')} />
      <input className="input" type="password" placeholder="Password (min 6 characters)" required minLength={6} value={f.password} onChange={set('password')} />
      <button className="btn w-full">{reg ? 'Sign up' : 'Log in'}</button>
      <p className="text-sm text-gray-600 text-center">
        {reg ? <>Already registered? <Link className="text-green-700 underline" to="/login">Log in</Link></>
             : <>New here? <Link className="text-green-700 underline" to="/register">Create an account</Link></>}
      </p>
    </form>
  )
}

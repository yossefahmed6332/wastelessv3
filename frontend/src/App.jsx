import { useState } from 'react'
import { Routes, Route, NavLink, Navigate, Link, useNavigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Auth from './pages/Auth.jsx'
import Inventory from './pages/Inventory.jsx'
import Expiring from './pages/Expiring.jsx'
import { api } from './api.js'

export default function App() {
  const [user, setUser] = useState(localStorage.getItem('name'))
  const [open, setOpen] = useState(false)
  const nav = useNavigate()

  const onAuth = (d) => {
    localStorage.setItem('token', d.token); localStorage.setItem('name', d.name)
    setUser(d.name); nav('/inventory')
  }
  const logout = async () => {
    try { await api('/logout', { method: 'POST' }) } catch {}
    localStorage.clear(); setUser(null); nav('/')
  }
  const link = ({ isActive }) =>
    `block px-3 py-2 text-sm rounded-md ${isActive ? 'bg-green-100 text-green-800 font-medium' : 'text-gray-600 hover:text-green-800'}`
  const guard = (el) => (user ? el : <Navigate to="/login" />)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-green-700">Waste<span className="text-orange-500">Less</span></Link>
          <button className="md:hidden btn-light" onClick={() => setOpen(!open)}>Menu</button>
          <nav className={`${open ? 'flex' : 'hidden'} md:flex flex-col md:flex-row md:items-center gap-1 absolute md:static top-14 left-0 right-0 bg-white md:bg-transparent p-3 md:p-0 border-b md:border-0`}
               onClick={() => setOpen(false)}>
            <NavLink to="/" end className={link}>Home</NavLink>
            {user ? (<>
              <NavLink to="/inventory" className={link}>Inventory</NavLink>
              <NavLink to="/expiring" className={link}>Expiring</NavLink>
              <button onClick={logout} className="btn-light md:ml-2">Log out ({user})</button>
            </>) : (<>
              <NavLink to="/login" className={link}>Log in</NavLink>
              <Link to="/register" className="btn md:ml-2 text-center">Sign up</Link>
            </>)}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/login" element={<Auth mode="login" onAuth={onAuth} />} />
          <Route path="/register" element={<Auth mode="register" onAuth={onAuth} />} />
          <Route path="/inventory" element={guard(<Inventory />)} />
          <Route path="/expiring" element={guard(<Expiring />)} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <footer className="text-center text-xs text-gray-500 py-6">WasteLess · Supporting UN SDG 12.3 – halve food waste by 2030</footer>
    </div>
  )
}

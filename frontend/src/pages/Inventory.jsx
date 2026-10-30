import { useEffect, useState, useCallback } from 'react'
import { api, today, status, CATEGORIES } from '../api.js'

const empty = { name: '', category: CATEGORIES[0], quantity: 1, purchase_date: today(), expiration_date: '' }

export default function Inventory() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const p = new URLSearchParams({ q, category: cat })
    try { setItems(await api('/items?' + p)) } catch (e) { setErr(e.message) }
  }, [q, cat])
  useEffect(() => { load() }, [load])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    const body = { ...form, quantity: Number(form.quantity) }
    try {
      await api(editId ? `/items/${editId}` : '/items', { method: editId ? 'PUT' : 'POST', body })
      setForm(empty); setEditId(null); load()
    } catch (ex) { setErr(ex.message) }
  }
  const edit = (it) => { setEditId(it.id); setForm(it); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const remove = async (id) => {
    if (!confirm('Delete this item?')) return
    await api(`/items/${id}`, { method: 'DELETE' }); load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-green-800">My Food Inventory</h1>
      <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
        <label className="lg:col-span-2 text-sm">Name
          <input className="input mt-1" required value={form.name} onChange={set('name')} placeholder="e.g. Milk" /></label>
        <label className="text-sm">Category
          <select className="input mt-1" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="text-sm">Quantity
          <input className="input mt-1" type="number" min="0.1" step="any" required value={form.quantity} onChange={set('quantity')} /></label>
        <label className="text-sm">Purchased
          <input className="input mt-1" type="date" value={form.purchase_date || ''} onChange={set('purchase_date')} /></label>
        <label className="text-sm">Expires
          <input className="input mt-1" type="date" required value={form.expiration_date} onChange={set('expiration_date')} /></label>
        <div className="flex gap-2 lg:col-span-6">
          <button className="btn">{editId ? 'Save changes' : 'Add item'}</button>
          {editId && <button type="button" className="btn-light" onClick={() => { setEditId(null); setForm(empty) }}>Cancel</button>}
          {err && <span className="text-sm text-red-600 self-center">{err}</span>}
        </div>
      </form>

      <div className="flex flex-col sm:flex-row gap-3">
        <input className="input" placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input sm:w-56" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
      </div>

      {items.length === 0 ? <p className="text-gray-500 text-sm">No items found. Add your first item above.</p> : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr><th className="p-3">Item</th><th className="p-3">Category</th><th className="p-3">Qty</th>
                  <th className="p-3">Expires</th><th className="p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {items.map((it) => { const s = status(it.expiration_date); return (
                <tr key={it.id} className="border-t border-gray-100">
                  <td className="p-3 font-medium">{it.name}</td><td className="p-3">{it.category}</td>
                  <td className="p-3">{it.quantity}</td><td className="p-3 whitespace-nowrap">{it.expiration_date}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${s.cls}`}>{s.label}</span></td>
                  <td className="p-3 whitespace-nowrap text-right space-x-2">
                    <button className="btn-light" onClick={() => edit(it)}>Edit</button>
                    <button className="btn-light text-red-600" onClick={() => remove(it.id)}>Delete</button></td>
                </tr>)})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

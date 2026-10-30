import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, daysLeft } from '../api.js'

function Group({ title, color, items, empty }) {
  return (
    <section>
      <h2 className={`font-semibold mb-2 ${color}`}>{title} ({items.length})</h2>
      {items.length === 0 ? <p className="text-sm text-gray-500">{empty}</p> : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {items.map((it) => (
            <li key={it.id} className="card py-3 flex justify-between">
              <span><span className="font-medium">{it.name}</span> <span className="text-xs text-gray-500">× {it.quantity}</span></span>
              <span className="text-sm text-gray-600">{it.expiration_date}</span>
            </li>))}
        </ul>)}
    </section>
  )
}

export default function Expiring() {
  const [items, setItems] = useState([])
  useEffect(() => { api('/items').then(setItems) }, [])
  const expired = items.filter((i) => daysLeft(i.expiration_date) < 0)
  const soon = items.filter((i) => { const d = daysLeft(i.expiration_date); return d >= 0 && d <= 7 })
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-green-800">Expiration Tracker</h1>
      <Group title="Expired – check before eating or discard" color="text-red-600" items={expired} empty="Nothing has expired. 🎉" />
      <Group title="Expiring within 7 days – use these first" color="text-orange-600" items={soon} empty="Nothing is expiring this week." />
      <p className="text-sm text-gray-500">Manage everything in your <Link className="underline text-green-700" to="/inventory">inventory</Link>.</p>
    </div>
  )
}

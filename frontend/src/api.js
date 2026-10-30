const token = () => localStorage.getItem('token')

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401 && token()) {
    localStorage.clear(); window.location.href = '/login'
  }
  const data = res.status === 204 ? null : await res.json()
  if (!res.ok) throw new Error(data?.detail || 'Request failed')
  return data
}

export const today = () => new Date().toISOString().slice(0, 10)
// Simple date comparison: whole days from today until the expiration date
export const daysLeft = (exp) => Math.round((new Date(exp) - new Date(today())) / 86400000)
export function status(exp) {
  const d = daysLeft(exp)
  if (d < 0) return { key: 'expired', label: `Expired ${-d}d ago`, cls: 'bg-red-100 text-red-700' }
  if (d <= 3) return { key: 'soon', label: d === 0 ? 'Expires today' : `${d}d left`, cls: 'bg-orange-100 text-orange-700' }
  return { key: 'fresh', label: `${d}d left`, cls: 'bg-green-100 text-green-800' }
}
export const CATEGORIES = ['Fruits', 'Vegetables', 'Dairy', 'Meat & Fish', 'Grains & Bakery', 'Pantry', 'Frozen', 'Other']

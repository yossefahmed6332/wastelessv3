
const token = () => localStorage.getItem('token');

const API_URL = import.meta.env.VITE_API_URL || '';

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token() ? { Authorization: 'Bearer ' + token() } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && token()) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return;
  }

  const data = res.status === 204 ? null : await res.json();

  if (!res.ok) throw new Error(data?.detail || 'Request failed');

  return data;
}

export const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const daysLeft = (exp) =>
  Math.round((new Date(exp) - new Date(today())) / 86400000);

export function status(exp) {
  const d = daysLeft(exp);

  if (d < 0)
    return {
      key: 'expired',
      label: `Expired ${-d}d ago`,
      cls: 'bg-red-100 text-red-700'
    };

  if (d <= 3)
    return {
      key: 'soon',
      label: d === 0 ? 'Expires today' : `${d}d left`,
      cls: 'bg-orange-100 text-orange-700'
    };

  return {
    key: 'fresh',
    label: `${d}d left`,
    cls: 'bg-green-100 text-green-800'
  };
}

export const CATEGORIES = [
  'Fruits',
  'Vegetables',
  'Dairy',
  'Meat & Fish',
  'Grains & Bakery',
  'Pantry',
  'Frozen',
  'Other'
];

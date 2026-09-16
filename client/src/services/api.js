const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('daymark_token');
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}
export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  listTodos: (params = {}) => request(`/todos?${new URLSearchParams(params)}`),
  createTodo: (payload) => request('/todos', { method: 'POST', body: JSON.stringify(payload) }),
  updateTodo: (id, payload) => request(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTodo: (id) => request(`/todos/${id}`, { method: 'DELETE' })
};

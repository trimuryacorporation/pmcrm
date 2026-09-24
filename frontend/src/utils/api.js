const isLocalDevelopment = typeof window === 'undefined' || ['localhost', '127.0.0.1'].includes(window.location.hostname);
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');
const API_URL = configuredApiUrl || (isLocalDevelopment ? 'http://localhost:5000/api' : '/api');
export const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

export async function api(path, options = {}) {
  const token = localStorage.getItem('trimurya_token');
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };
  const response = await fetch(`${API_URL}${path}`, { cache: 'no-store', ...options, headers });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Server returned an invalid response');
  }
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function download(path, fileName) {
  const token = localStorage.getItem('trimurya_token');
  const response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Download failed');
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export const endpoints = {
  dashboard: () => api('/dashboard'),
  updateProfile: (body) => api('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  administrators: () => api('/administrators'),
  createAdministrator: (body) => api('/administrators', { method: 'POST', body: JSON.stringify(body) }),
  updateAdministratorStatus: (id, isActive) => api(`/administrators/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  list: (resource, query = {}) => {
    const parameters = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''));
    return api(`/${resource}${parameters.size ? `?${parameters}` : ''}`);
  },
  get: (resource, id) => api(`/${resource}/${id}`),
  create: (resource, body) => api(`/${resource}`, { method: 'POST', body: JSON.stringify(body) }),
  update: (resource, id, body) => api(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (resource, id) => api(`/${resource}/${id}`, { method: 'DELETE' }),
  upload: (files) => {
    const body = new FormData();
    Array.from(files).forEach((file) => body.append('files', file));
    return api('/uploads', { method: 'POST', body });
  },
  activity: () => api('/activity'),
  activeUsers: () => api('/activity/users'),
  deliveryLogs: () => api('/activity/deliveries'),
  updateLocation: (body) => api('/activity/location', { method: 'PUT', body: JSON.stringify(body) }),
  downloadProjectFile: (projectId, fileIndex, fileName) => download(`/uploads/projects/${projectId}/${fileIndex}`, fileName),
  storageSettings: () => api('/settings/storage'),
  testStorageSettings: (body) => api('/settings/storage/test', { method: 'POST', body: JSON.stringify(body) }),
  saveStorageSettings: (body) => api('/settings/storage', { method: 'PUT', body: JSON.stringify(body) }),
  communicationSettings: () => api('/settings/communications'),
  saveCommunicationSettings: (body) => api('/settings/communications', { method: 'PUT', body: JSON.stringify(body) }),
  testEmail: (to) => api('/settings/communications/test-email', { method: 'POST', body: JSON.stringify({ to }) }),
  testWhatsApp: (to) => api('/settings/communications/test-whatsapp', { method: 'POST', body: JSON.stringify({ to }) }),
  validateInvite: (token) => api(`/auth/invite/${encodeURIComponent(token)}`),
  setPassword: (token, password) => api('/auth/set-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  forgotPassword: (email) => api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, password) => api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  onboard: (body) => api('/auth/onboard', { method: 'POST', body: JSON.stringify(body) }),
  inviteEmployee: (id) => api(`/employees/${id}/invite`, { method: 'POST' }),
  invitePerson: (resource, id) => api(`/${resource}/${id}/invite`, { method: 'POST' }),
  report: (query) => api(`/reports?${new URLSearchParams(query)}`),
  downloadReport: (query) => download(`/reports?${new URLSearchParams({ ...query, format: 'csv' })}`, `${query.type}-report.csv`)
};

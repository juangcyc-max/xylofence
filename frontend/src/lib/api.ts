import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('xylofence_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('xylofence_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; token_type: string }>('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/users'),
  create: (data: unknown) => api.post('/users', data),
  update: (id: number, data: unknown) => api.patch(`/users/${id}`, data),
}

// ── VPN Servers ───────────────────────────────────────────────────────────────
export const serversApi = {
  list: () => api.get('/servers'),
  create: (data: unknown) => api.post('/servers', data),
  get: (id: number) => api.get(`/servers/${id}`),
  update: (id: number, data: unknown) => api.patch(`/servers/${id}`, data),
  delete: (id: number) => api.delete(`/servers/${id}`),
}

// ── VPN Peers ─────────────────────────────────────────────────────────────────
export const peersApi = {
  list: (params?: { user_id?: number; server_id?: number }) => api.get('/peers', { params }),
  create: (data: unknown) => api.post('/peers', data),
  get: (id: number) => api.get(`/peers/${id}`),
  revoke: (id: number) => api.post(`/peers/${id}/revoke`),
  restore: (id: number) => api.post(`/peers/${id}/restore`),
  delete: (id: number) => api.delete(`/peers/${id}`),
  clientConf: (id: number) => api.get(`/configs/peers/${id}/client.conf`, { responseType: 'blob' }),
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export const auditApi = {
  list: (limit = 100) => api.get('/audit', { params: { limit } }),
}

// ── Assets ────────────────────────────────────────────────────────────────────
export const assetsApi = {
  list: () => api.get('/assets'),
  create: (data: unknown) => api.post('/assets', data),
  get: (id: number) => api.get(`/assets/${id}`),
  update: (id: number, data: unknown) => api.patch(`/assets/${id}`, data),
  delete: (id: number) => api.delete(`/assets/${id}`),
}

// ── Scans ─────────────────────────────────────────────────────────────────────
export const scansApi = {
  list: () => api.get('/scans'),
  create: (data: unknown) => api.post('/scans', data),
  get: (id: number) => api.get(`/scans/${id}`),
  findings: (id: number) => api.get(`/scans/${id}/findings`),
}

// ── Host Scans ────────────────────────────────────────────────────────────────
export const hostScansApi = {
  list: () => api.get('/host-scans'),
  start: (data: { target: string; timeout?: number }) => api.post('/host-scans', data),
  get: (id: number) => api.get(`/host-scans/${id}`),
  delete: (id: number) => api.delete(`/host-scans/${id}`),
  systemInfo: () => api.get('/host-scans/system/info'),
}

// ── VPN Cloud Nodes ───────────────────────────────────────────────────────────
export type ChainInfo = { entry_node_id: number; exit_node_id: number; exit_city: string; exit_ip: string | null }

export const vpnNodesApi = {
  regions: () => api.get('/vpn/nodes/regions'),
  list: () => api.get('/vpn/nodes'),
  get: (id: number) => api.get(`/vpn/nodes/${id}`),
  create: (data: unknown) => api.post('/vpn/nodes', data),
  destroy: (id: number) => api.delete(`/vpn/nodes/${id}`),
  clientConfig: (id: number, slot = 1) =>
    api.get(`/vpn/nodes/${id}/client-config?slot=${slot}`, { responseType: 'text' }),
  xrayLink: (id: number) =>
    api.get<{ link: string; sni: string; port: number }>(`/vpn/nodes/${id}/xray-link`),
  getChain: (id: number) =>
    api.get<ChainInfo | null>(`/vpn/nodes/${id}/chain`),
  setChain: (id: number, exitNodeId: number) =>
    api.post<ChainInfo>(`/vpn/nodes/${id}/chain`, { exit_node_id: exitNodeId }),
  removeChain: (id: number) =>
    api.delete(`/vpn/nodes/${id}/chain`),
  applyChain: (nodeIds: number[]) =>
    api.post('/vpn/nodes/chain/apply', { node_ids: nodeIds }),
  getActiveChain: () =>
    api.get<{ chain: Array<{ id: number; region_city: string; region_country: string; status: string; ip_address: string | null }> }>('/vpn/nodes/chain/active'),
  testNode: (id: number) =>
    api.get<{ xray_active: boolean; xray_status: string; public_ip: string; node_ip: string }>(`/vpn/nodes/${id}/test`),
  subscriptionUrl: () => {
    const token = localStorage.getItem('xylofence_token') ?? ''
    const base = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL
      : `${window.location.origin}/api`
    return `${base}/vpn/nodes/subscription?token=${encodeURIComponent(token)}`
  },
}

// ── Incidents ─────────────────────────────────────────────────────────────────
export const incidentsApi = {
  list: () => api.get('/incidents'),
  get: (id: number) => api.get(`/incidents/${id}`),
  update: (id: number, data: unknown) => api.patch(`/incidents/${id}`, data),
}

// ── Invitations ───────────────────────────────────────────────────────────────
export const invitationsApi = {
  create: (data: { email?: string; role: string }) => api.post('/auth/invite', data),
  list: () => api.get('/auth/invitations'),
  delete: (id: number) => api.delete(`/auth/invitations/${id}`),
  validate: (token: string) => api.get(`/auth/invite/${token}`),
  register: (data: { token: string; full_name: string; password: string }) =>
    api.post('/auth/register', data),
}

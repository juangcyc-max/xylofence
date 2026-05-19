import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  serversApi, peersApi, usersApi, auditApi,
  assetsApi, scansApi, incidentsApi, hostScansApi, invitationsApi,
} from '@/lib/api'

// ── VPN Servers ───────────────────────────────────────────────────────────────
export const useServers = () =>
  useQuery({ queryKey: ['servers'], queryFn: () => serversApi.list().then(r => r.data) })

export const useCreateServer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => serversApi.create(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servers'] }),
  })
}

export const useUpdateServer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) => serversApi.update(id, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servers'] }),
  })
}

export const useDeleteServer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => serversApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servers'] }),
  })
}

// ── VPN Peers ─────────────────────────────────────────────────────────────────
export const usePeers = (params?: { user_id?: number; server_id?: number }) =>
  useQuery({ queryKey: ['peers', params], queryFn: () => peersApi.list(params).then(r => r.data) })

export const useCreatePeer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => peersApi.create(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['peers'] }),
  })
}

export const useRevokePeer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => peersApi.revoke(id).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['peers'] }),
  })
}

export const useRestorePeer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => peersApi.restore(id).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['peers'] }),
  })
}

export const useDeletePeer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => peersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['peers'] }),
  })
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const useUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: () => usersApi.list().then(r => r.data) })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => usersApi.create(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) => usersApi.update(id, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export const useAuditLogs = (limit = 100) =>
  useQuery({ queryKey: ['audit', limit], queryFn: () => auditApi.list(limit).then(r => r.data) })

// ── Assets ────────────────────────────────────────────────────────────────────
export const useAssets = () =>
  useQuery({ queryKey: ['assets'], queryFn: () => assetsApi.list().then(r => r.data) })

export const useCreateAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => assetsApi.create(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}

export const useDeleteAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => assetsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}

// ── Scans ─────────────────────────────────────────────────────────────────────
export const useScans = () =>
  useQuery({ queryKey: ['scans'], queryFn: () => scansApi.list().then(r => r.data) })

export const useCreateScan = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => scansApi.create(data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scans'] })
      qc.invalidateQueries({ queryKey: ['incidents'] })
    },
  })
}

export const useScanFindings = (id: number | null) =>
  useQuery({
    queryKey: ['findings', id],
    queryFn: () => scansApi.findings(id!).then(r => r.data),
    enabled: id !== null,
  })

// ── Incidents ─────────────────────────────────────────────────────────────────
export const useIncidents = () =>
  useQuery({ queryKey: ['incidents'], queryFn: () => incidentsApi.list().then(r => r.data) })

export const useUpdateIncident = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) => incidentsApi.update(id, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  })
}

// ── Host Scans ────────────────────────────────────────────────────────────────
export const useHostScans = () =>
  useQuery({ queryKey: ['host-scans'], queryFn: () => hostScansApi.list().then(r => r.data) })

export const useStartHostScan = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { target: string; timeout?: number }) => hostScansApi.start(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['host-scans'] }),
  })
}

export const useDeleteHostScan = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => hostScansApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['host-scans'] }),
  })
}

export const useSystemInfo = () =>
  useQuery({ queryKey: ['system-info'], queryFn: () => hostScansApi.systemInfo().then(r => r.data), staleTime: 60_000 })

// ── Invitations ───────────────────────────────────────────────────────────────
export const useInvitations = () =>
  useQuery({ queryKey: ['invitations'], queryFn: () => invitationsApi.list().then(r => r.data) })

export const useCreateInvitation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { email?: string; role: string }) => invitationsApi.create(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  })
}

export const useDeleteInvitation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => invitationsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  })
}

export const useValidateInvitation = (token: string) =>
  useQuery({
    queryKey: ['invitation', token],
    queryFn: () => invitationsApi.validate(token).then(r => r.data),
    retry: false,
  })

export const useRegister = () =>
  useMutation({
    mutationFn: (data: { token: string; full_name: string; password: string }) =>
      invitationsApi.register(data).then(r => r.data),
  })

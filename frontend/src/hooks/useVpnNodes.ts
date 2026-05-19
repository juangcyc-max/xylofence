import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vpnNodesApi } from '@/lib/api'

export const useVpnRegions = () =>
  useQuery({ queryKey: ['vpn-regions'], queryFn: () => vpnNodesApi.regions().then(r => r.data) })

export const useVpnNodes = () =>
  useQuery({ queryKey: ['vpn-nodes'], queryFn: () => vpnNodesApi.list().then(r => r.data), refetchInterval: 10000 })

export const useVpnNode = (id: number) =>
  useQuery({ queryKey: ['vpn-node', id], queryFn: () => vpnNodesApi.get(id).then(r => r.data), refetchInterval: 8000 })

export const useProvisionNode = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => vpnNodesApi.create(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vpn-nodes'] }),
  })
}

export const useDestroyNode = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => vpnNodesApi.destroy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vpn-nodes'] }),
  })
}

export const useNodeChain = (nodeId: number) =>
  useQuery({
    queryKey: ['vpn-node-chain', nodeId],
    queryFn: () => vpnNodesApi.getChain(nodeId).then(r => r.data),
    retry: false,
  })

export const useSetChain = (nodeId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (exitNodeId: number) => vpnNodesApi.setChain(nodeId, exitNodeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vpn-node-chain', nodeId] }),
  })
}

export const useRemoveChain = (nodeId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => vpnNodesApi.removeChain(nodeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vpn-node-chain', nodeId] }),
  })
}

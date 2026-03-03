import { useEffect, useMemo, useState } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  ChannelAPI,
  PermissionAPI,
  type PermissionSet,
} from "../lib/api"
import CreatePermissionSetModal from "../components/CreatePermissionSetModal"
import { useAuth } from "../context/AuthContext"

const DEFAULT_PERMISSION_CODES = [
  "CREATE_FUNNEL",
  "TRANSFER_WORK",
  "CLOSE_FUNNEL",
  "ADMIN_OVERRIDE",
]

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Something went wrong"
}

function permissionToCode(value: unknown): string {
  if (typeof value === "string") return value
  if (
    value &&
    typeof value === "object" &&
    "code" in value &&
    typeof (value as { code?: unknown }).code === "string"
  ) {
    return (value as { code: string }).code
  }
  return String(value)
}

function normalizePermissionSet(set: PermissionSet): PermissionSet {
  const rawId = (set as unknown as { id?: unknown }).id
  const rawName = (set as unknown as { name?: unknown }).name

  return {
    id: typeof rawId === "string" ? rawId : String(rawId),
    name:
      typeof rawName === "string" ? rawName : String(rawName),
    permissions: (set.permissions ?? []).map(permissionToCode),
  }
}

export default function PermissionSets() {
  const queryClient = useQueryClient()
  const {
    selectedChannelId,
    capabilities,
    capabilitiesLoading,
    selectChannel,
  } = useAuth()
  const channelId = selectedChannelId ?? null

  const [sets, setSets] = useState<PermissionSet[]>([])
  const [savedSets, setSavedSets] = useState<PermissionSet[]>([])
  const [activeSetId, setActiveSetId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [permissionFilter, setPermissionFilter] = useState("")

  const channelsQuery = useQuery({
    queryKey: ["channels", "permission-sets"],
    queryFn: ChannelAPI.list,
  })

  const permissionsQuery = useQuery({
    queryKey: ["permissions", "atoms"],
    queryFn: PermissionAPI.listPermissions,
    enabled: capabilities.canManagePermissions,
    retry: false,
  })

  const setsQuery = useQuery({
    queryKey: ["permissionSets", channelId],
    queryFn: () => PermissionAPI.listSets(channelId!),
    enabled: !!channelId && capabilities.canManagePermissions,
  })

  useEffect(() => {
    if (!setsQuery.data) return

    const normalizedSets = setsQuery.data.map(
      normalizePermissionSet
    )

    const backendPermissions = [
      ...new Set(
        normalizedSets.flatMap((set) => set.permissions)
      ),
    ]
    console.log(
      "[PermissionSets] Backend permissions:",
      backendPermissions
    )

    setSets(normalizedSets)
    setSavedSets(normalizedSets)
    setActiveSetId((prev) => {
      if (prev && normalizedSets.some((s) => s.id === prev)) {
        return prev
      }
      return normalizedSets[0]?.id ?? null
    })
  }, [setsQuery.data])

  const createSetMutation = useMutation({
    mutationFn: (name: string) =>
      PermissionAPI.createSet(channelId!, name),
    onSuccess: async () => {
      setShowCreate(false)
      await queryClient.invalidateQueries({
        queryKey: ["permissionSets", channelId],
      })
    },
  })

  const updateSetMutation = useMutation({
    mutationFn: ({
      id,
      permissions,
    }: {
      id: string
      permissions: string[]
    }) =>
      PermissionAPI.updateSet(
        channelId!,
        id,
        permissions
      ),
    onSuccess: async () => {
      setSavedSets(sets)
      await queryClient.invalidateQueries({
        queryKey: ["permissionSets", channelId],
      })
    },
  })

  const deleteSetMutation = useMutation({
    mutationFn: (id: string) =>
      PermissionAPI.deleteSet(channelId!, id),
    onSuccess: async (_, deletedId) => {
      setSets((prev) =>
        prev.filter((set) => set.id !== deletedId)
      )
      setSavedSets((prev) =>
        prev.filter((set) => set.id !== deletedId)
      )
      setActiveSetId((prev) =>
        prev === deletedId ? null : prev
      )
      await queryClient.invalidateQueries({
        queryKey: ["permissionSets", channelId],
      })
    },
  })

  const allPermissions = useMemo(() => {
    if (
      permissionsQuery.data &&
      permissionsQuery.data.length > 0
    ) {
      return permissionsQuery.data
    }

    const fromSets = new Set<string>()
    sets.forEach((set) => {
      set.permissions.forEach((permission) => {
        fromSets.add(permission)
      })
    })
    DEFAULT_PERMISSION_CODES.forEach((permission) => {
      fromSets.add(permission)
    })
    return [...fromSets]
  }, [permissionsQuery.data, sets])
  const activeSet = sets.find((s) => s.id === activeSetId)
  const activeSaved = savedSets.find(
    (s) => s.id === activeSetId
  )

  const filteredPermissions = useMemo(() => {
    const q = permissionFilter.trim().toLowerCase()
    if (!q) return allPermissions
    return allPermissions.filter((p) =>
      p.toLowerCase().includes(q)
    )
  }, [allPermissions, permissionFilter]).map((p) =>
    typeof p === "string" ? p : String(p)
  )

  function normalize(perms: string[]) {
    return [...perms].sort()
  }

  const isDirty = useMemo(() => {
    if (!activeSet || !activeSaved) return false
    const a = normalize(activeSet.permissions)
    const b = normalize(activeSaved.permissions)
    if (a.length !== b.length) return true
    return a.some((p, i) => p !== b[i])
  }, [activeSet, activeSaved])

  function togglePermission(permission: string) {
    if (!activeSet) return

    const updated = activeSet.permissions.includes(permission)
      ? activeSet.permissions.filter((p) => p !== permission)
      : [...activeSet.permissions, permission]

    setSets((prev) =>
      prev.map((s) =>
        s.id === activeSet.id
          ? { ...s, permissions: updated }
          : s
      )
    )
  }

  async function saveChanges() {
    if (!activeSet) return

    try {
      await updateSetMutation.mutateAsync({
        id: activeSet.id,
        permissions: activeSet.permissions,
      })
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function createNewSet(name: string) {
    try {
      await createSetMutation.mutateAsync(name)
    } catch {
      // Error is surfaced in modal.
    }
  }

  function switchSet(id: string) {
    if (isDirty) {
      const ok = confirm(
        "You have unsaved changes. Discard them and switch sets?"
      )
      if (!ok) return
    }
    setActiveSetId(id)
  }

  async function deleteActiveSet() {
    if (!activeSet) return

    const ok = confirm(
      `Delete permission set "${activeSet.name}"?`
    )
    if (!ok) return

    try {
      await deleteSetMutation.mutateAsync(activeSet.id)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const loading = setsQuery.isLoading
  const baseError = setsQuery.error || null

  if (!channelId) {
    return (
      <div className="max-w-xl space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-[var(--text-muted)]">
            Channel
          </label>
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return
              selectChannel(e.target.value)
            }}
            className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg-panel)]"
            disabled={channelsQuery.isLoading}
          >
            <option value="">Select channel</option>
            {(channelsQuery.data ?? []).map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </div>
        {channelsQuery.error && (
          <div className="text-sm text-red-400">
            Could not load channels.
          </div>
        )}
        <div className="text-[var(--text-muted)]">
          Select a channel to manage permission set templates.
        </div>
      </div>
    )
  }

  if (capabilitiesLoading) {
    return (
      <div className="text-[var(--text-muted)]">
        Loading channel permissions...
      </div>
    )
  }

  if (!capabilities.canManagePermissions) {
    return (
      <div className="max-w-xl space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-[var(--text-muted)]">
            Channel
          </label>
          <select
            value={channelId}
            onChange={(e) => {
              if (!e.target.value) return
              selectChannel(e.target.value)
            }}
            className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg-panel)]"
            disabled={channelsQuery.isLoading}
          >
            {(channelsQuery.data ?? []).map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </div>
        <div className="text-[var(--text-muted)]">
          You do not have permission to manage permission sets in this channel.
        </div>
      </div>
    )
  }

  if (loading) return <div>Loading permission sets...</div>
  if (baseError) {
    return (
      <div className="text-red-500">
        {toErrorMessage(baseError)}
      </div>
    )
  }

  if (!activeSet) {
    return (
      <div className="space-y-4">
        <div className="max-w-sm space-y-2">
          <label className="text-sm text-[var(--text-muted)]">
            Channel
          </label>
          <select
            value={channelId}
            onChange={(e) => {
              if (!e.target.value) return
              selectChannel(e.target.value)
            }}
            className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg-panel)]"
            disabled={channelsQuery.isLoading}
          >
            {(channelsQuery.data ?? []).map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
          <div className="text-lg font-semibold">
            Permission Sets
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            No permission sets yet.
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700"
          >
            + Create First Set
          </button>

          {showCreate && (
            <CreatePermissionSetModal
              onClose={() => setShowCreate(false)}
              onCreate={createNewSet}
              creating={createSetMutation.isPending}
              error={
                createSetMutation.error
                  ? toErrorMessage(createSetMutation.error)
                  : null
              }
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="max-w-sm space-y-2">
        <label className="text-sm text-[var(--text-muted)]">
          Channel
        </label>
        <select
          value={channelId}
          onChange={(e) => {
            if (!e.target.value) return
            selectChannel(e.target.value)
          }}
          className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg-panel)]"
          disabled={channelsQuery.isLoading}
        >
          {(channelsQuery.data ?? []).map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-12 gap-6 h-full">
      <div className="col-span-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-2">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">Permission Sets</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs text-emerald-400"
          >
            + New
          </button>
        </div>

        {sets.map((set, index) => (
          <button
            key={`${set.id}-${index}`}
            onClick={() => switchSet(set.id)}
            className={`w-full text-left px-3 py-2 rounded text-sm ${
              set.id === activeSetId
                ? "bg-zinc-800 text-white"
                : "text-[var(--text-muted)] hover:bg-zinc-800/40"
            }`}
          >
            {set.name}
          </button>
        ))}
      </div>

      <div className="col-span-9 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        {permissionsQuery.error && (
          <div className="mb-4 text-xs text-amber-400">
            Could not load atomic permissions. Using
            fallback permissions.
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Atomic Permissions
          </h2>
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-xs px-2 py-1 rounded bg-amber-900/60 text-amber-200">
                Unsaved changes
              </span>
            )}
            <button
              onClick={deleteActiveSet}
              disabled={deleteSetMutation.isPending}
              className="px-3 py-1.5 rounded border border-red-500 text-red-400 text-xs hover:bg-red-500/10 disabled:opacity-50"
            >
              {deleteSetMutation.isPending
                ? "Deleting..."
                : "Delete Set"}
            </button>
          </div>
        </div>

        <div className="mb-4 text-sm text-[var(--text-muted)]">
          Group atomic permissions to create and manage permission sets for admin workflows.
        </div>

        <div className="mb-4">
          <input
            value={permissionFilter}
            onChange={(e) =>
              setPermissionFilter(e.target.value)
            }
            placeholder="Search permissions..."
            className="w-full bg-zinc-800 rounded px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {filteredPermissions.map((permission, index) => (
            <label
              key={`${permission}-${index}`}
              className="flex items-center gap-3 bg-zinc-800/40 hover:bg-zinc-800 px-4 py-3 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={activeSet.permissions.includes(
                  permission
                )}
                onChange={() =>
                  togglePermission(permission)
                }
                className="accent-emerald-500"
              />
              <span className="text-sm">{permission}</span>
            </label>
          ))}
        </div>

        {filteredPermissions.length === 0 && (
          <div className="text-sm text-[var(--text-muted)]">
            No permissions match your search.
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={saveChanges}
            disabled={!isDirty || updateSetMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 px-5 py-2 rounded font-medium disabled:opacity-50"
          >
            {updateSetMutation.isPending
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>
      </div>

      {showCreate && (
        <CreatePermissionSetModal
          onClose={() => setShowCreate(false)}
          onCreate={createNewSet}
          creating={createSetMutation.isPending}
          error={
            createSetMutation.error
              ? toErrorMessage(createSetMutation.error)
              : null
          }
        />
      )}
      </div>
    </div>
  )
}

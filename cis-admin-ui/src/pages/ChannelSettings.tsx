import { useEffect, useState } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import {
  ChannelAPI,
  ChannelMemberAPI,
  PermissionAPI,
  type PermissionSet,
} from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { toUserFacingErrorMessage } from "../lib/errors"

interface AssignPermissionSetInput {
  memberId: string
  permissionSetId: string
}

interface ChannelSettingsDraft {
  walletEnabled: boolean
  knowledgeCenterAccess: boolean
  pricingEnabled: boolean
}

function toErrorMessage(error: unknown): string {
  return toUserFacingErrorMessage(error, "Something went wrong")
}

function resolvePermissionSetId(
  currentValue: string,
  sets: PermissionSet[]
): string {
  const byId = sets.find((set) => set.id === currentValue)
  if (byId) return byId.id

  const byName = sets.find((set) => set.name === currentValue)
  if (byName) return byName.id

  return ""
}

export default function ChannelSettings() {
  const { channelId } = useParams<{ channelId: string }>()
  const queryClient = useQueryClient()
  const { capabilities, capabilitiesLoading } = useAuth()
  const [overridesByMemberId, setOverridesByMemberId] = useState<
    Record<string, string>
  >({})
  const [successToast, setSuccessToast] = useState<
    string | null
  >(null)
  const [settingsDraft, setSettingsDraft] =
    useState<ChannelSettingsDraft | null>(null)

  const channelQuery = useQuery({
    queryKey: ["channel", channelId],
    queryFn: () => ChannelAPI.get(channelId!),
    enabled: !!channelId && capabilities.canUpdateChannel,
  })

  const membersQuery = useQuery({
    queryKey: ["channelMembers", channelId],
    queryFn: () => ChannelMemberAPI.list(channelId!),
    enabled:
      !!channelId &&
      capabilities.canUpdateChannel &&
      capabilities.canManagePermissions,
  })

  const permissionSetsQuery = useQuery({
    queryKey: ["permissionSets", channelId],
    queryFn: () => PermissionAPI.listSets(channelId!),
    enabled:
      !!channelId &&
      capabilities.canUpdateChannel &&
      capabilities.canManagePermissions,
  })

  const assignMutation = useMutation({
    mutationFn: ({
      memberId,
      permissionSetId,
    }: AssignPermissionSetInput) =>
      ChannelMemberAPI.assignPermissionSet(
        channelId!,
        memberId,
        permissionSetId
      ),
    onSuccess: async (_, variables) => {
      setOverridesByMemberId((prev) => {
        const next = { ...prev }
        delete next[variables.memberId]
        return next
      })
      setSuccessToast(
        "Member permissions updated successfully"
      )
      await queryClient.invalidateQueries({
        queryKey: ["channelMembers", channelId],
      })
    },
  })

  const settingsMutation = useMutation({
    mutationFn: (payload: ChannelSettingsDraft) =>
      ChannelAPI.updateSettings(channelId!, payload),
    onSuccess: async () => {
      setSettingsDraft(null)
      setSuccessToast("Channel settings updated successfully")
      await queryClient.invalidateQueries({
        queryKey: ["channel", channelId],
      })
      await queryClient.invalidateQueries({
        queryKey: ["channels"],
      })
    },
  })

  const members = membersQuery.data ?? []
  const permissionSets = permissionSetsQuery.data ?? []
  const currentSettings: ChannelSettingsDraft = settingsDraft ?? {
    walletEnabled: channelQuery.data?.walletEnabled ?? false,
    knowledgeCenterAccess:
      channelQuery.data?.knowledgeCenterAccess ?? false,
    pricingEnabled:
      channelQuery.data?.pricingEnabled ??
      channelQuery.data?.pricingEnable ??
      false,
  }
  const savedSettings: ChannelSettingsDraft = {
    walletEnabled: channelQuery.data?.walletEnabled ?? false,
    knowledgeCenterAccess:
      channelQuery.data?.knowledgeCenterAccess ?? false,
    pricingEnabled:
      channelQuery.data?.pricingEnabled ??
      channelQuery.data?.pricingEnable ??
      false,
  }
  const settingsDirty =
    currentSettings.walletEnabled !== savedSettings.walletEnabled ||
    currentSettings.knowledgeCenterAccess !==
      savedSettings.knowledgeCenterAccess ||
    currentSettings.pricingEnabled !== savedSettings.pricingEnabled

  useEffect(() => {
    if (!successToast) return
    const timeout = window.setTimeout(() => {
      setSuccessToast(null)
    }, 3000)
    return () => {
      window.clearTimeout(timeout)
    }
  }, [successToast])

  if (!channelId) {
    return <div className="text-red-500">Invalid channel</div>
  }

  if (capabilitiesLoading) {
    return (
      <div className="text-sm text-[var(--text-muted)]">
        Loading channel permissions...
      </div>
    )
  }

  if (!capabilities.canUpdateChannel) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-2">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-[var(--text-muted)]">
          You do not have permission to access channel settings.
        </p>
      </div>
    )
  }

  if (
    channelQuery.isLoading ||
    (capabilities.canManagePermissions &&
      (membersQuery.isLoading || permissionSetsQuery.isLoading))
  ) {
    return (
      <div className="text-sm text-[var(--text-muted)]">
        Loading channel settings...
      </div>
    )
  }

  if (
    channelQuery.error ||
    (capabilities.canManagePermissions &&
      (membersQuery.error || permissionSetsQuery.error))
  ) {
    return (
      <div className="text-red-500">
        {toErrorMessage(
          channelQuery.error ??
            membersQuery.error ??
            permissionSetsQuery.error
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {successToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 rounded-md border border-emerald-700 bg-emerald-900/95 px-4 py-2 text-sm text-emerald-100 shadow-lg"
        >
          {successToast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Manage channel features and member permissions.
        </p>
      </div>

      {settingsMutation.error && (
        <div className="text-sm text-red-400">
          {toErrorMessage(settingsMutation.error)}
        </div>
      )}

      {assignMutation.error && (
        <div className="text-sm text-red-400">
          {toErrorMessage(assignMutation.error)}
        </div>
      )}

      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Channel Features</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Enable or disable channel capabilities.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              key: "walletEnabled" as const,
              label: "Wallet",
            },
            {
              key: "knowledgeCenterAccess" as const,
              label: "Knowledge Center",
            },
            {
              key: "pricingEnabled" as const,
              label: "Pricing",
            },
          ].map((setting) => (
            <label
              key={setting.key}
              className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3"
            >
              <span className="text-sm font-semibold">{setting.label}</span>
              <input
                type="checkbox"
                checked={currentSettings[setting.key]}
                onChange={(event) =>
                  setSettingsDraft({
                    ...currentSettings,
                    [setting.key]: event.target.checked,
                  })
                }
                className="h-5 w-5 accent-emerald-600"
              />
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={!settingsDirty || settingsMutation.isPending}
            onClick={() => settingsMutation.mutate(currentSettings)}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {settingsMutation.isPending
              ? "Saving..."
              : "Save Settings"}
          </button>
        </div>
      </section>

      {!capabilities.canManagePermissions && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-2">
          <h2 className="text-lg font-semibold">Member Permissions</h2>
          <p className="text-sm text-[var(--text-muted)]">
            You can update channel settings, but you do not have permission to manage member permissions.
          </p>
        </div>
      )}

      {capabilities.canManagePermissions && permissionSets.length === 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-2">
          <h2 className="text-lg font-semibold">Member Permissions</h2>
          <p className="text-sm text-[var(--text-muted)]">
            No permission sets exist for this channel. Create one in the Permission Sets page first.
          </p>
        </div>
      )}

      {capabilities.canManagePermissions && permissionSets.length > 0 && (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800 text-zinc-300">
            <tr>
              <th className="text-left px-4 py-3">Member</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Current Set</th>
              <th className="text-left px-4 py-3">Assign Set</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const currentPermissionSetId = resolvePermissionSetId(
                member.permissionSet,
                permissionSets
              )
              const selectedPermissionSetId =
                overridesByMemberId[member.id] ??
                currentPermissionSetId

              const currentSetName =
                permissionSets.find(
                  (set) => set.id === currentPermissionSetId
                )?.name ?? member.permissionSet

              const isDirty =
                !!selectedPermissionSetId &&
                selectedPermissionSetId !==
                  currentPermissionSetId

              const isSavingThisRow =
                assignMutation.isPending &&
                assignMutation.variables?.memberId ===
                  member.id

              return (
                <tr
                  key={member.id}
                  className="border-t border-[var(--border)]"
                >
                  <td className="px-4 py-3 font-medium">
                    {member.name}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {member.email}
                  </td>
                  <td className="px-4 py-3">
                    {currentSetName || "Unassigned"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={selectedPermissionSetId}
                      onChange={(e) => {
                        const nextValue = e.target.value
                        setOverridesByMemberId((prev) => ({
                          ...prev,
                          [member.id]: nextValue,
                        }))
                      }}
                      className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg-panel)]"
                    >
                      <option value="">Select permission set</option>
                      {permissionSets.map((set) => (
                        <option
                          key={set.id}
                          value={set.id}
                        >
                          {set.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={!isDirty || isSavingThisRow}
                      onClick={() => {
                        if (!selectedPermissionSetId) return
                        void assignMutation.mutateAsync({
                          memberId: member.id,
                          permissionSetId:
                            selectedPermissionSetId,
                        })
                      }}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-xs disabled:opacity-50"
                    >
                      {isSavingThisRow
                        ? "Saving..."
                        : "Save"}
                    </button>
                  </td>
                </tr>
              )
            })}
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-[var(--text-muted)]"
                >
                  No members found for this channel.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useParams, useNavigate } from "react-router-dom"
import {
  ApiError,
  ChannelAPI,
  ChannelMemberAPI,
  FunnelAPI,
  LeadAPI,
  type CreateLeadPayload,
  type FunnelDefinition,
  type Lead,
} from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { canViewFunnels } from "../lib/access"

const STAGE_OPTIONS = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTED",
  "ORDER_PLACED",
  "ORDER_COMPLETED",
  "DROPPED",
  "CLOSED",
]

const STATUS_OPTIONS = ["ACTIVE", "FROZEN", "CLOSED"]
const EMPTY_LEADS: Lead[] = []
const CREATE_LEAD_PERMISSIONS = [
  "CREATE_LEAD",
  "LEAD_CREATE",
  "CREATE_CHANNEL_LEAD",
  "CREATE_FUNNEL_LEAD",
]
const ASSIGN_LEAD_PERMISSIONS = [
  "ASSIGN_LEAD",
  "LEAD_ASSIGN",
  "TRANSFER_LEAD",
  "UPDATE_LEAD_OWNER",
]

function formatDate(value: string | null): string {
  if (!value) return "-"
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return value

  return new Date(timestamp).toLocaleString()
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function hasAnyPermission(
  currentPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some((permission) =>
    currentPermissions.includes(permission)
  )
}

function toErrorMessage(
  error: unknown,
  fallback: string,
  forbiddenMessage?: string
): string {
  if (
    forbiddenMessage &&
    error instanceof ApiError &&
    error.status === 403
  ) {
    return forbiddenMessage
  }

  if (error instanceof Error) return error.message
  return fallback
}

export default function FunnelView() {
  const { channelId, id } = useParams<{
    channelId: string
    id: string
  }>()
  const { isAdmin, permissions } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canViewFunnelMeta = canViewFunnels(
    isAdmin,
    permissions
  )
  const backToPath = canViewFunnelMeta
    ? `/channels/${channelId}/funnels`
    : `/channels/${channelId}`
  const canCreateLead =
    isAdmin ||
    permissions.includes("ADMIN_OVERRIDE") ||
    hasAnyPermission(permissions, CREATE_LEAD_PERMISSIONS)
  const canAssignLead =
    isAdmin ||
    permissions.includes("ADMIN_OVERRIDE") ||
    hasAnyPermission(permissions, ASSIGN_LEAD_PERMISSIONS)

  const [stageFilter, setStageFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [ownerFilter, setOwnerFilter] = useState("ALL")
  const [nameSearch, setNameSearch] = useState("")
  const [phoneSearch, setPhoneSearch] = useState("")
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>(
    []
  )

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [assignWorkerId, setAssignWorkerId] = useState("")
  const [showCreateLead, setShowCreateLead] = useState(false)
  const [showAssignLeads, setShowAssignLeads] = useState(false)

  const funnelQuery = useQuery({
    queryKey: ["funnel", channelId, id],
    queryFn: () => FunnelAPI.get(channelId!, id!),
    enabled: !!channelId && !!id && canViewFunnelMeta,
  })

  const channelQuery = useQuery({
    queryKey: ["channel", channelId],
    queryFn: () => ChannelAPI.get(channelId!),
    enabled: !!channelId,
  })

  const leadsQuery = useQuery({
    queryKey: ["leads", channelId, id],
    queryFn: () => LeadAPI.list(channelId!, id!),
    enabled: !!channelId && !!id,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  })

  const membersQuery = useQuery({
    queryKey: ["channelMembers", channelId],
    queryFn: () => ChannelMemberAPI.list(channelId!),
    enabled: !!channelId && canAssignLead,
    retry: false,
  })

  const createLeadMutation = useMutation({
    mutationFn: (payload: CreateLeadPayload) =>
      LeadAPI.create(channelId!, payload),
    onSuccess: async () => {
      setCustomerName("")
      setCustomerPhone("")
      setCustomerEmail("")
      await queryClient.invalidateQueries({
        queryKey: ["leads", channelId, id],
      })
    },
  })

  const assignLeadsMutation = useMutation({
    mutationFn: (payload: {
      funnelId: string
      workerId: string
      leadsId: string[]
    }) => LeadAPI.assign(channelId!, payload),
    onSuccess: async () => {
      setSelectedLeadIds([])
      await queryClient.invalidateQueries({
        queryKey: ["leads", channelId, id],
      })
    },
  })

  const funnel: FunnelDefinition | undefined = funnelQuery.data
  const leads: Lead[] = leadsQuery.data ?? EMPTY_LEADS
  const leadById = useMemo(
    () =>
      new Map(
        leads.map((lead) => [lead.id, lead] as const)
      ),
    [leads]
  )
  const leadIdSet = useMemo(
    () => new Set(leads.map((lead) => lead.id)),
    [leads]
  )
  const validSelectedLeadIds = useMemo(
    () =>
      selectedLeadIds.filter((leadId) =>
        leadIdSet.has(leadId)
      ),
    [selectedLeadIds, leadIdSet]
  )
  const selectedBackendLeadIds = useMemo(
    () =>
      validSelectedLeadIds.flatMap((leadId) => {
        const backendId = leadById.get(leadId)?.backendId
        return backendId ? [backendId] : []
      }),
    [validSelectedLeadIds, leadById]
  )

  const ownerOptions = useMemo(() => {
    return [...new Set(leads.map((lead) => lead.ownerMemberName))]
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right))
  }, [leads])

  const workerOptions = useMemo(() => {
    return (membersQuery.data ?? [])
      .filter(
        (member) =>
          member.status === "ACTIVE" && !!member.userId
      )
      .map((member) => ({
        id: member.userId!,
        name: member.name,
      }))
  }, [membersQuery.data])

  const filteredLeads = useMemo(() => {
    const normalizedName = normalizeText(nameSearch)
    const normalizedPhone = normalizeText(phoneSearch)

    return leads.filter((lead) => {
      if (stageFilter !== "ALL" && lead.stage !== stageFilter) {
        return false
      }

      if (statusFilter !== "ALL" && lead.status !== statusFilter) {
        return false
      }

      if (
        ownerFilter !== "ALL" &&
        lead.ownerMemberName !== ownerFilter
      ) {
        return false
      }

      if (normalizedName) {
        const leadName = normalizeText(
          lead.customerSnapshot.name ?? ""
        )
        if (!leadName.includes(normalizedName)) {
          return false
        }
      }

      if (normalizedPhone) {
        const leadPhone = normalizeText(
          lead.customerSnapshot.phone ?? ""
        )
        if (!leadPhone.includes(normalizedPhone)) {
          return false
        }
      }

      return true
    })
  }, [
    leads,
    stageFilter,
    statusFilter,
    ownerFilter,
    nameSearch,
    phoneSearch,
  ])

  const allVisibleSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((lead) =>
      validSelectedLeadIds.includes(lead.id)
    )

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    console.debug("[FunnelView leadsQuery state]", {
      channelId,
      funnelId: id,
      isLoading: leadsQuery.isLoading,
      isFetching: leadsQuery.isFetching,
      isError: leadsQuery.isError,
      leadCount: leadsQuery.data?.length ?? 0,
      error:
        leadsQuery.error instanceof Error
          ? leadsQuery.error.message
          : leadsQuery.error ?? null,
    })
  }, [
    channelId,
    id,
    leadsQuery.isLoading,
    leadsQuery.isFetching,
    leadsQuery.isError,
    leadsQuery.data,
    leadsQuery.error,
  ])

  function toggleLeadSelection(leadId: string): void {
    setSelectedLeadIds((current) =>
      current.includes(leadId)
        ? current.filter((id) => id !== leadId)
        : [...current, leadId]
    )
  }

  function toggleAllVisible(): void {
    const visibleIds = filteredLeads.map((lead) => lead.id)

    if (allVisibleSelected) {
      const visibleIdSet = new Set(visibleIds)
      setSelectedLeadIds((current) =>
        current.filter((id) => !visibleIdSet.has(id))
      )
      return
    }

    setSelectedLeadIds((current) => {
      const merged = new Set(current)
      visibleIds.forEach((leadId) =>
        merged.add(leadId)
      )
      return [...merged]
    })
  }

  function submitCreateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!channelId || !id) return
    if (!canCreateLead) return

    const trimmedName = customerName.trim()
    const trimmedPhone = customerPhone.trim()
    const trimmedEmail = customerEmail.trim()

    if (!trimmedName || !trimmedPhone) {
      return
    }

    const payload: CreateLeadPayload = {
      customerName: trimmedName,
      customerPhone: trimmedPhone,
      funnelId: id,
    }

    if (trimmedEmail) {
      payload.customerEmail = trimmedEmail
    }

    createLeadMutation.mutate(payload)
  }

  function submitAssignLeads(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!id || !assignWorkerId.trim()) return
    if (selectedBackendLeadIds.length === 0) return
    if (!canAssignLead) return

    assignLeadsMutation.mutate({
      funnelId: id,
      workerId: assignWorkerId.trim(),
      leadsId: selectedBackendLeadIds,
    })
  }

  if (!channelId || !id) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-red-500">Invalid channel or funnel id</div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          ← Back
        </button>
      </div>
    )
  }

  const createError = createLeadMutation.error
    ? toErrorMessage(
      createLeadMutation.error,
      "Unable to create lead."
    )
    : null

  const assignError = assignLeadsMutation.error
    ? toErrorMessage(
      assignLeadsMutation.error,
      "Unable to assign leads."
    )
    : null

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {funnel?.name ?? "Assigned Leads"}
          </h2>
          <p className="text-base text-[var(--text-muted)]">
            {canViewFunnelMeta
              ? "Lead list and actions for this funnel."
              : "Lead list for your assigned access in this funnel."}
          </p>
        </div>

        <button
          onClick={() =>
            navigate(backToPath)
          }
          className="px-3 py-1.5 rounded border border-[var(--border)] text-xs hover:bg-[var(--accent-soft)]"
        >
          {canViewFunnelMeta ? "Back to Funnels" : "Back to Channel"}
        </button>
      </div>

      {!canViewFunnelMeta && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-200">
          Funnel navigation is hidden for your role. You can still work on leads assigned to you.
        </div>
      )}

      {canViewFunnelMeta && funnelQuery.error && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-200">
          {toErrorMessage(
            funnelQuery.error,
            "Unable to load funnel details."
          )}
        </div>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 flex flex-wrap items-center gap-3">
        <span className="text-base font-semibold text-[var(--text-muted)]">
          Lead Actions
        </span>
        {canCreateLead && (
          <button
            onClick={() => setShowCreateLead((current) => !current)}
            className="px-3 py-1.5 rounded border border-[var(--border)] text-sm font-medium hover:bg-[var(--accent-soft)]"
          >
            {showCreateLead ? "Hide Create Lead" : "+ Create Lead"}
          </button>
        )}
        {canAssignLead && (
          <button
            onClick={() => setShowAssignLeads((current) => !current)}
            className="px-3 py-1.5 rounded border border-[var(--border)] text-sm font-medium hover:bg-[var(--accent-soft)]"
          >
            {showAssignLeads ? "Hide Assign Leads" : "Assign Leads"}
          </button>
        )}
        {!canCreateLead && !canAssignLead && (
          <span className="text-sm text-[var(--text-muted)]">
            You can view leads but cannot create or assign them.
          </span>
        )}
      </div>

      {canViewFunnelMeta && funnel && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <h3 className="text-base font-semibold">Funnel Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Active Channel"
              value={
                channelQuery.data?.name ?? channelId ?? "-"
              }
            />
            <Field label="Funnel Name" value={funnel.name} />
            <Field label="Funnel ID" value={funnel.id} mono muted />
            <Field
              label="Created At"
              value={formatDate(funnel.createdAt)}
            />
            <Field
              label="Created By"
              value={funnel.createdBy}
              mono
              muted
            />
          </div>
        </div>
      )}

      {canCreateLead && showCreateLead && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <h3 className="text-base font-semibold">Create Lead</h3>
          <form
            onSubmit={submitCreateLead}
            className="grid grid-cols-1 md:grid-cols-4 gap-3"
          >
            <input
              value={customerName}
              onChange={(event) =>
                setCustomerName(event.target.value)
              }
              placeholder="Customer name"
              className="px-3 py-2 rounded bg-zinc-800 text-base"
              required
            />
            <input
              value={customerPhone}
              onChange={(event) =>
                setCustomerPhone(event.target.value)
              }
              placeholder="Customer phone"
              className="px-3 py-2 rounded bg-zinc-800 text-base"
              required
            />
            <input
              value={customerEmail}
              onChange={(event) =>
                setCustomerEmail(event.target.value)
              }
              placeholder="Customer email (optional)"
              className="px-3 py-2 rounded bg-zinc-800 text-base"
            />
            <button
              type="submit"
              disabled={
                createLeadMutation.isPending ||
                !customerName.trim() ||
                !customerPhone.trim()
              }
              className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm font-semibold"
            >
              {createLeadMutation.isPending
                ? "Creating..."
                : "Create Lead"}
            </button>
          </form>

          {createLeadMutation.isSuccess && (
            <p className="text-base text-emerald-400 font-medium">
              Lead created successfully.
            </p>
          )}
          {createError && (
            <p className="text-base text-red-400 font-medium">{createError}</p>
          )}
        </div>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
        <h3 className="text-base font-semibold">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            value={stageFilter}
            onChange={(event) =>
              setStageFilter(event.target.value)
            }
            className="px-3 py-2 rounded bg-zinc-800 text-base"
          >
            <option value="ALL">All stages</option>
            {STAGE_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="px-3 py-2 rounded bg-zinc-800 text-base"
          >
            <option value="ALL">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={ownerFilter}
            onChange={(event) =>
              setOwnerFilter(event.target.value)
            }
            className="px-3 py-2 rounded bg-zinc-800 text-base"
          >
            <option value="ALL">All owners</option>
            {ownerOptions.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>

          <input
            value={nameSearch}
            onChange={(event) =>
              setNameSearch(event.target.value)
            }
            placeholder="Search by customer name"
            className="px-3 py-2 rounded bg-zinc-800 text-base"
          />

          <input
            value={phoneSearch}
            onChange={(event) =>
              setPhoneSearch(event.target.value)
            }
            placeholder="Search by phone"
            className="px-3 py-2 rounded bg-zinc-800 text-base"
          />
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] text-base font-medium text-[var(--text-muted)]">
          {leadsQuery.isLoading
            ? "Loading leads..."
            : `${filteredLeads.length} lead(s) shown`}
        </div>

        {leadsQuery.error && (
          <div className="p-4 text-red-500 text-base font-medium">
            {toErrorMessage(
              leadsQuery.error,
              "Failed to load leads."
            )}
          </div>
        )}

        {!leadsQuery.isLoading &&
          !leadsQuery.error &&
          leads.length === 0 && (
          <div className="p-6 text-[var(--text-muted)] text-base">
            No leads found in this funnel.
          </div>
        )}

        {!leadsQuery.isLoading &&
          !leadsQuery.error &&
          leads.length > 0 &&
          filteredLeads.length === 0 && (
          <div className="p-6 text-[var(--text-muted)] text-base">
            No leads match the current filters.
          </div>
        )}

        {!leadsQuery.isLoading &&
          !leadsQuery.error &&
          filteredLeads.length > 0 && (
          <table className="w-full text-base">
            <thead className="text-[var(--text-muted)]">
              <tr>
                {canAssignLead && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                    />
                  </th>
                )}
                <th className="text-left px-4 py-3 font-semibold">Customer Name</th>
                <th className="text-left px-4 py-3 font-semibold">Customer Phone</th>
                <th className="text-left px-4 py-3 font-semibold">Owner</th>
                <th className="text-left px-4 py-3 font-semibold">Stage</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Created By</th>
                <th className="text-left px-4 py-3 font-semibold">Created At</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() =>
                    navigate(
                      `/channels/${channelId}/funnels/${id}/leads/${lead.id}`
                    )
                  }
                  className="border-t border-[var(--border)] cursor-pointer hover:bg-[var(--accent-soft)]"
                >
                  {canAssignLead && (
                    <td
                      className="px-4 py-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={validSelectedLeadIds.includes(lead.id)}
                        onChange={() =>
                          toggleLeadSelection(lead.id)
                        }
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 font-semibold">
                    {lead.customerSnapshot.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {lead.customerSnapshot.phone}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {lead.ownerMemberName}
                  </td>
                  <td className="px-4 py-3 font-semibold">{lead.stage}</td>
                  <td className="px-4 py-3 font-semibold">{lead.status}</td>
                  <td className="px-4 py-3 font-medium">{lead.creatorName}</td>
                  <td className="px-4 py-3 font-medium">
                    {formatDate(lead.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canAssignLead && showAssignLeads && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <h3 className="text-base font-semibold">Assign Leads</h3>
          <p className="text-base text-[var(--text-muted)]">
            Reassign selected leads to another worker.
          </p>

          <form
            onSubmit={submitAssignLeads}
            className="flex flex-col md:flex-row md:items-center gap-3"
          >
            <select
              value={assignWorkerId}
              onChange={(event) =>
                setAssignWorkerId(event.target.value)
              }
              className="px-3 py-2 rounded bg-zinc-800 text-base"
              disabled={workerOptions.length === 0}
            >
              <option value="">Select worker</option>
              {workerOptions.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name} ({worker.id})
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={
                assignLeadsMutation.isPending ||
                !assignWorkerId.trim() ||
                selectedBackendLeadIds.length === 0
              }
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold"
            >
              {assignLeadsMutation.isPending
                ? "Assigning..."
                : `Assign ${selectedBackendLeadIds.length} lead(s)`}
            </button>
          </form>

          {validSelectedLeadIds.length > 0 &&
            selectedBackendLeadIds.length === 0 && (
            <p className="text-sm text-amber-400">
              Selected leads do not have valid ObjectId values for assignment.
            </p>
          )}
          {selectedBackendLeadIds.length > 0 &&
            selectedBackendLeadIds.length < validSelectedLeadIds.length && (
            <p className="text-sm text-amber-400">
              Only {selectedBackendLeadIds.length} of{" "}
              {validSelectedLeadIds.length} selected lead(s) have valid ObjectId values and can be assigned.
            </p>
          )}

          {membersQuery.error && (
            <p className="text-sm text-amber-400">
              Could not load assignable users.
            </p>
          )}
          {!membersQuery.error &&
            !membersQuery.isLoading &&
            workerOptions.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">
              No assignable users available for this channel.
            </p>
          )}
          {assignLeadsMutation.isSuccess && (
            <p className="text-base text-emerald-400 font-medium">
              Leads assigned successfully.
            </p>
          )}
          {assignError && (
            <p className="text-base text-red-400 font-medium">{assignError}</p>
          )}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  mono,
  muted,
}: {
  label: string
  value: string
  mono?: boolean
  muted?: boolean
}) {
  return (
    <div>
      <div className="text-sm text-[var(--text-muted)] mb-1">
        {label}
      </div>
      <div
        className={[
          mono ? "font-mono text-base" : "text-base",
          !muted ? "font-medium" : "",
          muted ? "text-zinc-500" : "",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  )
}

import { useMemo, useState } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import {
  ChannelAPI,
  KnowledgeCenterAPI,
  KnowledgeItemAPI,
  UserAPI,
  type CreateKnowledgeItemPayload,
  type KnowledgeItem,
  type KnowledgeItemType,
} from "../lib/api"
import { useAuth } from "../context/AuthContext"

const ITEM_TYPES: KnowledgeItemType[] = [
  "ARTICLE",
  "VIDEO",
  "LINK",
  "DOCUMENT",
]

const INITIAL_ITEM_FORM: CreateKnowledgeItemPayload = {
  title: "",
  description: "",
  type: "ARTICLE",
  content: "",
  tags: [],
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Something went wrong."
}

function formatDate(value: string): string {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString()
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function typeTone(type: KnowledgeItemType): string {
  if (type === "VIDEO") return "text-sky-300 bg-sky-500/10"
  if (type === "DOCUMENT") return "text-amber-300 bg-amber-500/10"
  if (type === "LINK") return "text-violet-300 bg-violet-500/10"
  return "text-emerald-300 bg-emerald-500/10"
}

export default function KnowledgeCenterDetail() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [itemForm, setItemForm] =
    useState<CreateKnowledgeItemPayload>(INITIAL_ITEM_FORM)
  const [tagsText, setTagsText] = useState("")
  const [itemValidationError, setItemValidationError] = useState<
    string | null
  >(null)
  const [userSearch, setUserSearch] = useState("")
  const [channelSearch, setChannelSearch] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedChannelId, setSelectedChannelId] = useState("")
  const [pageMessage, setPageMessage] = useState<string | null>(null)

  const centerId = id ?? ""

  const centerQuery = useQuery({
    queryKey: ["knowledge-centers", centerId],
    queryFn: () => KnowledgeCenterAPI.get(centerId),
    enabled: Boolean(centerId),
  })

  const itemsQuery = useQuery({
    queryKey: ["knowledge-items", centerId],
    queryFn: () => KnowledgeItemAPI.list(centerId),
    enabled: Boolean(centerId),
  })

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: UserAPI.list,
    enabled: isAdmin,
  })

  const channelsQuery = useQuery({
    queryKey: ["channels"],
    queryFn: ChannelAPI.list,
    enabled: isAdmin,
  })

  const createItemMutation = useMutation({
    mutationFn: (payload: CreateKnowledgeItemPayload) =>
      KnowledgeItemAPI.create(centerId, payload),
    onSuccess: (created) => {
      queryClient.setQueryData<KnowledgeItem[]>(
        ["knowledge-items", centerId],
        (current) => [created, ...(current ?? [])]
      )
      setItemForm(INITIAL_ITEM_FORM)
      setTagsText("")
      setItemValidationError(null)
      setPageMessage("Knowledge item created as a draft.")
    },
  })

  const grantUserMutation = useMutation({
    mutationFn: (userId: string) =>
      KnowledgeCenterAPI.addUserAccess(centerId, { userId }),
    onSuccess: () => {
      setSelectedUserId("")
      setPageMessage("User access granted.")
    },
  })

  const grantChannelMutation = useMutation({
    mutationFn: (channelId: string) =>
      KnowledgeCenterAPI.addChannelAccess(centerId, { channelId }),
    onSuccess: () => {
      setSelectedChannelId("")
      setPageMessage("Channel access granted.")
    },
  })

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase()
    return (usersQuery.data ?? []).filter((user) =>
      [user.name, user.email, user.id]
        .join(" ")
        .toLowerCase()
        .includes(term)
    )
  }, [userSearch, usersQuery.data])

  const filteredChannels = useMemo(() => {
    const term = channelSearch.trim().toLowerCase()
    return (channelsQuery.data ?? []).filter((channel) =>
      [channel.name, channel.code, channel.id]
        .join(" ")
        .toLowerCase()
        .includes(term)
    )
  }, [channelSearch, channelsQuery.data])

  async function handleCreateItem(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    const payload: CreateKnowledgeItemPayload = {
      title: itemForm.title.trim(),
      description: itemForm.description?.trim() || undefined,
      type: itemForm.type,
      content: itemForm.content.trim(),
      tags: parseTags(tagsText),
    }

    if (!payload.title) {
      setItemValidationError("Title is required.")
      return
    }
    if (!payload.content) {
      setItemValidationError("Content is required.")
      return
    }

    setPageMessage(null)
    setItemValidationError(null)
    await createItemMutation.mutateAsync(payload)
  }

  if (centerQuery.isLoading || itemsQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)]">
        Loading knowledge center...
      </div>
    )
  }

  if (centerQuery.error || itemsQuery.error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200 shadow-[var(--shadow-card)]">
        {toErrorMessage(centerQuery.error ?? itemsQuery.error)}
      </div>
    )
  }

  const center = centerQuery.data
  const items = itemsQuery.data ?? []
  const itemBasePath = isAdmin
    ? "/admin/knowledge/items"
    : "/dealer/knowledge/items"

  if (!center) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)]">
        Knowledge center not found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              to={
                isAdmin
                  ? "/admin/knowledge-centers"
                  : "/dealer/knowledge-centers"
              }
              className="text-sm font-semibold text-[var(--accent)]"
            >
              Back to centers
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {center.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
              {center.description?.trim() || "No description available."}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm text-[var(--text-muted)]">
            {items.length} item(s)
          </div>
        </div>
      </section>

      {pageMessage && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 shadow-[var(--shadow-card)]">
          {pageMessage}
        </div>
      )}

      {isAdmin && (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-xl font-semibold">Create Item</h2>
            <form onSubmit={handleCreateItem} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={itemForm.title}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Title"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                />
                <select
                  value={itemForm.type}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      type: event.target.value as KnowledgeItemType,
                    }))
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                >
                  {ITEM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={itemForm.description ?? ""}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Description"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
              />
              <textarea
                value={itemForm.content}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                placeholder={
                  itemForm.type === "ARTICLE"
                    ? "Article body"
                    : "URL or document location"
                }
                rows={5}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
              />
              <input
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                placeholder="Tags separated by commas"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
              />
              {(itemValidationError || createItemMutation.error) && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {itemValidationError ??
                    toErrorMessage(createItemMutation.error)}
                </div>
              )}
              <button
                type="submit"
                disabled={createItemMutation.isPending}
                className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createItemMutation.isPending
                  ? "Creating..."
                  : "Save Draft"}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <AccessGrantBox
              title="Grant User Access"
              search={userSearch}
              setSearch={setUserSearch}
              selectedId={selectedUserId}
              setSelectedId={setSelectedUserId}
              options={filteredUsers.map((user) => ({
                id: user.id,
                label: `${user.name} - ${user.email}`,
              }))}
              onGrant={() => {
                if (selectedUserId) {
                  setPageMessage(null)
                  grantUserMutation.mutate(selectedUserId)
                }
              }}
              isPending={grantUserMutation.isPending}
              error={grantUserMutation.error}
            />
            <AccessGrantBox
              title="Grant Channel Access"
              search={channelSearch}
              setSearch={setChannelSearch}
              selectedId={selectedChannelId}
              setSelectedId={setSelectedChannelId}
              options={filteredChannels.map((channel) => ({
                id: channel.id,
                label: `${channel.name} - ${channel.code}`,
              }))}
              onGrant={() => {
                if (selectedChannelId) {
                  setPageMessage(null)
                  grantChannelMutation.mutate(selectedChannelId)
                }
              }}
              isPending={grantChannelMutation.isPending}
              error={grantChannelMutation.error}
            />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
        <div className="border-b border-[var(--border)] p-5">
          <h2 className="text-xl font-semibold">Items</h2>
        </div>
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            No knowledge items are available in this center yet.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <article key={item.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          typeTone(item.type),
                        ].join(" ")}
                      >
                        {item.type}
                      </span>
                      <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)]">
                        {item.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                      {item.description?.trim() ||
                        "No description available."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[var(--border)] bg-[var(--bg-panel)] px-2.5 py-1 text-xs text-[var(--text-muted)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row lg:items-center">
                    <div className="text-sm text-[var(--text-muted)]">
                      {formatDate(item.createdAt)}
                    </div>
                    <Link
                      to={
                        isAdmin
                          ? `${itemBasePath}/${item.id}/edit`
                          : `${itemBasePath}/${item.id}`
                      }
                      className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                    >
                      {isAdmin ? "Edit" : "Open"}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function AccessGrantBox({
  title,
  search,
  setSearch,
  selectedId,
  setSelectedId,
  options,
  onGrant,
  isPending,
  error,
}: {
  title: string
  search: string
  setSearch: (value: string) => void
  selectedId: string
  setSelectedId: (value: string) => void
  options: { id: string; label: string }[]
  onGrant: () => void
  isPending: boolean
  error: unknown
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
        />
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
        >
          <option value="">Select</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {error != null && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {toErrorMessage(error)}
          </div>
        )}
        <button
          type="button"
          onClick={onGrant}
          disabled={!selectedId || isPending}
          className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold transition hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Granting..." : "Grant Access"}
        </button>
      </div>
    </div>
  )
}

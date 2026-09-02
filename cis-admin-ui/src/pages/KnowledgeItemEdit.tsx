import { useEffect, useState } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  KnowledgeItemAPI,
  type KnowledgeItem,
  type KnowledgeItemType,
  type UpdateKnowledgeItemPayload,
} from "../lib/api"
import { toUserFacingErrorMessage } from "../lib/errors"

const ITEM_TYPES: KnowledgeItemType[] = [
  "ARTICLE",
  "VIDEO",
  "LINK",
  "DOCUMENT",
]

function toErrorMessage(error: unknown): string {
  return toUserFacingErrorMessage(error, "Something went wrong.")
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function tagsToText(tags: string[]): string {
  return tags.join(", ")
}

const EMPTY_FORM: UpdateKnowledgeItemPayload = {
  title: "",
  description: "",
  type: "ARTICLE",
  content: "",
  tags: [],
  isPublished: false,
}

export default function KnowledgeItemEdit() {
  const { id } = useParams()
  const itemId = id ?? ""
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] =
    useState<UpdateKnowledgeItemPayload>(EMPTY_FORM)
  const [tagsText, setTagsText] = useState("")
  const [validationError, setValidationError] = useState<string | null>(
    null
  )
  const [pageMessage, setPageMessage] = useState<string | null>(null)

  const itemQuery = useQuery({
    queryKey: ["knowledge-items", "detail", itemId],
    queryFn: () => KnowledgeItemAPI.get(itemId),
    enabled: Boolean(itemId),
  })

  useEffect(() => {
    if (!itemQuery.data) return
    setForm({
      title: itemQuery.data.title,
      description: itemQuery.data.description ?? "",
      type: itemQuery.data.type,
      content: itemQuery.data.content,
      tags: itemQuery.data.tags,
      isPublished: itemQuery.data.isPublished,
    })
    setTagsText(tagsToText(itemQuery.data.tags))
  }, [itemQuery.data])

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateKnowledgeItemPayload) =>
      KnowledgeItemAPI.update(itemId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<KnowledgeItem>(
        ["knowledge-items", "detail", itemId],
        updated
      )
      queryClient.invalidateQueries({
        queryKey: ["knowledge-items", updated.knowledgeCenterId],
      })
      setPageMessage("Knowledge item saved.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => KnowledgeItemAPI.delete(itemId),
    onSuccess: () => {
      const centerId = itemQuery.data?.knowledgeCenterId
      if (centerId) {
        queryClient.invalidateQueries({
          queryKey: ["knowledge-items", centerId],
        })
        navigate(`/admin/knowledge-centers/${centerId}`)
      } else {
        navigate("/admin/knowledge-centers")
      }
    },
  })

  function buildPayload(isPublished: boolean): UpdateKnowledgeItemPayload | null {
    const payload: UpdateKnowledgeItemPayload = {
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      type: form.type,
      content: form.content.trim(),
      tags: parseTags(tagsText),
      isPublished,
    }

    if (!payload.title) {
      setValidationError("Title is required.")
      return null
    }
    if (!payload.content) {
      setValidationError("Content is required.")
      return null
    }

    setValidationError(null)
    return payload
  }

  async function save(isPublished: boolean) {
    const payload = buildPayload(isPublished)
    if (!payload) return
    setPageMessage(null)
    await updateMutation.mutateAsync(payload)
  }

  async function deleteItem() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this item?"
    )
    if (!confirmed) return
    setPageMessage(null)
    await deleteMutation.mutateAsync()
  }

  if (itemQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)]">
        Loading knowledge item...
      </div>
    )
  }

  if (itemQuery.error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200 shadow-[var(--shadow-card)]">
        {toErrorMessage(itemQuery.error)}
      </div>
    )
  }

  const item = itemQuery.data
  if (!item) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)]">
        Knowledge item not found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <Link
          to={`/admin/knowledge-centers/${item.knowledgeCenterId}`}
          className="text-sm font-semibold text-[var(--accent)]"
        >
          Back to center
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Edit Knowledge Item
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Current status: {item.isPublished ? "Published" : "Draft"}
        </p>
      </section>

      {pageMessage && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 shadow-[var(--shadow-card)]">
          {pageMessage}
        </div>
      )}

      {(validationError || updateMutation.error || deleteMutation.error) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 shadow-[var(--shadow-card)]">
          {validationError ??
            toErrorMessage(updateMutation.error ?? deleteMutation.error)}
        </div>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Title</span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Type</span>
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
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
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Description</span>
            <input
              value={form.description ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Content</span>
            <textarea
              value={form.content}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
              rows={8}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Tags</span>
            <input
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              placeholder="installation, training"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={updateMutation.isPending}
              className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold transition hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={updateMutation.isPending}
              className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Publish
            </button>
            <button
              type="button"
              onClick={() => save(false)}
              disabled={updateMutation.isPending}
              className="rounded-xl border border-amber-500/30 px-5 py-3 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Unpublish
            </button>
            <button
              type="button"
              onClick={deleteItem}
              disabled={deleteMutation.isPending}
              className="rounded-xl border border-red-500/30 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

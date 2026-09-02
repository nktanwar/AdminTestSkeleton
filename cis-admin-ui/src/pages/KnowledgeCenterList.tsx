import { useMemo, useState } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import {
  KnowledgeCenterAPI,
  type CreateKnowledgeCenterPayload,
  type KnowledgeCenter,
} from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { toUserFacingErrorMessage } from "../lib/errors"

function toErrorMessage(error: unknown): string {
  return toUserFacingErrorMessage(error, "Something went wrong.")
}

function formatDate(value: string): string {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString()
}

const INITIAL_FORM: CreateKnowledgeCenterPayload = {
  name: "",
  description: "",
}

export default function KnowledgeCenterList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const [form, setForm] =
    useState<CreateKnowledgeCenterPayload>(INITIAL_FORM)
  const [search, setSearch] = useState("")
  const [validationError, setValidationError] = useState<string | null>(
    null
  )

  const centersQuery = useQuery({
    queryKey: ["knowledge-centers", "me"],
    queryFn: KnowledgeCenterAPI.listMine,
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateKnowledgeCenterPayload) =>
      KnowledgeCenterAPI.create(payload),
    onSuccess: (created) => {
      queryClient.setQueryData<KnowledgeCenter[]>(
        ["knowledge-centers", "me"],
        (current) => [created, ...(current ?? [])]
      )
      setForm(INITIAL_FORM)
      setValidationError(null)
      navigate(`/admin/knowledge-centers/${created.id}`)
    },
  })

  const centers = centersQuery.data ?? []
  const filteredCenters = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return centers

    return centers.filter((center) =>
      [center.name, center.description ?? "", center.status, center.id]
        .join(" ")
        .toLowerCase()
        .includes(term)
    )
  }, [centers, search])

  async function handleCreate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const payload: CreateKnowledgeCenterPayload = {
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
    }

    if (!payload.name) {
      setValidationError("Knowledge center name is required.")
      return
    }

    setValidationError(null)
    await createMutation.mutateAsync(payload)
  }

  if (centersQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)]">
        Loading knowledge centers...
      </div>
    )
  }

  if (centersQuery.error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200 shadow-[var(--shadow-card)]">
        {toErrorMessage(centersQuery.error)}
      </div>
    )
  }

  const basePath = isAdmin
    ? "/admin/knowledge-centers"
    : "/dealer/knowledge-centers"

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
              Knowledge Portal
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Knowledge Centers
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
              Browse the centers available to this account. Backend access
              rules decide which centers appear here.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm text-[var(--text-muted)]">
            {filteredCenters.length} of {centers.length} shown
          </div>
        </div>
      </section>

      {isAdmin && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-xl font-semibold">Create Center</h2>
          <form
            onSubmit={handleCreate}
            className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]"
          >
            <input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Center name"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
            />
            <input
              value={form.description ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Description"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
          </form>
          {(validationError || createMutation.error) && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {validationError ?? toErrorMessage(createMutation.error)}
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search centers"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredCenters.map((center) => (
          <article
            key={center.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">{center.name}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  {center.description?.trim() ||
                    "No description available."}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {center.status}
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-4 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[var(--text-muted)]">
                Created {formatDate(center.createdAt)}
              </div>
              <Link
                to={`${basePath}/${center.id}`}
                className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
              >
                Open
              </Link>
            </div>
          </article>
        ))}
      </div>

      {filteredCenters.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-panel)] px-6 py-10 text-center text-sm text-[var(--text-muted)]">
          No knowledge centers match the current view.
        </div>
      )}
    </div>
  )
}

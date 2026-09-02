import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import {
  KnowledgeItemAPI,
  type KnowledgeItem,
  type KnowledgeItemType,
} from "../lib/api"
import { toUserFacingErrorMessage } from "../lib/errors"

function toErrorMessage(error: unknown): string {
  return toUserFacingErrorMessage(error, "Something went wrong.")
}

function formatDate(value: string): string {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString()
}

function getVideoEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v")
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "")
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).at(0)
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {
    return null
  }

  return null
}

function typeLabel(type: KnowledgeItemType): string {
  if (type === "ARTICLE") return "Article"
  if (type === "VIDEO") return "Video"
  if (type === "DOCUMENT") return "Document"
  return "Link"
}

function ItemBody({ item }: { item: KnowledgeItem }) {
  if (item.type === "ARTICLE") {
    return (
      <div className="whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-5 text-sm leading-7 text-[var(--text-soft)]">
        {item.content}
      </div>
    )
  }

  if (item.type === "VIDEO") {
    const embedUrl = getVideoEmbedUrl(item.content)
    if (embedUrl) {
      return (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
          <iframe
            title={item.title}
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
          />
        </div>
      )
    }
  }

  if (item.type === "DOCUMENT") {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)]">
          <iframe title={item.title} src={item.content} className="h-[70vh] w-full" />
        </div>
        <ExternalButton href={item.content} label="Open Document" />
      </div>
    )
  }

  return <ExternalButton href={item.content} label={`Open ${typeLabel(item.type)}`} />
}

function ExternalButton({
  href,
  label,
}: {
  href: string
  label: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
    >
      {label}
    </a>
  )
}

export default function KnowledgeItemView() {
  const { id } = useParams()
  const itemId = id ?? ""

  const itemQuery = useQuery({
    queryKey: ["knowledge-items", "detail", itemId],
    queryFn: () => KnowledgeItemAPI.get(itemId),
    enabled: Boolean(itemId),
  })

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
          to={`/dealer/knowledge-centers/${item.knowledgeCenterId}`}
          className="text-sm font-semibold text-[var(--accent)]"
        >
          Back to center
        </Link>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
            {typeLabel(item.type)}
          </span>
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-1 text-xs text-[var(--text-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          {item.title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
          {item.description?.trim() || "No description available."}
        </p>
        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Created {formatDate(item.createdAt)}
        </p>
      </section>

      <ItemBody item={item} />
    </div>
  )
}

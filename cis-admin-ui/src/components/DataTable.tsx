import { useState } from "react"
import type { Lead, LeadSource, LeadStage } from "../types/lead"
import { LeadStage as LeadStageConst } from "../types/lead"
import { LeadSource as LeadSourceConst } from "../types/lead"
import { StageBadge } from "./StageBadge"

// Fallback function if date-fns is not available
function formatDistanceToNow(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

interface Column<T> {
  key: keyof T
  header: string
  render?: (value: T[keyof T], item: T) => React.ReactNode
}

interface DataTableProps<T extends { id: string }> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  isLoading?: boolean
  error?: Error | null
  emptyMessage?: string
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  isLoading,
  error,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortOrder("asc")
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0
    const aVal = a[sortKey]
    const bVal = b[sortKey]

    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal
    }

    return 0
  })

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error.message}</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--text-muted)]">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border)]">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="text-left px-4 py-3 font-semibold text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition"
                onClick={() => handleSort(col.key)}
              >
                <div className="flex items-center gap-2">
                  {col.header}
                  {sortKey === col.key && (
                    <span className="text-xs">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => (
            <tr
              key={item.id}
              className={`border-t border-[var(--border)] ${
                onRowClick
                  ? "cursor-pointer hover:bg-[var(--bg-subtle)] transition"
                  : ""
              }`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-3">
                  {col.render ? col.render(item[col.key], item) : String(item[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface LeadTableProps {
  leads: Lead[]
  onRowClick?: (lead: Lead) => void
  isLoading?: boolean
  error?: Error | null
  showFilters?: boolean
}

export function LeadTable({
  leads,
  onRowClick,
  isLoading,
  error,
  showFilters = true,
}: LeadTableProps) {
  const [stageFilter, setStageFilter] = useState<LeadStage | "">("")
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "">("")

  const filteredLeads = leads.filter((lead) => {
    if (stageFilter && lead.stage !== stageFilter) return false
    if (sourceFilter && lead.source !== sourceFilter) return false
    return true
  })

  const columns: Column<Lead>[] = [
    { key: "name", header: "Name" },
    {
      key: "source",
      header: "Source",
      render: (value) => (
        <span className="inline-block px-2 py-1 text-xs rounded bg-zinc-700">
          {value}
        </span>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      render: (value) => <StageBadge stage={value} size="sm" />,
    },
    { key: "assignedToName", header: "Assigned To" },
    {
      key: "updatedAt",
      header: "Last Updated",
      render: (value) => formatDistanceToNow(new Date(value)) + " ago",
    },
  ]

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Filter by Stage
            </label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as LeadStage | "")}
              className="bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm"
            >
              <option value="">All Stages</option>
              {Object.entries(LeadStageConst).map(([key, stage]) => (
                <option key={key} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Filter by Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) =>
                setSourceFilter(e.target.value as LeadSource | "")
              }
              className="bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm"
            >
              <option value="">All Sources</option>
              {Object.entries(LeadSourceConst).map(([key, source]) => (
                <option key={key} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <DataTable
        data={filteredLeads}
        columns={columns}
        onRowClick={onRowClick}
        isLoading={isLoading}
        error={error}
        emptyMessage={leads.length === 0 ? "No leads available" : "No leads match your filters"}
      />
    </div>
  )
}
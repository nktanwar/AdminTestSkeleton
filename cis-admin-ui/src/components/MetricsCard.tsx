interface MetricsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    direction: "up" | "down"
  }
  className?: string
}

export function MetricsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: MetricsCardProps) {
  return (
    <div
      className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 ${className || ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[var(--text-muted)] text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold my-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>
        {icon && <div className="ml-4 text-2xl opacity-50">{icon}</div>}
      </div>
      {trend && (
        <div
          className={`mt-4 text-sm font-medium ${
            trend.direction === "up" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          <span className="mr-1">{trend.direction === "up" ? "↑" : "↓"}</span>
          {Math.abs(trend.value)}%
        </div>
      )}
    </div>
  )
}

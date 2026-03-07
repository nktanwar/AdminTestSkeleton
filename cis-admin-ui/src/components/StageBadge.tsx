import { LeadStage } from "../types/lead"

interface StageBadgeProps {
  stage: LeadStage
  size?: "sm" | "md" | "lg"
  className?: string
}

const stageColors: Record<LeadStage, string> = {
  [LeadStage.NEW]: "bg-gray-600 text-gray-100",
  [LeadStage.CONTACTED]: "bg-blue-600 text-blue-100",
  [LeadStage.QUALIFIED]: "bg-green-600 text-green-100",
  [LeadStage.QUOTED]: "bg-orange-600 text-orange-100",
  [LeadStage.ORDER_PLACED]: "bg-purple-600 text-purple-100",
  [LeadStage.ORDER_COMPLETED]: "bg-emerald-600 text-emerald-100",
  [LeadStage.DROPPED]: "bg-red-600 text-red-100",
  [LeadStage.CLOSED]: "bg-red-700 text-red-100",
}

const stageSizes = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-base",
}

export function StageBadge({ stage, size = "md", className }: StageBadgeProps) {
  return (
    <span
      className={`inline-block rounded font-medium ${stageSizes[size]} ${stageColors[stage]} ${className || ""}`}
    >
      {stage}
    </span>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { FinancialScore } from "@/lib/financial-score"

interface Props {
  score: FinancialScore
}

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const r = 58
  const cx = 72
  const cy = 76
  const halfCirc = Math.PI * r

  const clamped = Math.min(100, Math.max(0, score))
  const progress = (clamped / 100) * halfCirc
  const dasharray = `${halfCirc} ${halfCirc * 2}`
  const dashoffset = halfCirc - progress

  return (
    <svg width="144" height="88" viewBox="0 0 144 88" aria-hidden="true">
      {/* Track */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Progress */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={dasharray}
        strokeDashoffset={dashoffset}
      />
    </svg>
  )
}

const LEVEL_STYLES: Record<string, { bg: string; text: string }> = {
  EXCELLENT: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  VERY_GOOD: { bg: "bg-emerald-400/10", text: "text-emerald-500" },
  GOOD:      { bg: "bg-blue-500/10",    text: "text-blue-600 dark:text-blue-400" },
  REGULAR:   { bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400" },
  WEAK:      { bg: "bg-orange-500/10",  text: "text-orange-600 dark:text-orange-400" },
  CRITICAL:  { bg: "bg-red-500/10",     text: "text-red-600 dark:text-red-400" },
  EMERGENCY: { bg: "bg-red-600/10",     text: "text-red-700 dark:text-red-500" },
}

const DIMENSION_STATUS_COLOR: Record<string, string> = {
  GREAT:    "bg-emerald-500",
  GOOD:     "bg-emerald-400",
  FAIR:     "bg-amber-400",
  POOR:     "bg-orange-500",
  CRITICAL: "bg-red-500",
  "N/A":    "bg-muted",
}

export function ScoreWidget({ score }: Props) {
  const levelStyle = LEVEL_STYLES[score.level] ?? LEVEL_STYLES.REGULAR
  const topDimensions = score.dimensions.slice(0, 3)

  return (
    <Card className="h-full border-border/60 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Score do mês</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Gauge + score number */}
        <div className="relative flex flex-col items-center">
          <ScoreGauge score={score.score} color={score.heatColor} />
          <div className="absolute top-6 flex flex-col items-center">
            <span className="text-4xl font-bold tabular-nums leading-none">
              {Math.round(score.score)}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">/ 100</span>
          </div>
        </div>

        {/* Level badge */}
        <div className="flex items-center justify-center gap-2">
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", levelStyle.bg, levelStyle.text)}>
            {score.label}
          </span>
        </div>

        {/* Headline */}
        <p className="text-xs text-muted-foreground text-center leading-relaxed px-1 line-clamp-2">
          {score.headline}
        </p>

        {/* Top 3 dimensions */}
        <div className="space-y-2.5">
          {topDimensions.map((dim) => (
            <div key={dim.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate pr-2">{dim.name}</span>
                <span className="font-semibold tabular-nums shrink-0">{Math.round(dim.percentage)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", DIMENSION_STATUS_COLOR[dim.status] ?? "bg-primary")}
                  style={{ width: `${Math.min(100, dim.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Remaining dimensions count */}
        {score.dimensions.length > 3 && (
          <p className="text-[10px] text-muted-foreground/60 text-center">
            +{score.dimensions.length - 3} dimensões calculadas
          </p>
        )}
      </CardContent>
    </Card>
  )
}

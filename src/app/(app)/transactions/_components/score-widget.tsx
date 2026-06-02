"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { FinancialScore } from "@/lib/financial-score"

// ─── Gauge SVG ────────────────────────────────────────────────────────────────

const DEG = Math.PI / 180
const START_ANGLE = 225   // lower-left (7:30 position)
const ARC_SPAN    = 270   // 270° clockwise to lower-right (4:30 position)

function polarToSvg(cx: number, cy: number, r: number, angleDeg: number) {
  return {
    x: cx + r * Math.cos(angleDeg * DEG),
    y: cy - r * Math.sin(angleDeg * DEG), // SVG y-axis is flipped
  }
}

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const r  = 54
  const cx = 76
  const cy = 74
  const sw = 11
  const p  = Math.min(1, Math.max(0, score / 100))

  const s = polarToSvg(cx, cy, r, START_ANGLE)
  const e = polarToSvg(cx, cy, r, START_ANGLE - ARC_SPAN)
  const trackD = `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 1 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`

  const endAngle  = START_ANGLE - p * ARC_SPAN
  const pe        = polarToSvg(cx, cy, r, endAngle)
  const largeArc  = p * ARC_SPAN > 180 ? 1 : 0
  const progressD = p > 0.01
    ? `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${pe.x.toFixed(2)} ${pe.y.toFixed(2)}`
    : null

  return (
    <svg width="152" height="116" viewBox="0 0 152 116" aria-hidden="true">
      {/* Track */}
      <path
        d={trackD}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={sw}
        strokeLinecap="round"
      />

      {/* Glow underneath */}
      {progressD && (
        <path
          d={progressD}
          fill="none"
          stroke={color}
          strokeWidth={sw + 6}
          strokeLinecap="round"
          opacity={0.15}
        />
      )}

      {/* Progress */}
      {progressD && (
        <path
          d={progressD}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      )}

      {/* Score label */}
      <text
        x={cx}
        y={cy + 8}
        textAnchor="middle"
        fontSize="40"
        fontWeight="700"
        letterSpacing="-1"
        fill="hsl(var(--foreground))"
        fontFamily="inherit"
      >
        {Math.round(score)}
      </text>
      <text
        x={cx}
        y={cy + 26}
        textAnchor="middle"
        fontSize="10"
        fill="hsl(var(--muted-foreground))"
        fontFamily="inherit"
        letterSpacing="0.5"
      >
        DE 100 PONTOS
      </text>
    </svg>
  )
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  EXCELLENT: { bg: "bg-emerald-500/10",  text: "text-emerald-600 dark:text-emerald-400", ring: "#10b981" },
  VERY_GOOD: { bg: "bg-emerald-400/10",  text: "text-emerald-500",                       ring: "#34d399" },
  GOOD:      { bg: "bg-blue-500/10",     text: "text-blue-600 dark:text-blue-400",        ring: "#60a5fa" },
  REGULAR:   { bg: "bg-amber-500/10",    text: "text-amber-600 dark:text-amber-400",      ring: "#fbbf24" },
  WEAK:      { bg: "bg-orange-500/10",   text: "text-orange-600 dark:text-orange-400",    ring: "#f97316" },
  CRITICAL:  { bg: "bg-red-500/10",      text: "text-red-600 dark:text-red-400",          ring: "#ef4444" },
  EMERGENCY: { bg: "bg-red-600/10",      text: "text-red-700 dark:text-red-500",          ring: "#dc2626" },
}

const STATUS_COLORS: Record<string, string> = {
  GREAT:    "#10b981",
  GOOD:     "#34d399",
  FAIR:     "#fbbf24",
  POOR:     "#f97316",
  CRITICAL: "#ef4444",
  "N/A":    "#94a3b8",
}

const CONFIDENCE_MAP: Record<string, { label: string; cls: string }> = {
  HIGH:   { label: "Alta",  cls: "text-emerald-500" },
  MEDIUM: { label: "Média", cls: "text-amber-500"   },
  LOW:    { label: "Baixa", cls: "text-red-500"     },
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  score: FinancialScore
}

export function ScoreWidget({ score }: Props) {
  const levelStyle  = LEVEL_STYLES[score.level] ?? LEVEL_STYLES.REGULAR
  const confidence  = CONFIDENCE_MAP[score.metadata.confidence] ?? CONFIDENCE_MAP.MEDIUM
  const dimensions  = score.dimensions.slice(0, 4)
  const topImprov   = score.improvementPoints[0] ?? null

  return (
    <Card className="h-full border-border/60 overflow-hidden flex flex-col">
      {/* Colored accent stripe */}
      <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: score.heatColor }} />

      <CardContent className="flex-1 flex flex-col p-5 gap-0 min-h-0">

        {/* ── Section 1: Gauge ──────────────────────────────────────── */}
        <div className="flex flex-col items-center">
          <ScoreGauge score={score.score} color={score.heatColor} />

          {/* Level badge */}
          <div className="-mt-1 mb-3">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold tracking-wide",
                levelStyle.bg,
                levelStyle.text,
              )}
            >
              {score.label}
            </span>
          </div>

          {/* Headline */}
          <p className="text-xs text-muted-foreground text-center leading-relaxed line-clamp-2 px-1">
            {score.headline}
          </p>
        </div>

        {/* ── Separator ─────────────────────────────────────────────── */}
        <div className="my-4 border-t border-border/50" />

        {/* ── Section 2: Dimensions ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-2.5">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
            Dimensões
          </p>

          {dimensions.map((dim) => {
            const barColor = STATUS_COLORS[dim.status] ?? STATUS_COLORS["N/A"]
            const pct      = Math.min(100, Math.round(dim.percentage))

            return (
              <div key={dim.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: barColor }}
                    />
                    <span className="text-[11px] text-muted-foreground truncate leading-none">
                      {dim.name}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-semibold tabular-nums shrink-0"
                    style={{ color: barColor }}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="h-[3px] w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Section 3: Improvement tip or footer ───────────────────── */}
        <div className="mt-4 border-t border-border/50 pt-3.5 space-y-3">
          {topImprov && (
            <div className="rounded-lg bg-muted/50 px-3 py-2.5 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Maior impacto
              </p>
              <p className="text-xs text-foreground font-medium leading-snug line-clamp-2">
                {topImprov.title}
              </p>
              <p className="text-[10px] text-muted-foreground line-clamp-1">
                +{topImprov.estimatedScoreImpact} pts estimados
              </p>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{score.metadata.activeDimensions} de {score.metadata.totalDimensions} dimensões</span>
            <span>
              Confiança:{" "}
              <span className={cn("font-semibold", confidence.cls)}>
                {confidence.label}
              </span>
            </span>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}

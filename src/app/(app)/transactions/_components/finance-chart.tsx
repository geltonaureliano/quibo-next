"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUpIcon } from "lucide-react"

interface ChartData {
  month: string
  income: number
  expense: number
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v)
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; name: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const incomeVal = payload.find((p) => p.name === "income")?.value ?? 0
  const expenseVal = payload.find((p) => p.name === "expense")?.value ?? 0
  const balance = incomeVal - expenseVal

  return (
    <div className="rounded-xl border border-border/60 bg-background/95 backdrop-blur-sm shadow-xl px-3 py-2.5 text-sm min-w-[180px]">
      <p className="font-semibold text-foreground mb-2 capitalize">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground text-xs">Receitas</span>
          </div>
          <span className="font-mono font-semibold text-emerald-600 text-xs">{fmt(incomeVal)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground text-xs">Despesas</span>
          </div>
          <span className="font-mono font-semibold text-red-600 text-xs">{fmt(expenseVal)}</span>
        </div>
        <div className="pt-1.5 border-t border-border/60 flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Saldo</span>
          <span className={`font-mono text-xs font-bold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {fmt(balance)}
          </span>
        </div>
      </div>
    </div>
  )
}

interface Props {
  data: ChartData[]
  /** Primeiro mês do gráfico (mês selecionado no switcher) */
  selectedMonthLabel: string
  /** Label do mês atual ("hoje") para marcar no gráfico */
  todayLabel: string
  /** Período exibido no subtítulo (ex: "jun. 26 – mai. 27") */
  periodLabel: string
}

export function FinanceChart({ data, selectedMonthLabel, todayLabel, periodLabel }: Props) {
  const hasData = data.some((d) => d.income > 0 || d.expense > 0)

  return (
    <Card className="h-full border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Fluxo financeiro</CardTitle>
            <CardDescription className="text-xs mt-0.5 capitalize">
              Projeção 12 meses · {periodLabel}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Receitas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span>Despesas</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pr-2">
        {!hasData ? (
          <div className="flex h-[230px] flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
              <TrendingUpIcon className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nenhuma movimentação ainda</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Adicione transações para ver o gráfico
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.4}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tick={(props) => {
                  const { x, y, payload } = props as { x: number; y: number; payload: { value: string } }
                  const isToday = payload.value === todayLabel
                  return (
                    <text
                      x={x}
                      y={y + 10}
                      textAnchor="middle"
                      fontSize={isToday ? 12 : 11}
                      fontWeight={isToday ? "700" : "400"}
                      fill={isToday ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                    >
                      {payload.value}
                    </text>
                  )
                }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Linha de referência: mês atual ("hoje") */}
              {data.some((d) => d.month === todayLabel) && (
                <ReferenceLine
                  x={todayLabel}
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  label={{
                    value: "hoje",
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "hsl(var(--primary))",
                    fontWeight: 600,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={({ cx, cy, payload }) =>
                  payload.month === todayLabel ? (
                    <circle key={`income-dot-${cx}`} cx={cx} cy={cy} r={5.5} fill="#10b981" stroke="#fff" strokeWidth={2} />
                  ) : (
                    <circle key={`income-dot-${cx}`} cx={cx} cy={cy} r={3.5} fill="#10b981" />
                  )
                }
                activeDot={{ r: 6, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={({ cx, cy, payload }) =>
                  payload.month === todayLabel ? (
                    <circle key={`expense-dot-${cx}`} cx={cx} cy={cy} r={5.5} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                  ) : (
                    <circle key={`expense-dot-${cx}`} cx={cx} cy={cy} r={3.5} fill="#ef4444" />
                  )
                }
                activeDot={{ r: 6, fill: "#ef4444", strokeWidth: 2, stroke: "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

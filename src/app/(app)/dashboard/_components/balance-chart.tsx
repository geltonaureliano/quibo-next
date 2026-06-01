"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
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
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v)
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/60 bg-background/95 backdrop-blur-sm shadow-xl px-3 py-2.5 text-sm">
      <p className="font-semibold text-foreground mb-1.5 capitalize">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground capitalize">{entry.name === "income" ? "Receitas" : "Despesas"}</span>
          <span className={`font-mono font-semibold ${entry.name === "income" ? "text-emerald-600" : "text-red-600"}`}>
            {fmt(entry.value)}
          </span>
        </div>
      ))}
      <div className="mt-1.5 pt-1.5 border-t border-border/60 flex justify-between">
        <span className="text-muted-foreground text-xs">Saldo</span>
        <span className={`font-mono text-xs font-semibold ${(payload[0]?.value ?? 0) - (payload[1]?.value ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {fmt((payload[0]?.value ?? 0) - (payload[1]?.value ?? 0))}
        </span>
      </div>
    </div>
  )
}

export function BalanceChart({ data }: { data: ChartData[] }) {
  const hasData = data.some((d) => d.income > 0 || d.expense > 0)

  return (
    <Card className="h-full border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Fluxo financeiro</CardTitle>
            <CardDescription className="text-xs mt-0.5">Receitas × despesas nos últimos 6 meses</CardDescription>
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
          <div className="flex h-[220px] flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
              <TrendingUpIcon className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nenhuma movimentação ainda</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Adicione transações para ver o gráfico
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorIncome)"
                dot={{ fill: "#10b981", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: "#10b981" }}
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#colorExpense)"
                dot={{ fill: "#ef4444", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: "#ef4444" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

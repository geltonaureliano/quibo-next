"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  WalletIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ReceiptIcon,
  ShieldAlertIcon,
  ScaleIcon,
} from "lucide-react"

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

interface OverviewCardsProps {
  totalBalance: number
  monthIncome: number
  monthExpense: number
  fixedMonthlyIncome: number
  fixedMonthlyCosts: number
  totalDebtRemaining: number
}

export function OverviewCards({
  totalBalance,
  monthIncome,
  monthExpense,
  fixedMonthlyIncome,
  fixedMonthlyCosts,
  totalDebtRemaining,
}: OverviewCardsProps) {
  const monthBalance = monthIncome - monthExpense
  const savingsRate =
    fixedMonthlyIncome > 0
      ? Math.max(0, Math.round(((fixedMonthlyIncome - fixedMonthlyCosts) / fixedMonthlyIncome) * 100))
      : 0

  const cards = [
    {
      title: "Saldo total",
      value: fmt(totalBalance),
      description: "Soma de todas as contas ativas",
      icon: WalletIcon,
      variant: totalBalance >= 0 ? "success" : "destructive",
      href: "/accounts",
      badge: totalBalance >= 0 ? "Positivo" : "Negativo",
    },
    {
      title: "Receitas do mês",
      value: fmt(monthIncome),
      description: "Transações pagas este mês",
      icon: TrendingUpIcon,
      variant: "success",
      href: "/transactions",
      badge: monthIncome > 0 ? `+ ${fmt(monthIncome)}` : "—",
    },
    {
      title: "Despesas do mês",
      value: fmt(monthExpense),
      description: "Gastos realizados este mês",
      icon: TrendingDownIcon,
      variant: "destructive",
      href: "/transactions",
      badge: monthExpense > 0 ? `- ${fmt(monthExpense)}` : "—",
    },
    {
      title: "Saldo do mês",
      value: fmt(monthBalance),
      description: "Receitas menos despesas",
      icon: ScaleIcon,
      variant: monthBalance >= 0 ? "success" : "destructive",
      href: "/transactions",
      badge: monthBalance >= 0 ? "Superávit" : "Déficit",
    },
    {
      title: "Custo fixo/mês",
      value: fmt(fixedMonthlyCosts),
      description: "Despesas recorrentes ativas",
      icon: ReceiptIcon,
      variant: "warning",
      href: "/living-costs",
      badge: `${savingsRate}% poupança potencial`,
    },
    {
      title: "Dívidas ativas",
      value: fmt(totalDebtRemaining),
      description: "Saldo devedor total",
      icon: ShieldAlertIcon,
      variant: totalDebtRemaining > 0 ? "destructive" : "success",
      href: "/debts",
      badge: totalDebtRemaining > 0 ? "Em aberto" : "Quitado",
    },
  ] as const

  const variantBg: Record<string, string> = {
    success: "bg-emerald-500/8 border-emerald-500/20",
    destructive: "bg-red-500/8 border-red-500/20",
    warning: "bg-amber-500/8 border-amber-500/20",
    default: "bg-primary/8 border-primary/20",
  }

  const variantIcon: Record<string, string> = {
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    destructive: "bg-red-500/15 text-red-600 dark:text-red-400",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    default: "bg-primary/15 text-primary",
  }

  const variantValue: Record<string, string> = {
    success: "text-emerald-700 dark:text-emerald-400",
    destructive: "text-red-700 dark:text-red-400",
    warning: "text-amber-700 dark:text-amber-400",
    default: "text-foreground",
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon
        const bg = variantBg[card.variant] ?? variantBg.default
        const iconCls = variantIcon[card.variant] ?? variantIcon.default
        const valueCls = variantValue[card.variant] ?? variantValue.default

        return (
          <Link key={card.title} href={card.href} className="group">
            <Card className={`border transition-all hover:shadow-md hover:-translate-y-0.5 ${bg}`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconCls}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <CardDescription className="text-xs font-medium leading-none">
                  {card.title}
                </CardDescription>
                <CardTitle className={`text-xl font-bold font-mono leading-none mt-1 ${valueCls}`}>
                  {card.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <p className="text-[11px] text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

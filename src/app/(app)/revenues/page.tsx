import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { toNum, fmtCurrency } from "@/lib/currency"
import { SiteHeader } from "@/components/layout/header"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { ReceitasTable } from "./_components/receitas-table"
import { RevenuesMonthBar } from "./_components/revenues-month-bar"
import { computeMonthlyRevenueStats, fmtMonthName, prevMonthYear } from "@/lib/revenue-calculations"
import { parseMonthYearSearchParams, toDateMonthIndex } from "@/lib/month-params"
import { TrendingUpIcon, CalendarIcon, CalendarDaysIcon, ClockIcon } from "lucide-react"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReceitasPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect("/login")

  const sp = await searchParams
  const { month, year } = parseMonthYearSearchParams(sp)
  const monthIndex = toDateMonthIndex(month)

  const [salaries, accounts] = await Promise.all([
    prisma.salary.findMany({
      where: { userId: session.userId },
      include: {
        account: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.account.findMany({
      where: { userId: session.userId, archived: false, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  // Serializa Decimal → number para evitar erro de serialização no Client Component
  const serializedSalaries = salaries.map((s) => ({
    ...s,
    fixedAmount: toNum(s.fixedAmount),
    hourlyRate: toNum(s.hourlyRate),
    hoursPerDay: toNum(s.hoursPerDay),
  }))

  const stats = computeMonthlyRevenueStats(serializedSalaries, year, monthIndex)
  const { year: prevY, month: prevM } = prevMonthYear(year, monthIndex)
  const prevMonthLabel = fmtMonthName(prevY, prevM).split(" ")[0]

  return (
    <>
      <SiteHeader title="Receitas" />
      <div className="flex flex-col flex-1">
        <PageHeader
          title="Receitas"
          description="Gerencie suas fontes de renda: salários, freelances, investimentos e mais"
          action={<RevenuesMonthBar />}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 px-4 pb-4 lg:px-6">
          <StatCard
            title="Valor do mês"
            value={fmtCurrency(stats.total)}
            description={`${fmtCurrency(stats.fixedTotal)} fixo · ${fmtCurrency(stats.hourlyTotal)} hora (ref. ${prevMonthLabel})`}
            icon={TrendingUpIcon}
            variant="success"
          />
          <StatCard
            title="Média por semana"
            value={fmtCurrency(stats.avgPerWeek)}
            description="Receitas do mês ÷ semanas (hora = ref. mês anterior)"
            icon={CalendarIcon}
            variant="default"
          />
          <StatCard
            title="Média por dia"
            value={fmtCurrency(stats.avgPerDay)}
            description={`Total ÷ ${stats.workDaysInMonth} dias úteis (sem feriados e fins de semana)`}
            icon={CalendarDaysIcon}
            variant="default"
          />
          <StatCard
            title="Média por hora"
            value={stats.avgPerHour != null ? fmtCurrency(stats.avgPerHour) : "—"}
            description={`${fmtCurrency(stats.total)} ÷ (${stats.workDaysInMonth} dias úteis × 8 h)`}
            icon={ClockIcon}
            variant="default"
          />
        </div>
        <ReceitasTable
          salaries={serializedSalaries}
          accounts={accounts}
          month={monthIndex}
          year={year}
        />
      </div>
    </>
  )
}

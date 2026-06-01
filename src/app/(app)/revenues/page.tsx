import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SiteHeader } from "@/components/layout/header"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { ReceitasTable } from "./_components/receitas-table"
import { RevenuesMonthBar } from "./_components/revenues-month-bar"
import { sumMonthlyRevenues } from "@/lib/revenue-calculations"
import { formatMonthYear, parseMonthYearSearchParams, toDateMonthIndex } from "@/lib/month-params"
import { TrendingUpIcon, CheckCircle2Icon, ClockIcon } from "lucide-react"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function") return (v as { toNumber: () => number }).toNumber()
  return 0
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
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
        persona: { select: { id: true, name: true, color: true } },
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

  const { fixedTotal, hourlyTotal, total } = sumMonthlyRevenues(
    serializedSalaries,
    year,
    monthIndex
  )

  const active = serializedSalaries.filter((s) => s.isActive)
  const monthLabel = formatMonthYear(month, year)

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
            title="Receita total/mês"
            value={fmtCurrency(total)}
            description={`${fmtCurrency(fixedTotal)} fixo · ${fmtCurrency(hourlyTotal)} por hora`}
            icon={TrendingUpIcon}
            variant="success"
          />
          <StatCard
            title="Valor fixo"
            value={fmtCurrency(fixedTotal)}
            description={monthLabel}
            icon={CheckCircle2Icon}
            variant="default"
          />
          <StatCard
            title="Por hora (mês)"
            value={fmtCurrency(hourlyTotal)}
            description="Estimativa com dias úteis"
            icon={ClockIcon}
            variant="default"
          />
          <StatCard
            title="Ativas"
            value={active.length}
            description={`${serializedSalaries.length - active.length} inativa(s)`}
            icon={CheckCircle2Icon}
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

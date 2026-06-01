import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SiteHeader } from "@/components/layout/header"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { SalariesTable } from "./_components/salaries-table"
import { TrendingUpIcon, CheckCircle2Icon, XCircleIcon, CalendarIcon } from "lucide-react"

export const dynamic = "force-dynamic"

function toNum(v: unknown): number {
  if (typeof v === "number") return v
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function") return (v as { toNumber: () => number }).toNumber()
  return 0
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

export default async function SalariesPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [salaries, accounts, personas] = await Promise.all([
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
    prisma.persona.findMany({
      where: { userId: session.userId, archived: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  const active = salaries.filter((s) => s.isActive)
  const fixedTotal = active
    .filter((s) => s.calculationType === "FIXED")
    .reduce((sum, s) => sum + toNum(s.fixedAmount), 0)
  const hourlyCount = active.filter((s) => s.calculationType === "HOURLY").length

  return (
    <>
      <SiteHeader title="Receitas" />
      <div className="flex flex-col flex-1">
        <PageHeader
          title="Receitas"
          description="Salários, freelances e outras fontes de renda"
          stats={
            <>
              <StatCard title="Receita fixa/mês" value={fmtCurrency(fixedTotal)} icon={TrendingUpIcon} variant="success" />
              <StatCard title="Ativas" value={active.length} icon={CheckCircle2Icon} variant="success" />
              <StatCard title="Inativas" value={salaries.length - active.length} icon={XCircleIcon} variant="warning" />
              <StatCard title="Por hora" value={hourlyCount} icon={CalendarIcon} variant="default" />
            </>
          }
        />
        <SalariesTable salaries={salaries} accounts={accounts} personas={personas} />
      </div>
    </>
  )
}

import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SiteHeader } from "@/components/layout/header"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { CreditCardsTable } from "./_components/credit-cards-table"
import { CreditCardIcon, DollarSignIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react"

export const dynamic = "force-dynamic"

function toNum(v: unknown): number {
  if (typeof v === "number") return v
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function") return (v as { toNumber: () => number }).toNumber()
  return 0
}
function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

export default async function CreditCardsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [creditCards, personas] = await Promise.all([
    prisma.creditCard.findMany({
      where: { userId: session.userId },
      include: {
        persona: { select: { id: true, name: true, color: true } },
        invoices: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 3 },
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.persona.findMany({ where: { userId: session.userId, archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ])

  const active = creditCards.filter((c) => c.isActive)
  const totalLimit = active.reduce((s, c) => s + toNum(c.limit), 0)

  return (
    <>
      <SiteHeader title="Cartões de Crédito" />
      <div className="flex flex-col flex-1">
        <PageHeader
          title="Cartões de Crédito"
          description="Gerencie seus cartões e faturas mensais"
          stats={
            <>
              <StatCard title="Limite total" value={fmtCurrency(totalLimit)} icon={DollarSignIcon} variant="default" />
              <StatCard title="Cartões ativos" value={active.length} icon={CheckCircle2Icon} variant="success" />
              <StatCard title="Inativos" value={creditCards.length - active.length} icon={XCircleIcon} variant="warning" />
              <StatCard title="Total" value={creditCards.length} icon={CreditCardIcon} variant="default" />
            </>
          }
        />
        <CreditCardsTable creditCards={creditCards} personas={personas} />
      </div>
    </>
  )
}

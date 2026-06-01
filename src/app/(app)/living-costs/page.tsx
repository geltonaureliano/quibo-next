import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SiteHeader } from "@/components/layout/header"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { LivingCostsTable } from "./_components/living-costs-table"
import { ReceiptIcon, CreditCardIcon, WalletIcon, CheckCircle2Icon } from "lucide-react"

export const dynamic = "force-dynamic"

function toNum(v: unknown): number {
  if (typeof v === "number") return v
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function") return (v as { toNumber: () => number }).toNumber()
  return 0
}
function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

export default async function LivingCostsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [livingCosts, accounts, creditCards, categories, personas] = await Promise.all([
    prisma.livingCost.findMany({
      where: { userId: session.userId },
      include: {
        account: { select: { id: true, name: true } },
        creditCard: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        persona: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.account.findMany({ where: { userId: session.userId, isActive: true, archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.creditCard.findMany({ where: { userId: session.userId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { userId: session.userId, type: "EXPENSE", archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.persona.findMany({ where: { userId: session.userId, archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ])

  const active = livingCosts.filter((lc) => lc.isActive)
  const totalMonth = active.reduce((s, lc) => s + toNum(lc.amount), 0)
  const fromAccount = active.filter((lc) => lc.sourceType === "ACCOUNT").length
  const fromCard = active.filter((lc) => lc.sourceType === "CREDIT_CARD").length

  return (
    <>
      <SiteHeader title="Custo de Vida" />
      <div className="flex flex-col flex-1">
        <PageHeader
          title="Custo de Vida"
          description="Despesas fixas recorrentes mensais"
          stats={
            <>
              <StatCard title="Total/mês" value={fmtCurrency(totalMonth)} icon={ReceiptIcon} variant="destructive" />
              <StatCard title="Itens ativos" value={active.length} icon={CheckCircle2Icon} variant="success" />
              <StatCard title="Via conta" value={fromAccount} icon={WalletIcon} variant="default" />
              <StatCard title="Via cartão" value={fromCard} icon={CreditCardIcon} variant="default" />
            </>
          }
        />
        <LivingCostsTable livingCosts={livingCosts} accounts={accounts} creditCards={creditCards} categories={categories} personas={personas} />
      </div>
    </>
  )
}

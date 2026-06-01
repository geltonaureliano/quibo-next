import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { toNum, fmtCurrency } from "@/lib/currency"
import { SiteHeader } from "@/components/layout/header"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { LivingCostsTable } from "./_components/living-costs-table"
import { ReceiptIcon, CreditCardIcon, WalletIcon, CheckCircle2Icon } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function LivingCostsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [livingCosts, accounts, creditCards] = await Promise.all([
    prisma.livingCost.findMany({
      where: { userId: session.userId },
      include: {
        account: { select: { id: true, name: true } },
        creditCard: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.account.findMany({ where: { userId: session.userId, isActive: true, archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.creditCard.findMany({ where: { userId: session.userId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ])

  const serializedLivingCosts = livingCosts.map((lc) => ({
    ...lc,
    amount: toNum(lc.amount),
  }))

  const active = serializedLivingCosts.filter((lc) => lc.isActive)
  const totalMonth = active.reduce((s, lc) => s + toNum(lc.amount), 0)
  const fromAccount = active.filter((lc) => lc.sourceType === "ACCOUNT").length
  const fromCard = active.filter((lc) => lc.sourceType === "CREDIT_CARD").length
  const totalCount = serializedLivingCosts.length

  return (
    <>
      <SiteHeader title="Custo de Vida" />
      <div className="flex flex-col flex-1">
        <PageHeader
          title="Custo de Vida"
          description="Despesas fixas recorrentes mensais"
          stats={
            <>
              <StatCard
                title="Total/mês"
                value={fmtCurrency(totalMonth)}
                description="Soma dos itens ativos"
                icon={ReceiptIcon}
                variant="destructive"
              />
              <StatCard
                title="Itens ativos"
                value={active.length}
                description={`${totalCount} cadastrado${totalCount !== 1 ? "s" : ""} no total`}
                icon={CheckCircle2Icon}
                variant="success"
              />
              <StatCard
                title="Via conta"
                value={fromAccount}
                description="Débito em conta corrente"
                icon={WalletIcon}
                variant="default"
              />
              <StatCard
                title="Via cartão"
                value={fromCard}
                description="Lançado na fatura"
                icon={CreditCardIcon}
                variant="default"
              />
            </>
          }
        />
        <LivingCostsTable livingCosts={serializedLivingCosts} accounts={accounts} creditCards={creditCards} />
      </div>
    </>
  )
}

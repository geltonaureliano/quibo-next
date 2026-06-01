import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SiteHeader } from "@/components/layout/header"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { TransactionsTable } from "./_components/transactions-table"
import { ArrowUpIcon, ArrowDownIcon, RepeatIcon, WalletIcon } from "lucide-react"

export const dynamic = "force-dynamic"

function toNum(v: unknown): number {
  if (typeof v === "number") return v
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function") return (v as { toNumber: () => number }).toNumber()
  return 0
}
function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

export default async function TransactionsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [txResult, accounts, creditCards, categories, personas] = await Promise.all([
    (async () => {
      const where = { userId: session.userId, date: { gte: startDate, lte: endDate } }
      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: {
            account: { select: { id: true, name: true, color: true } },
            creditCard: { select: { id: true, name: true, color: true } },
            category: { select: { id: true, name: true, color: true } },
            persona: { select: { id: true, name: true, color: true } },
          },
          orderBy: { date: "desc" },
          take: 50,
        }),
        prisma.transaction.count({ where }),
      ])
      return { transactions, total }
    })(),
    prisma.account.findMany({ where: { userId: session.userId, isActive: true, archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.creditCard.findMany({ where: { userId: session.userId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { userId: session.userId, archived: false }, select: { id: true, name: true, type: true }, orderBy: { name: "asc" } }),
    prisma.persona.findMany({ where: { userId: session.userId, archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ])

  const income = txResult.transactions.filter((t) => t.type === "INCOME" && t.status === "PAID").reduce((s, t) => s + toNum(t.amount), 0)
  const expense = txResult.transactions.filter((t) => t.type === "EXPENSE" && t.status === "PAID").reduce((s, t) => s + toNum(t.amount), 0)
  const balance = income - expense
  const recurring = txResult.transactions.filter((t) => t.isRecurring).length

  return (
    <>
      <SiteHeader title="Transações" />
      <div className="flex flex-col flex-1">
        <PageHeader
          title="Transações"
          description={`Hub de movimentações — ${new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(now)}`}
          stats={
            <>
              <StatCard title="Receitas" value={fmtCurrency(income)} icon={ArrowUpIcon} variant="success" />
              <StatCard title="Despesas" value={fmtCurrency(expense)} icon={ArrowDownIcon} variant="destructive" />
              <StatCard title="Saldo" value={fmtCurrency(balance)} icon={WalletIcon} variant={balance >= 0 ? "success" : "destructive"} />
              <StatCard title="Recorrentes" value={recurring} icon={RepeatIcon} variant="default" />
            </>
          }
        />
        <TransactionsTable
          transactions={txResult.transactions}
          total={txResult.total}
          page={1}
          totalPages={Math.ceil(txResult.total / 50)}
          accounts={accounts}
          creditCards={creditCards}
          categories={categories}
          personas={personas}
        />
      </div>
    </>
  )
}

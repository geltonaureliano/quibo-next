import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SiteHeader } from "@/components/layout/header"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { DebtsTable } from "./_components/debts-table"
import { ShieldAlertIcon, AlertTriangleIcon, CheckCircle2Icon, DollarSignIcon } from "lucide-react"

export const dynamic = "force-dynamic"

function toNum(v: unknown): number {
  if (typeof v === "number") return v
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function") return (v as { toNumber: () => number }).toNumber()
  return 0
}
function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

export default async function DebtsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [debts, accounts, categories] = await Promise.all([
    prisma.debt.findMany({
      where: { userId: session.userId },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        installments: { orderBy: { number: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.account.findMany({ where: { userId: session.userId, isActive: true, archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { userId: session.userId, type: "EXPENSE", archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ])

  const active = debts.filter((d) => d.status === "ACTIVE")
  const overdue = debts.filter((d) => d.status === "OVERDUE")
  const paidOff = debts.filter((d) => d.status === "PAID_OFF")
  const totalRemaining = active.reduce((s, d) => s + toNum(d.totalAmount) - toNum(d.paidAmount), 0)

  return (
    <>
      <SiteHeader title="Dívidas" />
      <div className="flex flex-col flex-1">
        <PageHeader
          title="Dívidas"
          description="Financiamentos, empréstimos e obrigações financeiras"
          stats={
            <>
              <StatCard title="Saldo devedor" value={fmtCurrency(totalRemaining)} icon={DollarSignIcon} variant="destructive" />
              <StatCard title="Ativas" value={active.length} icon={ShieldAlertIcon} variant="warning" />
              <StatCard title="Em atraso" value={overdue.length} icon={AlertTriangleIcon} variant="destructive" />
              <StatCard title="Quitadas" value={paidOff.length} icon={CheckCircle2Icon} variant="success" />
            </>
          }
        />
        <DebtsTable debts={debts} accounts={accounts} categories={categories} />
      </div>
    </>
  )
}

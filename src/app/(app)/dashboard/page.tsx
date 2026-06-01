import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SiteHeader } from "@/components/layout/header"
import { OverviewCards } from "./_components/overview-cards"
import { BalanceChart } from "./_components/balance-chart"
import { RecentTransactions } from "./_components/recent-transactions"
import { AccountsOverview } from "./_components/accounts-overview"
import { UpcomingBills } from "./_components/upcoming-bills"

export const dynamic = "force-dynamic"

function toNum(v: unknown): number {
  if (typeof v === "number") return v
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function")
    return (v as { toNumber: () => number }).toNumber()
  return 0
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Build last 6 months range
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    accounts,
    currentMonthTx,
    last6MonthsTx,
    recentTransactions,
    livingCosts,
    debts,
    creditCards,
    salaries,
  ] = await Promise.all([
    prisma.account.findMany({
      where: { userId: session.userId, isActive: true, archived: false },
      orderBy: [{ isPrimary: "desc" }, { balance: "desc" }],
    }),
    prisma.transaction.findMany({
      where: {
        userId: session.userId,
        date: { gte: startOfMonth, lte: endOfMonth },
        status: "PAID",
      },
      select: { type: true, amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId: session.userId,
        date: { gte: sixMonthsAgo, lte: endOfMonth },
        status: "PAID",
      },
      select: { type: true, amount: true, date: true },
    }),
    prisma.transaction.findMany({
      where: { userId: session.userId },
      include: {
        account: { select: { name: true, color: true } },
        creditCard: { select: { name: true, color: true } },
        category: { select: { name: true, color: true } },
      },
      orderBy: { date: "desc" },
      take: 8,
    }),
    prisma.livingCost.findMany({
      where: { userId: session.userId, isActive: true },
      select: { name: true, amount: true, dayOfMonth: true, sourceType: true },
      orderBy: { dayOfMonth: "asc" },
    }),
    prisma.debt.findMany({
      where: { userId: session.userId, status: { in: ["ACTIVE", "OVERDUE"] } },
      select: { name: true, totalAmount: true, paidAmount: true, dueDate: true, status: true, type: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.creditCard.findMany({
      where: { userId: session.userId, isActive: true },
      include: {
        invoices: {
          where: { status: { in: ["PENDING", "OVERDUE"] } },
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 1,
        },
      },
    }),
    prisma.salary.findMany({
      where: { userId: session.userId, isActive: true, calculationType: "FIXED" },
      select: { fixedAmount: true },
    }),
  ])

  // ── Overview metrics ──────────────────────────────────────────────
  const totalBalance = accounts.reduce((s, a) => s + toNum(a.balance), 0)

  const monthIncome = currentMonthTx
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + toNum(t.amount), 0)

  const monthExpense = currentMonthTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + toNum(t.amount), 0)

  const fixedMonthlyIncome = salaries.reduce((s, sal) => s + toNum(sal.fixedAmount), 0)
  const fixedMonthlyCosts = livingCosts.reduce((s, lc) => s + toNum(lc.amount), 0)

  // ── Chart data: group by month ───────────────────────────────────
  const chartMap = new Map<
    string,
    { month: string; income: number; expense: number }
  >()

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    chartMap.set(key, { month: label, income: 0, expense: 0 })
  }

  for (const tx of last6MonthsTx) {
    const d = new Date(tx.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const entry = chartMap.get(key)
    if (!entry) continue
    if (tx.type === "INCOME") entry.income += toNum(tx.amount)
    else if (tx.type === "EXPENSE") entry.expense += toNum(tx.amount)
  }

  const chartData = Array.from(chartMap.values())

  // ── Upcoming bills ───────────────────────────────────────────────
  const upcomingBills = [
    ...livingCosts.slice(0, 5).map((lc) => ({
      name: lc.name,
      amount: toNum(lc.amount),
      dueDay: lc.dayOfMonth,
      type: "living" as const,
    })),
    ...creditCards
      .filter((cc) => cc.invoices.length > 0)
      .map((cc) => ({
        name: `Fatura ${cc.name}`,
        amount: toNum(cc.invoices[0].totalAmount),
        dueDay: cc.dueDay,
        type: "invoice" as const,
      })),
    ...debts
      .filter((d) => d.dueDate)
      .map((d) => ({
        name: d.name,
        amount: toNum(d.totalAmount) - toNum(d.paidAmount),
        dueDay: d.dueDate ? new Date(d.dueDate).getDate() : 31,
        type: d.status === "OVERDUE" ? ("overdue" as const) : ("debt" as const),
      })),
  ]
    .sort((a, b) => a.dueDay - b.dueDay)
    .slice(0, 6)

  const totalDebtRemaining = debts.reduce(
    (s, d) => s + toNum(d.totalAmount) - toNum(d.paidAmount),
    0
  )

  return (
    <>
      <SiteHeader title="Dashboard" />
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        {/* Overview cards */}
        <OverviewCards
          totalBalance={totalBalance}
          monthIncome={monthIncome}
          monthExpense={monthExpense}
          fixedMonthlyIncome={fixedMonthlyIncome}
          fixedMonthlyCosts={fixedMonthlyCosts}
          totalDebtRemaining={totalDebtRemaining}
        />

        {/* Chart + Accounts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BalanceChart data={chartData} />
          </div>
          <AccountsOverview accounts={accounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            balance: toNum(a.balance),
            color: a.color,
            isPrimary: a.isPrimary,
          }))} />
        </div>

        {/* Recent Transactions + Upcoming Bills */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentTransactions
              transactions={recentTransactions.map((t) => ({
                id: t.id,
                description: t.description,
                amount: toNum(t.amount),
                type: t.type,
                status: t.status,
                date: t.date,
                account: t.account,
                creditCard: t.creditCard,
                category: t.category,
              }))}
            />
          </div>
          <UpcomingBills
            bills={upcomingBills}
            currentDay={now.getDate()}
          />
        </div>
      </div>
    </>
  )
}

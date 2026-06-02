import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SiteHeader } from "@/components/layout/header"
import { StatCard } from "@/components/shared/stat-card"
import { MonthSwitcher } from "@/components/shared/month-switcher"
import { calculateFinancialScore } from "@/lib/financial-score"
import { parseMonthYearSearchParams, toDateMonthIndex } from "@/lib/month-params"
import { sumMonthlyRevenues } from "@/lib/revenue-calculations"
import { FinanceChart } from "./_components/finance-chart"
import { ScoreWidget } from "./_components/score-widget"
import { EntitiesTabs } from "./_components/entities-tabs"
import { ArrowUpIcon, ArrowDownIcon, WalletIcon, TrendingUpIcon } from "lucide-react"

export const dynamic = "force-dynamic"

function toNum(v: unknown): number {
  if (typeof v === "number") return v
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function")
    return (v as { toNumber: () => number }).toNumber()
  return 0
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect("/login")

  const params = await searchParams
  const { month, year } = parseMonthYearSearchParams(params)

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)

  // Chart: 12 months starting from the selected month
  const endOf12Months = new Date(year, month + 11, 0, 23, 59, 59)

  const [
    transactions,
    chartRangeTx,
    livingCosts,
    debtInstallments,
    invoices,
    accounts,
    activeDebts,
    creditCards,
    categories,
    salaries,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: session.userId, date: { gte: startOfMonth, lte: endOfMonth } },
      include: {
        account: { select: { id: true, name: true, color: true } },
        creditCard: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: "desc" },
    }),

    prisma.transaction.findMany({
      where: {
        userId: session.userId,
        date: { gte: startOfMonth, lte: endOf12Months },
        status: "PAID",
      },
      select: { type: true, amount: true, date: true },
    }),

    prisma.livingCost.findMany({
      where: { userId: session.userId, isActive: true },
      include: {
        category: { select: { id: true, name: true, color: true } },
        account: { select: { id: true, name: true } },
        creditCard: { select: { id: true, name: true } },
      },
      orderBy: { dayOfMonth: "asc" },
    }),

    prisma.debtInstallment.findMany({
      where: {
        dueDate: { gte: startOfMonth, lte: endOfMonth },
        debt: { userId: session.userId },
      },
      include: {
        debt: { select: { id: true, name: true, type: true } },
      },
      orderBy: { dueDate: "asc" },
    }),

    prisma.invoice.findMany({
      where: { userId: session.userId, month, year },
      include: {
        creditCard: { select: { id: true, name: true, color: true } },
      },
      orderBy: { dueDate: "asc" },
    }),

    prisma.account.findMany({
      where: { userId: session.userId, isActive: true, archived: false },
      select: { id: true, name: true, balance: true },
      orderBy: { name: "asc" },
    }),

    prisma.debt.findMany({
      where: { userId: session.userId, status: { in: ["ACTIVE", "OVERDUE"] } },
      select: { totalAmount: true, paidAmount: true },
    }),

    prisma.creditCard.findMany({
      where: { userId: session.userId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),

    prisma.category.findMany({
      where: { userId: session.userId, archived: false },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),

    prisma.salary.findMany({
      where: { userId: session.userId },
      select: {
        calculationType: true,
        fixedAmount: true,
        hourlyRate: true,
        hoursPerDay: true,
        workDays: true,
        includeHolidays: true,
        isRecurring: true,
        isActive: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  // ── Metrics ────────────────────────────────────────────────────────────────
  const txIncome = transactions
    .filter((t) => t.type === "INCOME" && t.status === "PAID")
    .reduce((s, t) => s + toNum(t.amount), 0)

  const txExpense = transactions
    .filter((t) => t.type === "EXPENSE" && t.status === "PAID")
    .reduce((s, t) => s + toNum(t.amount), 0)

  // Salários esperados no mês (usa índice 0-based igual à página de Receitas)
  const monthIndex = toDateMonthIndex(month)
  const salaryRevenues = salaries.map((s) => ({
    calculationType: s.calculationType,
    fixedAmount: toNum(s.fixedAmount),
    hourlyRate: toNum(s.hourlyRate),
    hoursPerDay: toNum(s.hoursPerDay),
    workDays: s.workDays,
    includeHolidays: s.includeHolidays,
    isRecurring: s.isRecurring,
    isActive: s.isActive,
    startDate: s.startDate,
    endDate: s.endDate,
  }))
  const { total: salaryIncome, fixedTotal: salaryFixed, hourlyTotal: salaryHourly } =
    sumMonthlyRevenues(salaryRevenues, year, monthIndex)

  // Custo de vida fixo mensal
  const livingCostTotal = livingCosts.reduce((s, lc) => s + toNum(lc.amount), 0)

  // Totais combinados para os cards e score
  const income = txIncome + salaryIncome
  const expense = txExpense + livingCostTotal
  const balance = income - expense

  const totalBalance = accounts.reduce((s, a) => s + toNum(a.balance), 0)
  const fixedExpenses = livingCostTotal
  const totalDebt = activeDebts.reduce(
    (s, d) => s + Math.max(0, toNum(d.totalAmount) - toNum(d.paidAmount)),
    0
  )

  // ── Score do mês ──────────────────────────────────────────────────────────
  const scoreResult = calculateFinancialScore({
    totalIncome: income,
    totalExpense: expense,
    fixedExpenses: fixedExpenses > 0 ? fixedExpenses : undefined,
    totalBalance: totalBalance > 0 ? totalBalance : undefined,
    totalDebt: totalDebt > 0 ? totalDebt : undefined,
  })

  // ── Chart: 12 meses a partir do mês selecionado ──────────────────────────
  // Meses futuros = projeção com salários + custos fixos
  // Meses passados/atual = base + transações pagas reais
  const now = new Date()
  const todayLabel = new Date(now.getFullYear(), now.getMonth(), 1)
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })

  const chartEntries: Array<{ key: string; label: string; income: number; expense: number }> = []

  for (let i = 0; i < 12; i++) {
    const d = new Date(year, month - 1 + i, 1)
    const mIdx = d.getMonth()   // 0-based
    const mYear = d.getFullYear()
    const key = `${mYear}-${String(mIdx + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    const mSalary = sumMonthlyRevenues(salaryRevenues, mYear, mIdx)
    chartEntries.push({ key, label, income: mSalary.total, expense: livingCostTotal })
  }

  for (const tx of chartRangeTx) {
    const d = new Date(tx.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const entry = chartEntries.find((e) => e.key === key)
    if (!entry) continue
    if (tx.type === "INCOME") entry.income += toNum(tx.amount)
    else if (tx.type === "EXPENSE") entry.expense += toNum(tx.amount)
  }

  const chartData = chartEntries.map(({ label, income: inc, expense: exp }) => ({
    month: label,
    income: inc,
    expense: exp,
  }))

  // Período exibido no subtítulo do gráfico (ex: "jun. 26 – mai. 27")
  const chartPeriodLabel = chartEntries.length >= 2
    ? `${chartEntries[0].label} – ${chartEntries[chartEntries.length - 1].label}`
    : chartEntries[0]?.label ?? ""

  // Label do mês selecionado (primeiro ponto do gráfico)
  const selectedMonthLabel = chartEntries[0]?.label ?? ""

  // ── Serialize transactions for client ─────────────────────────────────────
  const expenseTransactions = transactions
    .filter((t) => t.type === "EXPENSE")
    .map((t) => ({
      id: t.id,
      description: t.description,
      amount: toNum(t.amount),
      type: t.type,
      status: t.status,
      date: t.date.toISOString(),
      isRecurring: t.isRecurring,
      recurrenceGroupId: t.recurrenceGroupId,
      accountId: t.accountId,
      creditCardId: t.creditCardId,
      categoryId: t.categoryId,
      notes: t.notes,
      isInstallment: t.isInstallment,
      installmentNumber: t.installmentNumber,
      totalInstallments: t.totalInstallments,
      account: t.account,
      creditCard: t.creditCard,
      category: t.category,
    }))

  const incomeTransactions = transactions
    .filter((t) => t.type === "INCOME")
    .map((t) => ({
      id: t.id,
      description: t.description,
      amount: toNum(t.amount),
      type: t.type,
      status: t.status,
      date: t.date.toISOString(),
      isRecurring: t.isRecurring,
      recurrenceGroupId: t.recurrenceGroupId,
      accountId: t.accountId,
      creditCardId: t.creditCardId,
      categoryId: t.categoryId,
      notes: t.notes,
      isInstallment: t.isInstallment,
      installmentNumber: t.installmentNumber,
      totalInstallments: t.totalInstallments,
      account: t.account,
      creditCard: t.creditCard,
      category: t.category,
    }))

  return (
    <>
      <SiteHeader title="Transações" />
      <div className="flex flex-col flex-1 gap-4 p-4 lg:p-6">

        {/* ── Month switcher ────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground hidden sm:block">
            Visão consolidada do mês
          </p>
          <Suspense>
            <MonthSwitcher align="right" showTodayButton />
          </Suspense>
        </div>

        {/* ── 4 Big Numbers ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title="Receitas"
            value={fmtCurrency(income)}
            icon={ArrowUpIcon}
            variant="success"
            description={
              salaryIncome > 0 && txIncome > 0
                ? `${fmtCurrency(salaryIncome)} salários · ${fmtCurrency(txIncome)} transações`
                : salaryIncome > 0
                ? `${fmtCurrency(salaryFixed)} fixo${salaryHourly > 0 ? ` · ${fmtCurrency(salaryHourly)} hora` : ""}`
                : `${incomeTransactions.filter((t) => t.status === "PAID").length} recebimentos`
            }
          />
          <StatCard
            title="Saídas"
            value={fmtCurrency(expense)}
            icon={ArrowDownIcon}
            variant="destructive"
            description={
              livingCostTotal > 0 && txExpense > 0
                ? `${fmtCurrency(livingCostTotal)} custo fixo · ${fmtCurrency(txExpense)} transações`
                : livingCostTotal > 0
                ? `${fmtCurrency(livingCostTotal)} em ${livingCosts.length} custos fixos`
                : `${expenseTransactions.filter((t) => t.status === "PAID").length} despesas`
            }
          />
          <StatCard
            title="Saldo Esperado"
            value={fmtCurrency(balance)}
            icon={WalletIcon}
            variant={balance >= 0 ? "success" : "destructive"}
            description={balance >= 0 ? "Sobra no mês" : "Déficit no mês"}
          />
          <StatCard
            title="Score do Mês"
            value={String(Math.round(scoreResult.score))}
            icon={TrendingUpIcon}
            variant={
              scoreResult.score >= 60
                ? "success"
                : scoreResult.score >= 45
                ? "warning"
                : "destructive"
            }
            description={scoreResult.label}
          />
        </div>

        {/* ── Chart (60%) + Score widget (40%) ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <FinanceChart
              data={chartData}
              selectedMonthLabel={selectedMonthLabel}
              todayLabel={todayLabel}
              periodLabel={chartPeriodLabel}
            />
          </div>
          <div className="lg:col-span-2">
            <ScoreWidget score={scoreResult} />
          </div>
        </div>

        {/* ── Entities Tabs ─────────────────────────────────────────── */}
        <EntitiesTabs
          expenseTransactions={expenseTransactions}
          incomeTransactions={incomeTransactions}
          livingCosts={livingCosts.map((lc) => ({
            id: lc.id,
            name: lc.name,
            amount: toNum(lc.amount),
            dayOfMonth: lc.dayOfMonth,
            sourceType: lc.sourceType,
            account: lc.account,
            creditCard: lc.creditCard,
            category: lc.category,
          }))}
          debtInstallments={debtInstallments.map((di) => ({
            id: di.id,
            debtName: di.debt.name,
            debtType: di.debt.type,
            number: di.number,
            amount: toNum(di.amount),
            dueDate: di.dueDate.toISOString(),
            status: di.status,
          }))}
          invoices={invoices.map((inv) => ({
            id: inv.id,
            creditCardName: inv.creditCard.name,
            creditCardColor: inv.creditCard.color,
            month: inv.month,
            year: inv.year,
            totalAmount: toNum(inv.totalAmount),
            paidAmount: toNum(inv.paidAmount),
            status: inv.status,
            dueDate: inv.dueDate.toISOString(),
          }))}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          creditCards={creditCards}
          categories={categories}
          monthLabel={new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        />
      </div>
    </>
  )
}

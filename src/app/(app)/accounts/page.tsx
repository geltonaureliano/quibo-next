import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SiteHeader } from "@/components/layout/header"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { AccountsTable } from "./_components/accounts-table"
import { WalletIcon, TrendingUpIcon, StarIcon, CreditCardIcon } from "lucide-react"

export const dynamic = "force-dynamic"

function toNumber(v: unknown): number {
  if (typeof v === "number") return v
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber()
  }
  return 0
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

export default async function AccountsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const accounts = await prisma.account.findMany({
    where: { userId: session.userId, archived: false },
    orderBy: { createdAt: "desc" },
  })

  const totalBalance = accounts.reduce((s, a) => s + toNumber(a.balance), 0)
  const activeCount = accounts.filter((a) => a.isActive).length
  const primaryAccount = accounts.find((a) => a.isPrimary)

  return (
    <>
      <SiteHeader title="Contas" />
      <div className="flex flex-col flex-1">
        <PageHeader
          title="Contas"
          description="Gerencie suas contas bancárias e carteiras"
          stats={
            <>
              <StatCard
                title="Saldo total"
                value={formatCurrency(totalBalance)}
                icon={WalletIcon}
                variant={totalBalance >= 0 ? "success" : "destructive"}
              />
              <StatCard
                title="Contas ativas"
                value={activeCount}
                icon={TrendingUpIcon}
                variant="default"
              />
              <StatCard
                title="Conta principal"
                value={primaryAccount?.name ?? "Nenhuma"}
                icon={StarIcon}
                variant="warning"
              />
              <StatCard
                title="Total de contas"
                value={accounts.length}
                icon={CreditCardIcon}
                variant="default"
              />
            </>
          }
        />
        <AccountsTable accounts={accounts} />
      </div>
    </>
  )
}

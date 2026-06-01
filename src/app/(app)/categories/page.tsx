import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SiteHeader } from "@/components/layout/header"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { CategoriesTable } from "./_components/categories-table"
import { TagIcon, TrendingUpIcon, TrendingDownIcon, RepeatIcon } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function CategoriesPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const categories = await prisma.category.findMany({
    where: { userId: session.userId },
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { transactions: true } },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  })

  const income = categories.filter((c) => c.type === "INCOME" && !c.archived).length
  const expense = categories.filter((c) => c.type === "EXPENSE" && !c.archived).length
  const transfer = categories.filter((c) => c.type === "TRANSFER" && !c.archived).length

  return (
    <>
      <SiteHeader title="Categorias" />
      <div className="flex flex-col flex-1">
        <PageHeader
          title="Categorias"
          description="Classifique receitas, despesas e transferências"
          stats={
            <>
              <StatCard title="Total ativas" value={income + expense + transfer} icon={TagIcon} />
              <StatCard title="Receita" value={income} icon={TrendingUpIcon} variant="success" />
              <StatCard title="Despesa" value={expense} icon={TrendingDownIcon} variant="destructive" />
              <StatCard title="Transferência" value={transfer} icon={RepeatIcon} variant="default" />
            </>
          }
        />
        <CategoriesTable categories={categories} />
      </div>
    </>
  )
}

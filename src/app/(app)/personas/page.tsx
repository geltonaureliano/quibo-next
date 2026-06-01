import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SiteHeader } from "@/components/layout/header"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { PersonasTable } from "./_components/personas-table"
import { UsersIcon, ArchiveIcon, LayoutGridIcon } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PersonasPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const personas = await prisma.persona.findMany({
    where: { userId: session.userId },
    orderBy: { name: "asc" },
  })

  const active = personas.filter((p) => !p.archived)
  const archived = personas.filter((p) => p.archived)

  return (
    <>
      <SiteHeader title="Personas" />
      <div className="flex flex-col flex-1">
        <PageHeader
          title="Personas"
          description="Contextos financeiros para separar pessoal, trabalho, PJ e projetos"
          stats={
            <>
              <StatCard title="Total" value={personas.length} icon={LayoutGridIcon} />
              <StatCard title="Ativas" value={active.length} icon={UsersIcon} variant="success" />
              <StatCard title="Arquivadas" value={archived.length} icon={ArchiveIcon} variant="warning" />
            </>
          }
        />
        <PersonasTable personas={personas} />
      </div>
    </>
  )
}

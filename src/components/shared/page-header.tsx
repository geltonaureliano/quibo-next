import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  stats?: ReactNode
}

export function PageHeader({ title, description, action, stats }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-4 lg:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {stats && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{stats}</div>}
    </div>
  )
}

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0 sm:ml-auto">{action}</div>}
      </div>
      {stats && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{stats}</div>}
    </div>
  )
}

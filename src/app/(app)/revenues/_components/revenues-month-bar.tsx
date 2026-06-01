import { Suspense } from "react"
import { MonthSwitcher } from "@/components/shared/month-switcher"
import { Skeleton } from "@/components/ui/skeleton"

function MonthSwitcherFallback() {
  return <Skeleton className="h-9 w-56 rounded-xl" />
}

/** MonthSwitcher para o slot `action` do PageHeader */
export function RevenuesMonthBar() {
  return (
    <Suspense fallback={<MonthSwitcherFallback />}>
      <MonthSwitcher align="right" />
    </Suspense>
  )
}

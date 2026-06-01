"use client"

import { useCallback, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  formatMonthYear,
  getCurrentMonthYear,
  parseMonthYearSearchParams,
} from "@/lib/month-params"

interface MonthSwitcherProps {
  className?: string
  /** Alinhamento do bloco (padrão: centro) */
  align?: "left" | "center" | "right"
  /** Exibe botão para voltar ao mês atual */
  showTodayButton?: boolean
}

export function MonthSwitcher({
  className,
  align = "center",
  showTodayButton = true,
}: MonthSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const { month, year } = parseMonthYearSearchParams(
    Object.fromEntries(searchParams.entries())
  )

  const current = getCurrentMonthYear()
  const isCurrentMonth = month === current.month && year === current.year

  const navigate = useCallback(
    (nextMonth: number, nextYear: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("month", String(nextMonth))
      params.set("year", String(nextYear))
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router, searchParams]
  )

  function goPrev() {
    if (month === 1) navigate(12, year - 1)
    else navigate(month - 1, year)
  }

  function goNext() {
    if (month === 12) navigate(1, year + 1)
    else navigate(month + 1, year)
  }

  function goToday() {
    navigate(current.month, current.year)
  }

  const alignClass =
    align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center"

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        alignClass,
        isPending && "opacity-60 pointer-events-none",
        className
      )}
    >
      {showTodayButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 cursor-pointer text-xs shrink-0"
          onClick={goToday}
          disabled={isCurrentMonth}
        >
          Hoje
        </Button>
      )}

      <div className="inline-flex items-center rounded-xl border border-border/60 bg-muted/30 p-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer shrink-0"
          onClick={goPrev}
          aria-label="Mês anterior"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>

        <button
          type="button"
          onClick={showTodayButton ? goToday : undefined}
          disabled={!showTodayButton}
          className={cn(
            "min-w-[10.5rem] px-3 py-1.5 text-sm font-semibold capitalize text-center",
            showTodayButton && "cursor-pointer hover:bg-background/80 rounded-lg transition-colors"
          )}
          title={showTodayButton ? "Ir para o mês atual" : undefined}
        >
          {formatMonthYear(month, year)}
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer shrink-0"
          onClick={goNext}
          aria-label="Próximo mês"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

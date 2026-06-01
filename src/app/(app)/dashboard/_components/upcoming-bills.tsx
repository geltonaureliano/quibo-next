import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, AlertTriangleIcon, CreditCardIcon, ReceiptIcon, ShieldAlertIcon } from "lucide-react"

interface Bill {
  name: string
  amount: number
  dueDay: number
  type: "living" | "invoice" | "debt" | "overdue"
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

const typeConfig = {
  living: {
    icon: ReceiptIcon,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    badge: "bg-amber-500/10 text-amber-600",
    label: "Custo fixo",
  },
  invoice: {
    icon: CreditCardIcon,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    badge: "bg-violet-500/10 text-violet-600",
    label: "Fatura",
  },
  debt: {
    icon: ShieldAlertIcon,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    badge: "bg-blue-500/10 text-blue-600",
    label: "Dívida",
  },
  overdue: {
    icon: AlertTriangleIcon,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    badge: "bg-red-500/10 text-red-600",
    label: "Atrasado",
  },
}

export function UpcomingBills({
  bills,
  currentDay,
}: {
  bills: Bill[]
  currentDay: number
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              Próximos vencimentos
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Contas e obrigações do mês atual
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4">
        {bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CalendarIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Nenhum vencimento registrado</p>
            <div className="flex gap-2 mt-3">
              <Link href="/living-costs">
                <Button size="sm" variant="outline" className="text-xs h-7">Custos fixos</Button>
              </Link>
              <Link href="/debts">
                <Button size="sm" variant="outline" className="text-xs h-7">Dívidas</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {bills.map((bill, i) => {
              const config = typeConfig[bill.type]
              const Icon = config.icon
              const isPast = bill.dueDay < currentDay && bill.type !== "overdue"
              const isDueToday = bill.dueDay === currentDay
              const isDueSoon = bill.dueDay <= currentDay + 3 && bill.dueDay >= currentDay

              return (
                <div
                  key={`${bill.name}-${i}`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    bill.type === "overdue"
                      ? "bg-red-500/5 border border-red-500/15"
                      : isDueSoon
                      ? "bg-amber-500/5 border border-amber-500/15"
                      : "bg-muted/30"
                  }`}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-none">{bill.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge
                        variant="secondary"
                        className={`text-[9px] px-1.5 py-0 h-3.5 ${config.badge}`}
                      >
                        {config.label}
                      </Badge>
                      {isDueToday && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5 bg-red-500/10 text-red-600">
                          Hoje!
                        </Badge>
                      )}
                      {isDueSoon && !isDueToday && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5 bg-amber-500/10 text-amber-600">
                          Em breve
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-mono font-semibold">{fmt(bill.amount)}</p>
                    <p
                      className={`text-[10px] mt-0.5 ${
                        bill.type === "overdue"
                          ? "text-red-600 font-medium"
                          : isPast
                          ? "text-muted-foreground/50 line-through"
                          : "text-muted-foreground"
                      }`}
                    >
                      {bill.type === "overdue" ? "Atrasado" : `Dia ${bill.dueDay}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

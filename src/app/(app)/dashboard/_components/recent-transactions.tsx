import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpIcon, ArrowDownIcon, ArrowRightLeftIcon, ArrowRightIcon, RepeatIcon, PlusIcon } from "lucide-react"

type TxType = "INCOME" | "EXPENSE" | "TRANSFER"
type TxStatus = "PENDING" | "PAID" | "CANCELLED"

interface Transaction {
  id: string
  description: string
  amount: number
  type: TxType
  status: TxStatus
  date: Date
  account: { name: string; color: string } | null
  creditCard: { name: string; color: string } | null
  category: { name: string; color: string } | null
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

function fmtDate(d: Date) {
  const now = new Date()
  const diff = now.getTime() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Hoje"
  if (days === 1) return "Ontem"
  if (days < 7) return `${days}d atrás`
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

const STATUS_STYLES: Record<TxStatus, string> = {
  PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  CANCELLED: "bg-gray-500/10 text-gray-500",
}

const STATUS_LABELS: Record<TxStatus, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  CANCELLED: "Cancelado",
}

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Transações recentes</CardTitle>
            <CardDescription className="text-xs mt-0.5">Últimas movimentações registradas</CardDescription>
          </div>
          <Link href="/transactions">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
              Ver todas
              <ArrowRightIcon className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <RepeatIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Nenhuma transação ainda</p>
            <Link href="/transactions" className="mt-3">
              <Button size="sm" variant="outline" className="text-xs h-7">
                <PlusIcon className="h-3 w-3 mr-1" />
                Registrar transação
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx) => {
              const isIncome = tx.type === "INCOME"
              const isTransfer = tx.type === "TRANSFER"
              const Icon = isIncome ? ArrowUpIcon : isTransfer ? ArrowRightLeftIcon : ArrowDownIcon
              const iconBg = isIncome
                ? "bg-emerald-500/10"
                : isTransfer
                ? "bg-blue-500/10"
                : "bg-red-500/10"
              const iconColor = isIncome
                ? "text-emerald-600"
                : isTransfer
                ? "text-blue-600"
                : "text-red-600"
              const amountColor = isIncome
                ? "text-emerald-600 dark:text-emerald-400"
                : isTransfer
                ? "text-blue-600 dark:text-blue-400"
                : "text-red-600 dark:text-red-400"
              const amountPrefix = isIncome ? "+" : isTransfer ? "" : "−"

              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                    <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-none">{tx.description}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {tx.category && (
                        <div className="flex items-center gap-1">
                          <div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: tx.category.color }}
                          />
                          <span className="text-[10px] text-muted-foreground">{tx.category.name}</span>
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground/60">
                        {tx.account?.name ?? tx.creditCard?.name ?? "—"}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-mono font-semibold ${amountColor}`}>
                      {amountPrefix}{fmt(tx.amount)}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{fmtDate(tx.date)}</span>
                      <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 h-3.5 ${STATUS_STYLES[tx.status]}`}>
                        {STATUS_LABELS[tx.status]}
                      </Badge>
                    </div>
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

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WalletIcon, StarIcon, PlusIcon, ArrowRightIcon } from "lucide-react"

const TYPE_LABELS: Record<string, string> = {
  CHECKING: "Corrente",
  SAVINGS: "Poupança",
  INVESTMENT: "Investimento",
  CASH: "Dinheiro",
  OTHER: "Outro",
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

interface AccountItem {
  id: string
  name: string
  type: string
  balance: number
  color: string
  isPrimary: boolean
}

export function AccountsOverview({ accounts }: { accounts: AccountItem[] }) {
  const total = accounts.reduce((s, a) => s + a.balance, 0)

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Contas</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Saldo total: <span className={`font-semibold ${total >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(total)}</span>
            </CardDescription>
          </div>
          <Link href="/accounts">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4">
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <WalletIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Nenhuma conta ativa</p>
            <Link href="/accounts" className="mt-3">
              <Button size="sm" variant="outline" className="text-xs h-7">
                <PlusIcon className="h-3 w-3 mr-1" />
                Adicionar conta
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: account.color + "25" }}
                  >
                    <WalletIcon className="h-3.5 w-3.5" style={{ color: account.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-sm font-medium leading-none truncate">
                      <span className="truncate">{account.name}</span>
                      {account.isPrimary && (
                        <StarIcon className="h-2.5 w-2.5 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {TYPE_LABELS[account.type] ?? account.type}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-mono font-semibold shrink-0 ml-2 ${
                    account.balance < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
                  }`}
                >
                  {fmt(account.balance)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  createAccount,
  updateAccount,
  deleteAccount,
  toggleAccountActive,
  setPrimaryAccount,
  type AccountInput,
} from "@/actions/accounts"
import type { Account, AccountType } from '@/lib/db-types'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import {
  CheckCircle2Icon,
  Edit2Icon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
  WalletIcon,
} from "lucide-react"

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "CHECKING", label: "Conta Corrente" },
  { value: "SAVINGS", label: "Poupança" },
  { value: "INVESTMENT", label: "Investimento" },
  { value: "CASH", label: "Dinheiro Físico" },
  { value: "OTHER", label: "Outro" },
]

const TYPE_COLORS: Record<AccountType, string> = {
  CHECKING: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  SAVINGS: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  INVESTMENT: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  CASH: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  OTHER: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
}

function formatCurrency(value: number | { toNumber?: () => number } | unknown) {
  const num = typeof value === "number" ? value : (value as { toNumber?: () => number }).toNumber?.() ?? 0
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num)
}

interface AccountFormProps {
  account?: Account | null
  onSuccess: () => void
  onCancel: () => void
}

function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(account?.name ?? "")
  const [type, setType] = useState<AccountType>(account?.type ?? "CHECKING")
  const [bank, setBank] = useState(account?.bank ?? "")
  const [agency, setAgency] = useState(account?.agency ?? "")
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? "")
  const [initialBalance, setInitialBalance] = useState(
    account ? "" : "0"
  )
  const [color, setColor] = useState(account?.color ?? "#3b82f6")
  const [error, setError] = useState("")

  const colors = [
    "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
    "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
  ]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Nome é obrigatório")

    const input: AccountInput = {
      name: name.trim(),
      type,
      bank: bank || undefined,
      agency: agency || undefined,
      accountNumber: accountNumber || undefined,
      initialBalance: account ? undefined : parseFloat(initialBalance || "0"),
      color,
    }

    setError("")
    startTransition(async () => {
      try {
        if (account) {
          await updateAccount(account.id, input)
          toast.success("Conta atualizada!")
        } else {
          await createAccount(input)
          toast.success("Conta criada!")
        }
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro inesperado")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>Nome *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nubank, Bradesco..." />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo *</Label>
          <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Banco</Label>
          <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Nome do banco" />
        </div>
        <div className="space-y-1.5">
          <Label>Agência</Label>
          <Input value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="0000" />
        </div>
        <div className="space-y-1.5">
          <Label>Número da conta</Label>
          <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="00000-0" />
        </div>
        {!account && (
          <div className="col-span-2 space-y-1.5">
            <Label>Saldo inicial (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0,00"
            />
          </div>
        )}
        <div className="col-span-2 space-y-1.5">
          <Label>Cor</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className="h-7 w-7 rounded-full ring-2 ring-offset-2 transition-all"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `2px solid ${c}` : "none",
                  outlineOffset: "2px",
                }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          {account ? "Salvar" : "Criar conta"}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface AccountsTableProps {
  accounts: Account[]
}

export function AccountsTable({ accounts }: AccountsTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState("")

  const filtered = accounts.filter((a) =>
    a.name.toLowerCase().includes(filter.toLowerCase()) ||
    (a.bank ?? "").toLowerCase().includes(filter.toLowerCase())
  )

  function openCreate() {
    setEditingAccount(null)
    setDialogOpen(true)
  }

  function openEdit(account: Account) {
    setEditingAccount(account)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteId) return
    const result = await deleteAccount(deleteId)
    if (result?.error) toast.error(result.error)
    else toast.success("Conta removida!")
    setDeleteId(null)
  }

  async function handleToggleActive(id: string, current: boolean) {
    await toggleAccountActive(id, !current)
    toast.success(!current ? "Conta ativada" : "Conta desativada")
  }

  async function handleSetPrimary(id: string) {
    await setPrimaryAccount(id)
    toast.success("Conta principal definida!")
  }

  return (
    <>
      <div className="px-4 lg:px-6 pb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Input
            placeholder="Buscar conta..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-xs h-9"
          />
          <Button size="sm" onClick={openCreate}>
            <PlusIcon className="h-4 w-4 mr-1.5" />
            Nova conta
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border">
            <EmptyState
              icon={WalletIcon}
              title="Nenhuma conta encontrada"
              description={filter ? "Tente outro termo de busca" : "Crie sua primeira conta bancária"}
              action={
                !filter ? (
                  <Button size="sm" onClick={openCreate}>
                    <PlusIcon className="h-4 w-4 mr-1.5" />
                    Nova conta
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Conta</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Tipo</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Saldo</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Status</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((account) => (
                  <tr key={account.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: account.color + "20" }}
                        >
                          <WalletIcon className="h-4 w-4" style={{ color: account.color }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{account.name}</span>
                            {account.isPrimary && (
                              <StarIcon className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          {account.bank && (
                            <span className="text-xs text-muted-foreground">{account.bank}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant="secondary" className={TYPE_COLORS[account.type]}>
                        {ACCOUNT_TYPES.find((t) => t.value === account.type)?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      <span className={(account.balance as unknown as number) < 0 ? "text-destructive" : ""}>
                        {formatCurrency(account.balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex justify-center">
                        <Switch
                          checked={account.isActive}
                          onCheckedChange={() => handleToggleActive(account.id, account.isActive)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(account)}>
                            <Edit2Icon className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {!account.isPrimary && (
                            <DropdownMenuItem onClick={() => handleSetPrimary(account.id)}>
                              <StarIcon className="h-4 w-4" />
                              Definir como principal
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteId(account.id)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Editar conta" : "Nova conta"}</DialogTitle>
            <DialogDescription>
              {editingAccount ? "Atualize os dados da conta bancária" : "Adicione uma nova conta ao seu perfil"}
            </DialogDescription>
          </DialogHeader>
          <AccountForm
            account={editingAccount}
            onSuccess={() => setDialogOpen(false)}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir conta?"
        description="Contas com transações serão arquivadas. Contas sem transações serão permanentemente excluídas."
        onConfirm={handleDelete}
      />
    </>
  )
}

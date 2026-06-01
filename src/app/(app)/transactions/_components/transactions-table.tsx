"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createTransaction, updateTransaction, deleteTransaction, type TransactionInput } from "@/actions/transactions"
import type { TransactionType, TransactionStatus } from '@/lib/db-types'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { ArrowDownIcon, ArrowUpIcon, ArrowRightLeftIcon, Edit2Icon, Loader2Icon, MoreHorizontalIcon, PlusIcon, RepeatIcon, Trash2Icon } from "lucide-react"

type Transaction = {
  id: string; userId: string; description: string; amount: unknown; type: TransactionType; status: TransactionStatus
  date: Date; paidAt: Date | null; accountId: string | null; creditCardId: string | null; categoryId: string | null
  salaryId: string | null; isRecurring: boolean; recurrenceRule: string | null
  recurrenceGroupId: string | null; recurrenceEndDate: Date | null; parentTransactionId: string | null
  isInstallment: boolean; installmentNumber: number | null; totalInstallments: number | null
  notes: string | null; tags: string[]; attachments: string[]; createdAt: Date; updatedAt: Date
  account: { id: string; name: string; color: string } | null
  creditCard: { id: string; name: string; color: string } | null
  category: { id: string; name: string; color: string } | null
}

const TX_TYPES: { value: TransactionType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { value: "INCOME", label: "Receita", icon: ArrowUpIcon, color: "text-emerald-600" },
  { value: "EXPENSE", label: "Despesa", icon: ArrowDownIcon, color: "text-red-600" },
  { value: "TRANSFER", label: "Transferência", icon: ArrowRightLeftIcon, color: "text-blue-600" },
]

const TX_STATUS: { value: TransactionStatus; label: string; color: string }[] = [
  { value: "PENDING", label: "Pendente", color: "bg-amber-500/10 text-amber-600" },
  { value: "PAID", label: "Pago", color: "bg-emerald-500/10 text-emerald-600" },
  { value: "CANCELLED", label: "Cancelado", color: "bg-gray-500/10 text-gray-600" },
]

function toNum(v: unknown): number {
  if (typeof v === "number") return v
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function") return (v as { toNumber: () => number }).toNumber()
  return 0
}
function fmtCurrency(v: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(toNum(v))
}
function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("pt-BR")
}

interface FormProps {
  transaction?: Transaction | null
  accounts: { id: string; name: string }[]
  creditCards: { id: string; name: string }[]
  categories: { id: string; name: string; type: TransactionType }[]
  onSuccess: () => void
  onCancel: () => void
}

function TransactionForm({ transaction, accounts, creditCards, categories, onSuccess, onCancel }: FormProps) {
  const [isPending, startTransition] = useTransition()
  const [description, setDescription] = useState(transaction?.description ?? "")
  const [amount, setAmount] = useState(transaction ? toNum(transaction.amount).toString() : "")
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "EXPENSE")
  const [status, setStatus] = useState<TransactionStatus>(transaction?.status ?? "PAID")
  const [date, setDate] = useState(transaction?.date ? new Date(transaction.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [accountId, setAccountId] = useState(transaction?.accountId ?? "")
  const [creditCardId, setCreditCardId] = useState(transaction?.creditCardId ?? "")
  const [useCreditCard, setUseCreditCard] = useState(!!transaction?.creditCardId)
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "")
  const [notes, setNotes] = useState(transaction?.notes ?? "")
  const [isRecurring, setIsRecurring] = useState(transaction?.isRecurring ?? false)
  const [recurrenceMonths, setRecurrenceMonths] = useState("12")
  const [error, setError] = useState("")

  const filteredCategories = categories.filter((c) => c.type === type)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return setError("Descrição é obrigatória")
    if (!amount || parseFloat(amount) <= 0) return setError("Valor deve ser maior que zero")
    if (!date) return setError("Data é obrigatória")

    const input: TransactionInput = {
      description: description.trim(), amount: parseFloat(amount), type, status, date,
      accountId: !useCreditCard && accountId ? accountId : undefined,
      creditCardId: useCreditCard && creditCardId ? creditCardId : undefined,
      categoryId: categoryId || undefined, notes: notes || undefined,
      isRecurring, recurrenceMonths: isRecurring ? parseInt(recurrenceMonths) : undefined,
    }
    setError("")
    startTransition(async () => {
      try {
        if (transaction) { await updateTransaction(transaction.id, input); toast.success("Transação atualizada!") }
        else { await createTransaction(input); toast.success(isRecurring ? `${recurrenceMonths} transações criadas!` : "Transação criada!") }
        onSuccess()
      } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado") }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <div className="flex gap-2">
          {TX_TYPES.map((t) => (
            <button key={t.value} type="button" onClick={() => setType(t.value)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${type === t.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5"><Label>Descrição *</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Mercado, Salário..." /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Data *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as TransactionStatus)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{TX_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Forma de pagamento</Label>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Conta</span>
            <Switch checked={useCreditCard} onCheckedChange={setUseCreditCard} />
            <span>Cartão</span>
          </div>
        </div>
        {useCreditCard ? (
          <Select value={creditCardId || "none"} onValueChange={(v) => setCreditCardId(v === "none" ? "" : v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
            <SelectContent><SelectItem value="none">Nenhum</SelectItem>{creditCards.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        ) : (
          <Select value={accountId || "none"} onValueChange={(v) => setAccountId(v === "none" ? "" : v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
            <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Categoria</Label>
        <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
          <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{filteredCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Notas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
      {!transaction && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between"><Label>Recorrente mensal</Label><Switch checked={isRecurring} onCheckedChange={setIsRecurring} /></div>
          {isRecurring && (
            <div className="space-y-1.5"><Label>Número de meses</Label><Input type="number" min="2" max="60" value={recurrenceMonths} onChange={(e) => setRecurrenceMonths(e.target.value)} /></div>
          )}
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          {transaction ? "Salvar" : isRecurring ? `Criar ${recurrenceMonths}x` : "Criar transação"}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface Props {
  transactions: Transaction[]
  total: number
  page: number
  totalPages: number
  accounts: { id: string; name: string }[]
  creditCards: { id: string; name: string }[]
  categories: { id: string; name: string; type: TransactionType }[]
}

export function TransactionsTable({ transactions, total, page, totalPages, accounts, creditCards, categories }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteMode, setDeleteMode] = useState<"single" | "all" | "future">("single")
  const [filter, setFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">("ALL")

  const filtered = transactions.filter((t) =>
    t.description.toLowerCase().includes(filter.toLowerCase()) && (typeFilter === "ALL" || t.type === typeFilter)
  )

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(t: Transaction) { setEditing(t); setDialogOpen(true) }

  async function handleDelete() {
    if (!deleteId) return
    await deleteTransaction(deleteId, deleteMode); toast.success("Transação excluída!")
    setDeleteId(null)
  }

  return (
    <>
      <div className="px-4 lg:px-6 pb-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Input placeholder="Buscar..." value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48 h-9" />
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionType | "ALL")}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {TX_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{total} transações</span>
            <Button size="sm" onClick={openCreate}><PlusIcon className="h-4 w-4 mr-1.5" />Nova transação</Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border">
            <EmptyState icon={RepeatIcon} title="Nenhuma transação" description={filter ? "Tente outro termo" : "Registre movimentações financeiras"} action={!filter ? <Button size="sm" onClick={openCreate}><PlusIcon className="h-4 w-4 mr-1.5" />Nova transação</Button> : undefined} />
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Transação</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Data</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Valor</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Status</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Conta/Cartão</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((tx) => {
                  const typeInfo = TX_TYPES.find((t) => t.value === tx.type)
                  const statusInfo = TX_STATUS.find((s) => s.value === tx.status)
                  const Icon = typeInfo?.icon ?? ArrowRightLeftIcon
                  return (
                    <tr key={tx.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${tx.type === "INCOME" ? "bg-emerald-500/10" : tx.type === "EXPENSE" ? "bg-red-500/10" : "bg-blue-500/10"}`}>
                            <Icon className={`h-3.5 w-3.5 ${typeInfo?.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{tx.description}</span>
                              {tx.isRecurring && <RepeatIcon className="h-3 w-3 text-muted-foreground" />}
                            </div>
                            {tx.category && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tx.category.color }} />
                                <span className="text-xs text-muted-foreground">{tx.category.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">{fmtDate(tx.date)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${typeInfo?.color}`}>
                        {tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "−" : ""}{fmtCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="secondary" className={statusInfo?.color}>{statusInfo?.label}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {tx.account?.name ?? tx.creditCard?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontalIcon className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(tx)}><Edit2Icon className="h-4 w-4" />Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {tx.isRecurring ? (
                              <>
                                <DropdownMenuItem variant="destructive" onClick={() => { setDeleteId(tx.id); setDeleteMode("single") }}><Trash2Icon className="h-4 w-4" />Excluir só esta</DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => { setDeleteId(tx.id); setDeleteMode("future") }}><Trash2Icon className="h-4 w-4" />Esta e próximas</DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => { setDeleteId(tx.id); setDeleteMode("all") }}><Trash2Icon className="h-4 w-4" />Todas do grupo</DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem variant="destructive" onClick={() => { setDeleteId(tx.id); setDeleteMode("single") }}><Trash2Icon className="h-4 w-4" />Excluir</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">Página {page} de {totalPages}</span>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar transação" : "Nova transação"}</DialogTitle>
            <DialogDescription>Registre movimentações financeiras</DialogDescription>
          </DialogHeader>
          <TransactionForm transaction={editing} accounts={accounts} creditCards={creditCards} categories={categories} onSuccess={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={deleteMode === "all" ? "Excluir todas do grupo?" : deleteMode === "future" ? "Excluir esta e próximas?" : "Excluir transação?"}
        description="Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
      />
    </>
  )
}

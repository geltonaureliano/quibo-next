"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type TransactionInput,
} from "@/actions/transactions"
import type { TransactionType, TransactionStatus } from "@/lib/db-types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CreditCardIcon,
  Edit2Icon,
  HomeIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  RepeatIcon,
  ShieldAlertIcon,
  Trash2Icon,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type TransactionRow = {
  id: string
  description: string
  amount: number
  type: TransactionType
  status: TransactionStatus
  date: string
  isRecurring: boolean
  recurrenceGroupId: string | null
  accountId: string | null
  creditCardId: string | null
  categoryId: string | null
  notes: string | null
  isInstallment: boolean
  installmentNumber: number | null
  totalInstallments: number | null
  account: { id: string; name: string; color: string } | null
  creditCard: { id: string; name: string; color: string } | null
  category: { id: string; name: string; color: string } | null
}

type LivingCostRow = {
  id: string
  name: string
  amount: number
  dayOfMonth: number
  sourceType: string
  account: { id: string; name: string } | null
  creditCard: { id: string; name: string } | null
  category: { id: string; name: string; color: string } | null
}

type DebtInstallmentRow = {
  id: string
  debtName: string
  debtType: string
  number: number
  amount: number
  dueDate: string
  status: string
}

type InvoiceRow = {
  id: string
  creditCardName: string
  creditCardColor: string
  month: number
  year: number
  totalAmount: number
  paidAmount: number
  status: string
  dueDate: string
}

interface Props {
  expenseTransactions: TransactionRow[]
  incomeTransactions: TransactionRow[]
  livingCosts: LivingCostRow[]
  debtInstallments: DebtInstallmentRow[]
  invoices: InvoiceRow[]
  accounts: { id: string; name: string }[]
  creditCards: { id: string; name: string }[]
  categories: { id: string; name: string; type: TransactionType }[]
  monthLabel: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("pt-BR")
}

const TX_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Pendente",  color: "bg-amber-500/10 text-amber-600" },
  PAID:      { label: "Pago",      color: "bg-emerald-500/10 text-emerald-600" },
  CANCELLED: { label: "Cancelado", color: "bg-gray-500/10 text-gray-500" },
}

const DEBT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "bg-amber-500/10 text-amber-600" },
  PAID:    { label: "Pago",     color: "bg-emerald-500/10 text-emerald-600" },
  OVERDUE: { label: "Atrasado", color: "bg-red-500/10 text-red-600" },
}

const INVOICE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "bg-amber-500/10 text-amber-600" },
  PAID:    { label: "Paga",     color: "bg-emerald-500/10 text-emerald-600" },
  OVERDUE: { label: "Atrasada", color: "bg-red-500/10 text-red-600" },
  PARTIAL: { label: "Parcial",  color: "bg-blue-500/10 text-blue-600" },
}

const MONTHS_PT = [
  "", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]

// ─── Transaction Form ─────────────────────────────────────────────────────────

interface FormProps {
  transaction?: TransactionRow | null
  defaultType: TransactionType
  accounts: { id: string; name: string }[]
  creditCards: { id: string; name: string }[]
  categories: { id: string; name: string; type: TransactionType }[]
  onSuccess: () => void
  onCancel: () => void
}

function TransactionForm({
  transaction,
  defaultType,
  accounts,
  creditCards,
  categories,
  onSuccess,
  onCancel,
}: FormProps) {
  const [isPending, startTransition] = useTransition()
  const [description, setDescription] = useState(transaction?.description ?? "")
  const [amount, setAmount] = useState(transaction ? transaction.amount.toString() : "")
  const [type, setType] = useState<TransactionType>(transaction?.type ?? defaultType)
  const [status, setStatus] = useState<TransactionStatus>(transaction?.status ?? "PAID")
  const [date, setDate] = useState(
    transaction?.date
      ? new Date(transaction.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  )
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
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      status,
      date,
      accountId: !useCreditCard && accountId ? accountId : undefined,
      creditCardId: useCreditCard && creditCardId ? creditCardId : undefined,
      categoryId: categoryId || undefined,
      notes: notes || undefined,
      isRecurring,
      recurrenceMonths: isRecurring ? parseInt(recurrenceMonths) : undefined,
    }
    setError("")
    startTransition(async () => {
      try {
        if (transaction) {
          await updateTransaction(transaction.id, input)
          toast.success("Transação atualizada!")
        } else {
          await createTransaction(input)
          toast.success(isRecurring ? `${recurrenceMonths} transações criadas!` : "Transação criada!")
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
      <div className="space-y-1.5">
        <Label>Descrição *</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Mercado, Salário..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Valor (R$) *</Label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as TransactionStatus)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PAID">Pago</SelectItem>
            <SelectItem value="PENDING">Pendente</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {type === "EXPENSE" && (
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
            <Select
              value={creditCardId || "none"}
              onValueChange={(v) => setCreditCardId(v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o cartão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {creditCards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select
              value={accountId || "none"}
              onValueChange={(v) => setAccountId(v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
      {type === "INCOME" && (
        <div className="space-y-1.5">
          <Label>Conta</Label>
          <Select
            value={accountId || "none"}
            onValueChange={(v) => setAccountId(v === "none" ? "" : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Categoria</Label>
        <Select
          value={categoryId || "none"}
          onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Nenhuma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {filteredCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Notas</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
      {!transaction && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <Label>Recorrente mensal</Label>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
          {isRecurring && (
            <div className="space-y-1.5">
              <Label>Número de meses</Label>
              <Input
                type="number"
                min="2"
                max="60"
                value={recurrenceMonths}
                onChange={(e) => setRecurrenceMonths(e.target.value)}
              />
            </div>
          )}
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          {transaction ? "Salvar" : isRecurring ? `Criar ${recurrenceMonths}x` : "Criar"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ─── Transaction Table (shared by expense + income tabs) ──────────────────────

interface TxTableProps {
  rows: TransactionRow[]
  emptyTitle: string
  emptyDescription: string
  onEdit: (t: TransactionRow) => void
  onDelete: (id: string, mode: "single" | "all" | "future") => void
  onNew: () => void
  newLabel: string
  amountColor: (type: TransactionType) => string
  amountPrefix: (type: TransactionType) => string
}

function TxTable({
  rows,
  emptyTitle,
  emptyDescription,
  onEdit,
  onDelete,
  onNew,
  newLabel,
  amountColor,
  amountPrefix,
}: TxTableProps) {
  const [filter, setFilter] = useState("")
  const filtered = rows.filter((t) =>
    t.description.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Buscar..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-8 w-52 text-sm"
        />
        <Button size="sm" onClick={onNew} className="h-8">
          <PlusIcon className="h-3.5 w-3.5 mr-1" />
          {newLabel}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border">
          <EmptyState
            icon={RepeatIcon}
            title={emptyTitle}
            description={emptyDescription}
            action={
              !filter ? (
                <Button size="sm" onClick={onNew}>
                  <PlusIcon className="h-4 w-4 mr-1.5" />
                  {newLabel}
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
                <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs">Descrição</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs hidden sm:table-cell">Data</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-2.5 text-xs">Valor</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs hidden md:table-cell">Status</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs hidden lg:table-cell">Conta / Cartão</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((tx) => {
                const statusInfo = TX_STATUS_MAP[tx.status]
                return (
                  <tr key={tx.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{tx.description}</span>
                            {tx.isRecurring && (
                              <RepeatIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                            {tx.isInstallment && tx.installmentNumber && (
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {tx.installmentNumber}/{tx.totalInstallments}
                              </span>
                            )}
                          </div>
                          {tx.category && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <div
                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: tx.category.color }}
                              />
                              <span className="text-[10px] text-muted-foreground">{tx.category.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                      {fmtDate(tx.date)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold text-sm ${amountColor(tx.type)}`}>
                      {amountPrefix(tx.type)}{fmtCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="secondary" className={`text-[10px] ${statusInfo?.color}`}>
                        {statusInfo?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {tx.account?.name ?? tx.creditCard?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontalIcon className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(tx)}>
                            <Edit2Icon className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {tx.isRecurring ? (
                            <>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => onDelete(tx.id, "single")}
                              >
                                <Trash2Icon className="h-4 w-4" />
                                Excluir só esta
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => onDelete(tx.id, "future")}
                              >
                                <Trash2Icon className="h-4 w-4" />
                                Esta e próximas
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => onDelete(tx.id, "all")}
                              >
                                <Trash2Icon className="h-4 w-4" />
                                Todas do grupo
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => onDelete(tx.id, "single")}
                            >
                              <Trash2Icon className="h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
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
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EntitiesTabs({
  expenseTransactions,
  incomeTransactions,
  livingCosts,
  debtInstallments,
  invoices,
  accounts,
  creditCards,
  categories,
  monthLabel,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionRow | null>(null)
  const [dialogType, setDialogType] = useState<TransactionType>("EXPENSE")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteMode, setDeleteMode] = useState<"single" | "all" | "future">("single")

  function openCreate(type: TransactionType) {
    setEditing(null)
    setDialogType(type)
    setDialogOpen(true)
  }

  function openEdit(t: TransactionRow) {
    setEditing(t)
    setDialogType(t.type)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteId) return
    await deleteTransaction(deleteId, deleteMode)
    toast.success("Transação excluída!")
    setDeleteId(null)
  }

  return (
    <>
      <Tabs defaultValue="expenses" className="w-full">
        <div className="flex items-center justify-between gap-4 mb-3">
          <TabsList className="h-9">
            <TabsTrigger value="expenses" className="text-xs gap-1.5">
              <ArrowDownIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Transações</span>
              <span className="sm:hidden">Desp.</span>
              {expenseTransactions.length > 0 && (
                <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                  {expenseTransactions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="income" className="text-xs gap-1.5">
              <ArrowUpIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Receitas</span>
              <span className="sm:hidden">Rec.</span>
              {incomeTransactions.length > 0 && (
                <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                  {incomeTransactions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="living" className="text-xs gap-1.5">
              <HomeIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Custo de Vida</span>
              <span className="sm:hidden">C.Vida</span>
              {livingCosts.length > 0 && (
                <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                  {livingCosts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="debts" className="text-xs gap-1.5">
              <ShieldAlertIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dívidas</span>
              <span className="sm:hidden">Dív.</span>
              {debtInstallments.length > 0 && (
                <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                  {debtInstallments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs gap-1.5">
              <CreditCardIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Faturas</span>
              <span className="sm:hidden">Fat.</span>
              {invoices.length > 0 && (
                <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                  {invoices.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <p className="text-xs text-muted-foreground hidden sm:block capitalize">{monthLabel}</p>
        </div>

        {/* ── Tab: Transações avulsas (EXPENSE) ──────────────────────── */}
        <TabsContent value="expenses">
          <TxTable
            rows={expenseTransactions}
            emptyTitle="Nenhuma despesa"
            emptyDescription="Registre despesas avulsas do mês"
            onEdit={openEdit}
            onDelete={(id, mode) => { setDeleteId(id); setDeleteMode(mode) }}
            onNew={() => openCreate("EXPENSE")}
            newLabel="Nova despesa"
            amountColor={() => "text-red-600"}
            amountPrefix={() => "−"}
          />
        </TabsContent>

        {/* ── Tab: Receitas ──────────────────────────────────────────── */}
        <TabsContent value="income">
          <TxTable
            rows={incomeTransactions}
            emptyTitle="Nenhuma receita"
            emptyDescription="Registre receitas recebidas no mês"
            onEdit={openEdit}
            onDelete={(id, mode) => { setDeleteId(id); setDeleteMode(mode) }}
            onNew={() => openCreate("INCOME")}
            newLabel="Nova receita"
            amountColor={() => "text-emerald-600"}
            amountPrefix={() => "+"}
          />
        </TabsContent>

        {/* ── Tab: Custo de Vida ────────────────────────────────────── */}
        <TabsContent value="living">
          {livingCosts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border">
              <EmptyState
                icon={HomeIcon}
                title="Nenhum custo de vida"
                description="Cadastre custos fixos em Custo de Vida"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs">Nome</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs hidden md:table-cell">Categoria</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs hidden sm:table-cell">Pagamento</th>
                    <th className="text-center font-medium text-muted-foreground px-4 py-2.5 text-xs hidden lg:table-cell">Dia Venc.</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-2.5 text-xs">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {livingCosts.map((lc) => (
                    <tr key={lc.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{lc.name}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {lc.category ? (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: lc.category.color }}
                            />
                            <span className="text-xs text-muted-foreground">{lc.category.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                        {lc.sourceType === "CREDIT_CARD"
                          ? lc.creditCard?.name ?? "Cartão"
                          : lc.account?.name ?? "Conta"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-center text-xs text-muted-foreground">
                        Dia {lc.dayOfMonth}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-sm text-red-600">
                        −{fmtCurrency(lc.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/60 bg-muted/20">
                    <td colSpan={4} className="px-4 py-2 text-xs font-medium text-muted-foreground">
                      Total custo de vida
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-sm text-red-600">
                      −{fmtCurrency(livingCosts.reduce((s, lc) => s + lc.amount, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Dívidas ──────────────────────────────────────────── */}
        <TabsContent value="debts">
          {debtInstallments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border">
              <EmptyState
                icon={ShieldAlertIcon}
                title="Nenhuma parcela este mês"
                description="Parcelas de dívidas com vencimento neste mês aparecerão aqui"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs">Dívida</th>
                    <th className="text-center font-medium text-muted-foreground px-4 py-2.5 text-xs hidden sm:table-cell">Parcela</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs hidden md:table-cell">Vencimento</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs hidden lg:table-cell">Status</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-2.5 text-xs">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {debtInstallments.map((di) => {
                    const statusInfo = DEBT_STATUS_MAP[di.status]
                    return (
                      <tr key={di.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-medium">{di.debtName}</span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {di.debtType === "INSTALLMENT" ? "Parcelado" :
                               di.debtType === "LOAN" ? "Empréstimo" :
                               di.debtType === "PENDING" ? "Pendente" : "Flexível"}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-center text-xs text-muted-foreground">
                          #{di.number}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                          {fmtDate(di.dueDate)}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <Badge variant="secondary" className={`text-[10px] ${statusInfo?.color}`}>
                            {statusInfo?.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-sm text-red-600">
                          −{fmtCurrency(di.amount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/60 bg-muted/20">
                    <td colSpan={4} className="px-4 py-2 text-xs font-medium text-muted-foreground">
                      Total parcelas
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-sm text-red-600">
                      −{fmtCurrency(debtInstallments.reduce((s, di) => s + di.amount, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Faturas de Cartão ────────────────────────────────── */}
        <TabsContent value="invoices">
          {invoices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border">
              <EmptyState
                icon={CreditCardIcon}
                title="Nenhuma fatura este mês"
                description="Faturas de cartão de crédito do mês atual aparecerão aqui"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs">Cartão</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs hidden sm:table-cell">Referência</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs hidden md:table-cell">Vencimento</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-2.5 text-xs hidden lg:table-cell">Pago</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 text-xs hidden lg:table-cell">Status</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-2.5 text-xs">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {invoices.map((inv) => {
                    const statusInfo = INVOICE_STATUS_MAP[inv.status]
                    return (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 rounded-md shrink-0 flex items-center justify-center"
                              style={{ backgroundColor: `${inv.creditCardColor}22` }}
                            >
                              <CreditCardIcon
                                className="h-3.5 w-3.5"
                                style={{ color: inv.creditCardColor }}
                              />
                            </div>
                            <span className="font-medium">{inv.creditCardName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                          {MONTHS_PT[inv.month]}/{inv.year}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                          {fmtDate(inv.dueDate)}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-right font-mono text-xs text-emerald-600">
                          {fmtCurrency(inv.paidAmount)}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <Badge variant="secondary" className={`text-[10px] ${statusInfo?.color}`}>
                            {statusInfo?.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-sm text-red-600">
                          −{fmtCurrency(inv.totalAmount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/60 bg-muted/20">
                    <td colSpan={5} className="px-4 py-2 text-xs font-medium text-muted-foreground">
                      Total faturas
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-sm text-red-600">
                      −{fmtCurrency(invoices.reduce((s, inv) => s + inv.totalAmount, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog: create / edit transaction ────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Editar transação"
                : dialogType === "INCOME"
                ? "Nova receita"
                : "Nova despesa"}
            </DialogTitle>
            <DialogDescription>
              {dialogType === "INCOME"
                ? "Registre uma receita recebida"
                : "Registre uma despesa avulsa"}
            </DialogDescription>
          </DialogHeader>
          <TransactionForm
            transaction={editing}
            defaultType={dialogType}
            accounts={accounts}
            creditCards={creditCards}
            categories={categories}
            onSuccess={() => setDialogOpen(false)}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Confirm delete ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={
          deleteMode === "all"
            ? "Excluir todas do grupo?"
            : deleteMode === "future"
            ? "Excluir esta e próximas?"
            : "Excluir transação?"
        }
        description="Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
      />
    </>
  )
}

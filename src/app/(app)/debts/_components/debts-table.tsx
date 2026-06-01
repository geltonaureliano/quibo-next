"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createDebt, updateDebt, deleteDebt, payDebtInstallment, type DebtInput } from "@/actions/debts"
import type { DebtType, DebtStatus, DebtInstallmentStatus } from '@/lib/db-types'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { CheckIcon, ChevronDownIcon, Edit2Icon, Loader2Icon, MoreHorizontalIcon, PlusIcon, ShieldAlertIcon, Trash2Icon } from "lucide-react"

type Installment = { id: string; debtId: string; number: number; amount: unknown; dueDate: Date; paidDate: Date | null; status: DebtInstallmentStatus; createdAt: Date; updatedAt: Date }
type Debt = {
  id: string; userId: string; name: string; description: string | null; type: DebtType; totalAmount: unknown
  installmentValue: unknown; paidAmount: unknown; accountId: string; categoryId: string | null; personaId: string | null
  startDate: Date; dueDate: Date | null; totalInstallments: number | null; remainingInstallments: number | null
  installmentDay: number | null; status: DebtStatus; interestRate: unknown; createdAt: Date; updatedAt: Date
  account: { id: string; name: string } | null
  category: { id: string; name: string; color: string } | null
  persona: { id: string; name: string; color: string } | null
  installments: Installment[]
}

const DEBT_TYPES: { value: DebtType; label: string }[] = [
  { value: "INSTALLMENT", label: "Parcelada" },
  { value: "LOAN", label: "Empréstimo" },
  { value: "PENDING", label: "Pendente" },
  { value: "FLEXIBLE", label: "Flexível" },
]

const STATUS_STYLES: Record<DebtStatus, string> = {
  ACTIVE: "bg-blue-500/10 text-blue-600",
  PAID_OFF: "bg-emerald-500/10 text-emerald-600",
  OVERDUE: "bg-red-500/10 text-red-600",
}

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
  debt?: Debt | null
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  personas: { id: string; name: string }[]
  onSuccess: () => void
  onCancel: () => void
}

function DebtForm({ debt, accounts, categories, personas, onSuccess, onCancel }: FormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(debt?.name ?? "")
  const [description, setDescription] = useState(debt?.description ?? "")
  const [type, setType] = useState<DebtType>(debt?.type ?? "INSTALLMENT")
  const [totalAmount, setTotalAmount] = useState(debt ? toNum(debt.totalAmount).toString() : "")
  const [installmentValue, setInstallmentValue] = useState(debt?.installmentValue ? toNum(debt.installmentValue).toString() : "")
  const [accountId, setAccountId] = useState(debt?.accountId ?? "")
  const [categoryId, setCategoryId] = useState(debt?.categoryId ?? "")
  const [personaId, setPersonaId] = useState(debt?.personaId ?? "")
  const [startDate, setStartDate] = useState(debt?.startDate ? new Date(debt.startDate).toISOString().slice(0, 10) : "")
  const [dueDate, setDueDate] = useState(debt?.dueDate ? new Date(debt.dueDate).toISOString().slice(0, 10) : "")
  const [totalInstallments, setTotalInstallments] = useState(debt?.totalInstallments?.toString() ?? "")
  const [installmentDay, setInstallmentDay] = useState(debt?.installmentDay?.toString() ?? "")
  const [interestRate, setInterestRate] = useState(debt?.interestRate ? toNum(debt.interestRate).toString() : "")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Nome é obrigatório")
    if (!accountId) return setError("Conta é obrigatória")
    if (!startDate) return setError("Data de início é obrigatória")
    if (!totalAmount || parseFloat(totalAmount) <= 0) return setError("Valor total deve ser maior que zero")
    if (type === "INSTALLMENT" && !installmentValue) return setError("Valor da parcela é obrigatório")
    if (type === "INSTALLMENT" && !totalInstallments) return setError("Número de parcelas é obrigatório")

    const input: DebtInput = {
      name: name.trim(), description: description || undefined, type, totalAmount: parseFloat(totalAmount),
      installmentValue: installmentValue ? parseFloat(installmentValue) : undefined,
      accountId, categoryId: categoryId || undefined, personaId: personaId || undefined,
      startDate, dueDate: dueDate || undefined,
      totalInstallments: totalInstallments ? parseInt(totalInstallments) : undefined,
      installmentDay: installmentDay ? parseInt(installmentDay) : undefined,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
    }
    setError("")
    startTransition(async () => {
      try {
        if (debt) { await updateDebt(debt.id, input); toast.success("Dívida atualizada!") }
        else { await createDebt(input); toast.success("Dívida criada!") }
        onSuccess()
      } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado") }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
      <div className="space-y-1.5"><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Carro, Empréstimo..." /></div>
      <div className="space-y-1.5"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tipo *</Label>
          <Select value={type} onValueChange={(v) => setType(v as DebtType)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{DEBT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Valor total (R$) *</Label><Input type="number" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} /></div>
      </div>
      {type === "INSTALLMENT" && (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Valor parcela *</Label><Input type="number" step="0.01" value={installmentValue} onChange={(e) => setInstallmentValue(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Nº parcelas *</Label><Input type="number" value={totalInstallments} onChange={(e) => setTotalInstallments(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Dia vencimento</Label><Input type="number" min="1" max="31" value={installmentDay} onChange={(e) => setInstallmentDay(e.target.value)} /></div>
        </div>
      )}
      {(type === "LOAN" || type === "PENDING") && (
        <div className="space-y-1.5"><Label>Data de vencimento</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Data início *</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Juros % /mês</Label><Input type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="0" /></div>
        <div className="space-y-1.5">
          <Label>Conta *</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
            <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          {debt ? "Salvar" : "Criar dívida"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function InstallmentsDialog({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()

  async function handleToggle(installmentId: string, currentStatus: DebtInstallmentStatus) {
    const paid = currentStatus !== "PAID"
    startTransition(async () => {
      await payDebtInstallment(debt.id, installmentId, paid)
      toast.success(paid ? "Parcela paga!" : "Parcela revertida")
    })
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Parcelas — {debt.name}</DialogTitle>
          <DialogDescription>
            Pago: {fmtCurrency(debt.paidAmount)} / {fmtCurrency(debt.totalAmount)} ({Math.round(toNum(debt.paidAmount) / toNum(debt.totalAmount) * 100)}%)
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
          {debt.installments.map((inst) => (
            <div key={inst.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${inst.status === "PAID" ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-muted/30 border border-border/40"}`}>
              <div>
                <span className="text-sm font-medium">Parcela {inst.number}</span>
                <div className="text-xs text-muted-foreground">{fmtDate(inst.dueDate)}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{fmtCurrency(inst.amount)}</span>
                <Button variant={inst.status === "PAID" ? "secondary" : "outline"} size="icon" className="h-7 w-7" disabled={isPending} onClick={() => handleToggle(inst.id, inst.status)}>
                  <CheckIcon className={`h-3.5 w-3.5 ${inst.status === "PAID" ? "text-emerald-600" : "text-muted-foreground"}`} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface Props {
  debts: Debt[]
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  personas: { id: string; name: string }[]
}

export function DebtsTable({ debts, accounts, categories, personas }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [installmentsDebt, setInstallmentsDebt] = useState<Debt | null>(null)
  const [filter, setFilter] = useState("")

  const filtered = debts.filter((d) => d.name.toLowerCase().includes(filter.toLowerCase()))

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(d: Debt) { setEditing(d); setDialogOpen(true) }

  async function handleDelete() {
    if (!deleteId) return
    await deleteDebt(deleteId); toast.success("Dívida excluída!")
    setDeleteId(null)
  }

  return (
    <>
      <div className="px-4 lg:px-6 pb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Input placeholder="Buscar dívida..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs h-9" />
          <Button size="sm" onClick={openCreate}><PlusIcon className="h-4 w-4 mr-1.5" />Nova dívida</Button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border">
            <EmptyState icon={ShieldAlertIcon} title="Nenhuma dívida" description="Registre financiamentos, empréstimos e obrigações financeiras" action={!filter ? <Button size="sm" onClick={openCreate}><PlusIcon className="h-4 w-4 mr-1.5" />Nova dívida</Button> : undefined} />
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Dívida</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Tipo</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Total</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Pago</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Status</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((debt) => {
                  const pct = Math.min(100, Math.round(toNum(debt.paidAmount) / toNum(debt.totalAmount) * 100))
                  return (
                    <tr key={debt.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="font-medium">{debt.name}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-24">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge variant="secondary">{DEBT_TYPES.find((t) => t.value === debt.type)?.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{fmtCurrency(debt.totalAmount)}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-right font-mono text-emerald-600">{fmtCurrency(debt.paidAmount)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Badge variant="secondary" className={STATUS_STYLES[debt.status]}>
                          {debt.status === "ACTIVE" ? "Ativa" : debt.status === "PAID_OFF" ? "Quitada" : "Em atraso"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontalIcon className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {debt.type === "INSTALLMENT" && (
                              <DropdownMenuItem onClick={() => setInstallmentsDebt(debt)}>
                                <ChevronDownIcon className="h-4 w-4" />Ver parcelas
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEdit(debt)}><Edit2Icon className="h-4 w-4" />Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(debt.id)}><Trash2Icon className="h-4 w-4" />Excluir</DropdownMenuItem>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar dívida" : "Nova dívida"}</DialogTitle>
            <DialogDescription>Registre financiamentos e obrigações financeiras</DialogDescription>
          </DialogHeader>
          <DebtForm debt={editing} accounts={accounts} categories={categories} personas={personas} onSuccess={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {installmentsDebt && <InstallmentsDialog debt={installmentsDebt} onClose={() => setInstallmentsDebt(null)} />}

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title="Excluir dívida?" description="Todas as parcelas serão excluídas em cascata." onConfirm={handleDelete} />
    </>
  )
}

"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createCreditCard, updateCreditCard, deleteCreditCard, toggleCreditCardActive, createInvoice, payInvoice, deleteInvoice, type CreditCardInput, type InvoiceInput } from "@/actions/credit-cards"
import type { CardBrand, InvoiceStatus } from '@/lib/db-types'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { CheckIcon, CreditCardIcon, Edit2Icon, ListIcon, Loader2Icon, MoreHorizontalIcon, PlusIcon, Trash2Icon } from "lucide-react"

type Invoice = { id: string; creditCardId: string; userId: string; month: number; year: number; totalAmount: unknown; paidAmount: unknown; status: InvoiceStatus; dueDate: Date; paidAt: Date | null; createdAt: Date; updatedAt: Date }
type CreditCard = {
  id: string; userId: string; name: string; brand: CardBrand; limit: unknown; closingDay: number; dueDay: number; color: string; isActive: boolean; personaId: string | null; createdAt: Date; updatedAt: Date
  persona: { id: string; name: string; color: string } | null
  invoices: Invoice[]
  _count: { transactions: number }
}

const BRANDS: { value: CardBrand; label: string }[] = [
  { value: "VISA", label: "Visa" }, { value: "MASTERCARD", label: "Mastercard" }, { value: "ELO", label: "Elo" },
  { value: "AMEX", label: "Amex" }, { value: "HIPERCARD", label: "Hipercard" }, { value: "DINERS", label: "Diners" }, { value: "OTHER", label: "Outro" },
]

const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  PENDING: "bg-amber-500/10 text-amber-600",
  PAID: "bg-emerald-500/10 text-emerald-600",
  OVERDUE: "bg-red-500/10 text-red-600",
  PARTIAL: "bg-blue-500/10 text-blue-600",
}

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

function toNum(v: unknown): number {
  if (typeof v === "number") return v
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function") return (v as { toNumber: () => number }).toNumber()
  return 0
}
function fmtCurrency(v: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(toNum(v))
}

const COLORS = ["#6366f1","#3b82f6","#10b981","#8b5cf6","#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16","#f97316"]

interface CardFormProps { card?: CreditCard | null; personas: { id: string; name: string }[]; onSuccess: () => void; onCancel: () => void }
function CardForm({ card, personas, onSuccess, onCancel }: CardFormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(card?.name ?? ""); const [brand, setBrand] = useState<CardBrand>(card?.brand ?? "VISA")
  const [limit, setLimit] = useState(card ? toNum(card.limit).toString() : ""); const [closingDay, setClosingDay] = useState(card?.closingDay?.toString() ?? "")
  const [dueDay, setDueDay] = useState(card?.dueDay?.toString() ?? ""); const [color, setColor] = useState(card?.color ?? "#6366f1")
  const [personaId, setPersonaId] = useState(card?.personaId ?? ""); const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Nome é obrigatório")
    if (!limit || parseFloat(limit) <= 0) return setError("Limite deve ser maior que zero")
    if (!closingDay || !dueDay) return setError("Dias de fechamento e vencimento são obrigatórios")
    const input: CreditCardInput = { name: name.trim(), brand, limit: parseFloat(limit), closingDay: parseInt(closingDay), dueDay: parseInt(dueDay), color, personaId: personaId || undefined }
    setError("")
    startTransition(async () => {
      try {
        if (card) { await updateCreditCard(card.id, input); toast.success("Cartão atualizado!") }
        else { await createCreditCard(input); toast.success("Cartão criado!") }
        onSuccess()
      } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado") }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5"><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nubank, Itaú Gold..." /></div>
        <div className="space-y-1.5"><Label>Bandeira *</Label>
          <Select value={brand} onValueChange={(v) => setBrand(v as CardBrand)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{BRANDS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Limite (R$) *</Label><Input type="number" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Fechamento (dia) *</Label><Input type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Vencimento (dia) *</Label><Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></div>
        {personas.length > 0 && (
          <div className="col-span-2 space-y-1.5">
            <Label>Persona</Label>
            <Select value={personaId || "none"} onValueChange={(v) => setPersonaId(v === "none" ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{personas.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="col-span-2 space-y-2"><Label>Cor</Label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => <button key={c} type="button" className="h-7 w-7 rounded-full" style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }} onClick={() => setColor(c)} />)}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          {card ? "Salvar" : "Criar cartão"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function InvoicesDialog({ card, onClose }: { card: CreditCard; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString())
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [totalAmount, setTotalAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [error, setError] = useState("")

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!totalAmount || !dueDate) return setError("Valor e data são obrigatórios")
    const input: InvoiceInput = { month: parseInt(month), year: parseInt(year), totalAmount: parseFloat(totalAmount), dueDate }
    setError("")
    startTransition(async () => {
      const result = await createInvoice(card.id, input)
      if (result?.error) setError(result.error)
      else { toast.success("Fatura criada!"); setTotalAmount(""); setDueDate("") }
    })
  }

  async function handlePay(invoiceId: string) {
    await payInvoice(invoiceId); toast.success("Fatura marcada como paga!")
  }

  async function handleDelete(invoiceId: string) {
    await deleteInvoice(invoiceId); toast.success("Fatura excluída!")
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Faturas — {card.name}</DialogTitle>
          <DialogDescription>Fechamento: dia {card.closingDay} · Vencimento: dia {card.dueDay}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-3">
          {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-4 gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-full" />
            <Input type="number" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="Valor" />
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <Button type="submit" size="sm" className="w-full" disabled={isPending}>
            {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}Adicionar fatura
          </Button>
        </form>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {card.invoices.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">Nenhuma fatura ainda</p>
          ) : (
            card.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{MONTHS[inv.month - 1]}/{inv.year}</span>
                  <div><Badge variant="secondary" className={`text-xs ${INVOICE_STATUS_STYLES[inv.status]}`}>{inv.status === "PAID" ? "Paga" : inv.status === "OVERDUE" ? "Atrasada" : inv.status === "PARTIAL" ? "Parcial" : "Pendente"}</Badge></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">{fmtCurrency(inv.totalAmount)}</span>
                  {inv.status !== "PAID" && <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handlePay(inv.id)}><CheckIcon className="h-3.5 w-3.5" /></Button>}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(inv.id)}><Trash2Icon className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface Props { creditCards: CreditCard[]; personas: { id: string; name: string }[] }

export function CreditCardsTable({ creditCards, personas }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CreditCard | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [invoicesCard, setInvoicesCard] = useState<CreditCard | null>(null)
  const [filter, setFilter] = useState("")

  const filtered = creditCards.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(c: CreditCard) { setEditing(c); setDialogOpen(true) }

  async function handleDelete() {
    if (!deleteId) return
    await deleteCreditCard(deleteId); toast.success("Cartão excluído!")
    setDeleteId(null)
  }

  async function handleToggle(id: string, current: boolean) {
    await toggleCreditCardActive(id, !current); toast.success(!current ? "Cartão ativado" : "Cartão desativado")
  }

  return (
    <>
      <div className="px-4 lg:px-6 pb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Input placeholder="Buscar cartão..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs h-9" />
          <Button size="sm" onClick={openCreate}><PlusIcon className="h-4 w-4 mr-1.5" />Novo cartão</Button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border">
            <EmptyState icon={CreditCardIcon} title="Nenhum cartão" description="Cadastre seus cartões de crédito" action={!filter ? <Button size="sm" onClick={openCreate}><PlusIcon className="h-4 w-4 mr-1.5" />Novo cartão</Button> : undefined} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((card) => (
              <div key={card.id} className="group rounded-xl border border-border/60 overflow-hidden hover:shadow-md transition-all bg-card">
                <div className="h-2" style={{ backgroundColor: card.color }} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CreditCardIcon className="h-4 w-4" style={{ color: card.color }} />
                        <span className="font-semibold">{card.name}</span>
                        {!card.isActive && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{BRANDS.find((b) => b.value === card.brand)?.label} · Fecha dia {card.closingDay} · Vence dia {card.dueDay}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={card.isActive} onCheckedChange={() => handleToggle(card.id, card.isActive)} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontalIcon className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setInvoicesCard(card)}><ListIcon className="h-4 w-4" />Ver faturas</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(card)}><Edit2Icon className="h-4 w-4" />Editar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(card.id)}><Trash2Icon className="h-4 w-4" />Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-muted-foreground">Limite</p><p className="text-lg font-bold font-mono">{fmtCurrency(card.limit)}</p></div>
                    <div className="text-right"><p className="text-xs text-muted-foreground">{card._count.transactions} transações</p></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cartão" : "Novo cartão"}</DialogTitle>
            <DialogDescription>Configure seu cartão de crédito</DialogDescription>
          </DialogHeader>
          <CardForm card={editing} personas={personas} onSuccess={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {invoicesCard && <InvoicesDialog card={invoicesCard} onClose={() => setInvoicesCard(null)} />}

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title="Excluir cartão?" description="As faturas serão excluídas. As transações serão mantidas sem vínculo." onConfirm={handleDelete} />
    </>
  )
}

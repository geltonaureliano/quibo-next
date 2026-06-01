"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createLivingCost, updateLivingCost, deleteLivingCost, toggleLivingCostActive, type LivingCostInput } from "@/actions/living-costs"
import type { LivingCostSourceType } from '@/lib/db-types'
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
import { CreditCardIcon, Edit2Icon, Loader2Icon, MoreHorizontalIcon, PlusIcon, ReceiptIcon, Trash2Icon, WalletIcon } from "lucide-react"

type LC = {
  id: string; userId: string; name: string; description: string | null; amount: unknown
  sourceType: LivingCostSourceType; accountId: string | null; creditCardId: string | null
  categoryId: string | null; personaId: string | null; dayOfMonth: number
  startDate: Date | null; endDate: Date | null; isActive: boolean; createdAt: Date; updatedAt: Date
  account: { id: string; name: string } | null
  creditCard: { id: string; name: string } | null
  category: { id: string; name: string; color: string } | null
  persona: { id: string; name: string; color: string } | null
}

function toNum(v: unknown) {
  if (typeof v === "number") return v
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function") return (v as { toNumber: () => number }).toNumber()
  return 0
}
function fmtCurrency(v: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(toNum(v))
}

interface FormProps {
  lc?: LC | null
  accounts: { id: string; name: string }[]
  creditCards: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  personas: { id: string; name: string }[]
  onSuccess: () => void
  onCancel: () => void
}

function LivingCostForm({ lc, accounts, creditCards, categories, personas, onSuccess, onCancel }: FormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(lc?.name ?? "")
  const [description, setDescription] = useState(lc?.description ?? "")
  const [amount, setAmount] = useState(lc ? toNum(lc.amount).toString() : "")
  const [sourceType, setSourceType] = useState<LivingCostSourceType>(lc?.sourceType ?? "ACCOUNT")
  const [accountId, setAccountId] = useState(lc?.accountId ?? "")
  const [creditCardId, setCreditCardId] = useState(lc?.creditCardId ?? "")
  const [categoryId, setCategoryId] = useState(lc?.categoryId ?? "")
  const [personaId, setPersonaId] = useState(lc?.personaId ?? "")
  const [dayOfMonth, setDayOfMonth] = useState(lc?.dayOfMonth?.toString() ?? "")
  const [startDate, setStartDate] = useState(lc?.startDate ? new Date(lc.startDate).toISOString().slice(0, 10) : "")
  const [endDate, setEndDate] = useState(lc?.endDate ? new Date(lc.endDate).toISOString().slice(0, 10) : "")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Nome é obrigatório")
    if (!amount || parseFloat(amount) <= 0) return setError("Valor deve ser maior que zero")
    if (!dayOfMonth || parseInt(dayOfMonth) < 1 || parseInt(dayOfMonth) > 31) return setError("Dia deve ser entre 1 e 31")
    if (sourceType === "ACCOUNT" && !accountId) return setError("Conta é obrigatória")
    if (sourceType === "CREDIT_CARD" && !creditCardId) return setError("Cartão é obrigatório")

    const input: LivingCostInput = {
      name: name.trim(), description: description || undefined, amount: parseFloat(amount),
      sourceType, accountId: sourceType === "ACCOUNT" ? accountId : undefined,
      creditCardId: sourceType === "CREDIT_CARD" ? creditCardId : undefined,
      categoryId: categoryId || undefined, personaId: personaId || undefined,
      dayOfMonth: parseInt(dayOfMonth), startDate: startDate || undefined, endDate: endDate || undefined,
    }
    setError("")
    startTransition(async () => {
      try {
        if (lc) { await updateLivingCost(lc.id, input); toast.success("Custo atualizado!") }
        else { await createLivingCost(input); toast.success("Custo criado!") }
        onSuccess()
      } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado") }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
      <div className="space-y-1.5"><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Aluguel, Internet..." /></div>
      <div className="space-y-1.5"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Dia do vencimento *</Label><Input type="number" min="1" max="31" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} placeholder="1-31" /></div>
      </div>
      <div className="space-y-1.5">
        <Label>Forma de pagamento</Label>
        <div className="flex gap-2">
          {[{ value: "ACCOUNT", label: "Conta", icon: WalletIcon }, { value: "CREDIT_CARD", label: "Cartão", icon: CreditCardIcon }].map((t) => (
            <button key={t.value} type="button" onClick={() => setSourceType(t.value as LivingCostSourceType)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-2 ${sourceType === t.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </div>
      </div>
      {sourceType === "ACCOUNT" ? (
        <div className="space-y-1.5">
          <Label>Conta *</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>Cartão *</Label>
          <Select value={creditCardId} onValueChange={setCreditCardId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{creditCards.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
            <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Persona</Label>
          <Select value={personaId || "none"} onValueChange={(v) => setPersonaId(v === "none" ? "" : v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
            <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{personas.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Início</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Fim (opcional)</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          {lc ? "Salvar" : "Criar custo"}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface Props {
  livingCosts: LC[]
  accounts: { id: string; name: string }[]
  creditCards: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  personas: { id: string; name: string }[]
}

export function LivingCostsTable({ livingCosts, accounts, creditCards, categories, personas }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LC | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState("")

  const filtered = livingCosts.filter((lc) => lc.name.toLowerCase().includes(filter.toLowerCase()))

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(lc: LC) { setEditing(lc); setDialogOpen(true) }

  async function handleDelete() {
    if (!deleteId) return
    await deleteLivingCost(deleteId); toast.success("Custo excluído!")
    setDeleteId(null)
  }

  async function handleToggle(id: string, current: boolean) {
    await toggleLivingCostActive(id, !current)
    toast.success(!current ? "Ativado" : "Desativado")
  }

  return (
    <>
      <div className="px-4 lg:px-6 pb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Input placeholder="Buscar custo..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs h-9" />
          <Button size="sm" onClick={openCreate}><PlusIcon className="h-4 w-4 mr-1.5" />Novo custo</Button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border">
            <EmptyState icon={ReceiptIcon} title="Nenhum custo fixo" description="Cadastre despesas recorrentes como aluguel, planos e assinaturas" action={!filter ? <Button size="sm" onClick={openCreate}><PlusIcon className="h-4 w-4 mr-1.5" />Novo custo</Button> : undefined} />
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Despesa</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Valor</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Dia</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Pagamento</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Ativo</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((lc) => (
                  <tr key={lc.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="font-medium">{lc.name}</div>
                      {lc.category && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: lc.category.color }} />
                          <span className="text-xs text-muted-foreground">{lc.category.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-destructive">{fmtCurrency(lc.amount)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-center">
                      <Badge variant="outline" className="text-xs">Dia {lc.dayOfMonth}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {lc.sourceType === "ACCOUNT" ? <WalletIcon className="h-3.5 w-3.5" /> : <CreditCardIcon className="h-3.5 w-3.5" />}
                        {lc.sourceType === "ACCOUNT" ? lc.account?.name : lc.creditCard?.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex justify-center"><Switch checked={lc.isActive} onCheckedChange={() => handleToggle(lc.id, lc.isActive)} /></div>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontalIcon className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(lc)}><Edit2Icon className="h-4 w-4" />Editar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(lc.id)}><Trash2Icon className="h-4 w-4" />Excluir</DropdownMenuItem>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar custo" : "Novo custo fixo"}</DialogTitle>
            <DialogDescription>Configure despesas recorrentes mensais</DialogDescription>
          </DialogHeader>
          <LivingCostForm lc={editing} accounts={accounts} creditCards={creditCards} categories={categories} personas={personas} onSuccess={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title="Excluir custo fixo?" description="Esta ação não pode ser desfeita." onConfirm={handleDelete} />
    </>
  )
}

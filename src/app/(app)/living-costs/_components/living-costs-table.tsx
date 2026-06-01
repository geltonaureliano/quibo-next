"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createLivingCost, updateLivingCost, deleteLivingCost, toggleLivingCostActive, type LivingCostInput } from "@/actions/living-costs"
import type { LivingCostSourceType } from '@/lib/db-types'
import { fmtCurrency, parseCurrencyToFloat, amountToMask } from "@/lib/currency"
import { CurrencyInput } from "@/components/shared/currency-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import {
  CreditCardIcon,
  Loader2Icon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  Trash2Icon,
  WalletIcon,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────

type LC = {
  id: string; userId: string; name: string; description: string | null; amount: number
  sourceType: LivingCostSourceType; accountId: string | null; creditCardId: string | null
  dayOfMonth: number; isActive: boolean; createdAt: Date; updatedAt: Date
  account: { id: string; name: string } | null
  creditCard: { id: string; name: string } | null
}

// ─── Formulário ──────────────────────────────────────────────────────────

interface FormProps {
  lc?: LC | null
  accounts: { id: string; name: string }[]
  creditCards: { id: string; name: string }[]
  onSuccess: () => void
  onCancel: () => void
  onRequestDelete?: () => void
}

function LivingCostForm({ lc, accounts, creditCards, onSuccess, onCancel, onRequestDelete }: FormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(lc?.name ?? "")
  const [description, setDescription] = useState(lc?.description ?? "")

  const [amountMasked, setAmountMasked] = useState(() => (lc ? amountToMask(lc.amount) : ""))

  const [sourceType, setSourceType] = useState<LivingCostSourceType>(lc?.sourceType ?? "ACCOUNT")
  const [accountId, setAccountId] = useState(lc?.accountId ?? "")
  const [creditCardId, setCreditCardId] = useState(lc?.creditCardId ?? "")
  const [dayOfMonth, setDayOfMonth] = useState(lc?.dayOfMonth?.toString() ?? "")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Nome é obrigatório")
    const amount = parseCurrencyToFloat(amountMasked)
    if (!amount || amount <= 0) return setError("Valor deve ser maior que zero")
    if (!dayOfMonth || parseInt(dayOfMonth) < 1 || parseInt(dayOfMonth) > 31) return setError("Dia deve ser entre 1 e 31")
    if (sourceType === "ACCOUNT" && !accountId) return setError("Conta é obrigatória")
    if (sourceType === "CREDIT_CARD" && !creditCardId) return setError("Cartão é obrigatório")

    const input: LivingCostInput = {
      name: name.trim(), description: description || undefined, amount,
      sourceType, accountId: sourceType === "ACCOUNT" ? accountId : undefined,
      creditCardId: sourceType === "CREDIT_CARD" ? creditCardId : undefined,
      dayOfMonth: parseInt(dayOfMonth),
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

      <div className="space-y-1.5">
        <Label htmlFor="lc-name">Nome *</Label>
        <Input
          id="lc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Aluguel, Internet, Streaming..."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lc-description">Descrição</Label>
        <Textarea
          id="lc-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Detalhes opcionais..."
          className="resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lc-amount">Valor *</Label>
          <CurrencyInput
            id="lc-amount"
            value={amountMasked}
            onChange={(masked) => setAmountMasked(masked)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lc-day">Dia do vencimento *</Label>
          <Input
            id="lc-day"
            type="number"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            placeholder="1 – 31"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Forma de pagamento</Label>
        <div className="flex gap-2">
          {[
            { value: "ACCOUNT", label: "Conta", icon: WalletIcon },
            { value: "CREDIT_CARD", label: "Cartão", icon: CreditCardIcon },
          ].map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSourceType(t.value as LivingCostSourceType)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                sourceType === t.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted text-muted-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {sourceType === "ACCOUNT" ? (
        <div className="space-y-1.5">
          <Label>Conta *</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-full cursor-pointer"><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
            <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id} className="cursor-pointer">{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>Cartão *</Label>
          <Select value={creditCardId} onValueChange={setCreditCardId}>
            <SelectTrigger className="w-full cursor-pointer"><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
            <SelectContent>{creditCards.map((c) => <SelectItem key={c.id} value={c.id} className="cursor-pointer">{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <DialogFooter className="gap-2">
          {lc && onRequestDelete && (
            <Button
              type="button"
              variant="outline"
              onClick={onRequestDelete}
              disabled={isPending}
              className="cursor-pointer mr-auto text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2Icon className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} className="cursor-pointer">
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="cursor-pointer">
            {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            {lc ? "Salvar alterações" : "Criar custo"}
          </Button>
        </DialogFooter>
      </div>
    </form>
  )
}

// ─── Tabela principal ─────────────────────────────────────────────────────

interface Props {
  livingCosts: LC[]
  accounts: { id: string; name: string }[]
  creditCards: { id: string; name: string }[]
}

export function LivingCostsTable({ livingCosts, accounts, creditCards }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LC | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState("")

  const filtered = livingCosts.filter((lc) => lc.name.toLowerCase().includes(filter.toLowerCase()))

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(lc: LC) { setEditing(lc); setDialogOpen(true) }

  async function handleDelete() {
    if (!deleteId) return
    await deleteLivingCost(deleteId)
    toast.success("Custo excluído!")
    setDeleteId(null)
    setDialogOpen(false)
    setEditing(null)
  }

  async function handleToggle(id: string, current: boolean) {
    await toggleLivingCostActive(id, !current)
    toast.success(!current ? "Ativado" : "Desativado")
  }

  return (
    <>
      <div className="px-4 lg:px-6 pb-8 space-y-5">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar custo..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button size="sm" onClick={openCreate} className="cursor-pointer shrink-0">
            <PlusIcon className="h-4 w-4 mr-1.5" />
            Novo custo
          </Button>
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border">
            <EmptyState
              icon={ReceiptIcon}
              title="Nenhum custo fixo"
              description={
                filter
                  ? "Nenhum resultado para o filtro aplicado"
                  : "Cadastre despesas recorrentes como aluguel, planos e assinaturas"
              }
              action={
                !filter ? (
                  <Button size="sm" onClick={openCreate} className="cursor-pointer">
                    <PlusIcon className="h-4 w-4 mr-1.5" />
                    Novo custo
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 text-xs uppercase tracking-wide">Despesa</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3 text-xs uppercase tracking-wide">Valor</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3 text-xs uppercase tracking-wide hidden sm:table-cell">Vencimento</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 text-xs uppercase tracking-wide hidden md:table-cell">Pagamento</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3 text-xs uppercase tracking-wide hidden md:table-cell">Ativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((lc) => (
                  <tr
                    key={lc.id}
                    onClick={() => openEdit(lc)}
                    className={`hover:bg-muted/50 transition-colors cursor-pointer ${!lc.isActive ? "opacity-55" : ""}`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                          <ReceiptIcon className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                          <div className="font-medium leading-tight flex items-center gap-2">
                            {lc.name}
                            {!lc.isActive && (
                              <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                                Inativo
                              </Badge>
                            )}
                          </div>
                          {lc.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{lc.description}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right tabular-nums">
                      <div className={`font-mono font-semibold ${lc.isActive ? "text-destructive" : "text-muted-foreground line-through"}`}>
                        {fmtCurrency(lc.amount)}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 hidden sm:table-cell text-center">
                      <Badge variant="outline" className="text-xs font-normal">
                        Dia {lc.dayOfMonth}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {lc.sourceType === "ACCOUNT" ? (
                          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-0 font-normal gap-1.5">
                            <WalletIcon className="h-3 w-3" />
                            {lc.account?.name ?? "Conta"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 border-0 font-normal gap-1.5">
                            <CreditCardIcon className="h-3 w-3" />
                            {lc.creditCard?.name ?? "Cartão"}
                          </Badge>
                        )}
                      </div>
                    </td>

                    <td
                      className="px-4 py-3.5 hidden md:table-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-center">
                        <Switch
                          checked={lc.isActive}
                          onCheckedChange={() => handleToggle(lc.id, lc.isActive)}
                          className="cursor-pointer"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar custo fixo" : "Novo custo fixo"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados da despesa recorrente" : "Configure uma despesa recorrente mensal"}
            </DialogDescription>
          </DialogHeader>
          <LivingCostForm
            key={editing ? `edit-${editing.id}` : "create"}
            lc={editing}
            accounts={accounts}
            creditCards={creditCards}
            onSuccess={() => setDialogOpen(false)}
            onCancel={() => setDialogOpen(false)}
            onRequestDelete={editing ? () => setDeleteId(editing.id) : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir custo fixo?"
        description="Esta ação não pode ser desfeita. O custo será removido permanentemente."
        onConfirm={handleDelete}
      />
    </>
  )
}

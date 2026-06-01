"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createSalary, updateSalary, deleteSalary, toggleSalaryActive, type SalaryInput } from "@/actions/salaries"
import type { SalaryCalculationType, WorkDaysType, IncomeCategoryType } from '@/lib/db-types'
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
import { Edit2Icon, Loader2Icon, MoreHorizontalIcon, PlusIcon, TrendingUpIcon, Trash2Icon } from "lucide-react"

type SalaryWithRels = {
  id: string; userId: string; accountId: string; name: string; description: string | null
  calculationType: SalaryCalculationType; fixedAmount: unknown; hourlyRate: unknown; hoursPerDay: unknown
  workDays: WorkDaysType | null; includeHolidays: boolean; isRecurring: boolean
  startDate: Date; endDate: Date | null; paymentDay: number | null; isActive: boolean; createdAt: Date; updatedAt: Date
  account: { id: string; name: string; color: string } | null
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
  return new Date(d).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
}

interface FormProps {
  salary?: SalaryWithRels | null
  accounts: { id: string; name: string }[]
  onSuccess: () => void
  onCancel: () => void
}

function SalaryForm({ salary, accounts, onSuccess, onCancel }: FormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(salary?.name ?? "")
  const [description, setDescription] = useState(salary?.description ?? "")
  const [accountId, setAccountId] = useState(salary?.accountId ?? "")
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategoryType>("OTHER")
  const [calcType, setCalcType] = useState<SalaryCalculationType>(salary?.calculationType ?? "FIXED")
  const [fixedAmount, setFixedAmount] = useState(salary?.fixedAmount ? toNum(salary.fixedAmount).toString() : "")
  const [hourlyRate, setHourlyRate] = useState(salary?.hourlyRate ? toNum(salary.hourlyRate).toString() : "")
  const [hoursPerDay, setHoursPerDay] = useState(salary?.hoursPerDay ? toNum(salary.hoursPerDay).toString() : "8")
  const [workDays, setWorkDays] = useState<WorkDaysType>(salary?.workDays ?? "WEEKDAYS")
  const [includeHolidays, setIncludeHolidays] = useState(salary?.includeHolidays ?? false)
  const [isRecurring, setIsRecurring] = useState(salary?.isRecurring ?? true)
  const [startDate, setStartDate] = useState(salary?.startDate ? new Date(salary.startDate).toISOString().slice(0, 10) : "")
  const [endDate, setEndDate] = useState(salary?.endDate ? new Date(salary.endDate).toISOString().slice(0, 10) : "")
  const [paymentDay, setPaymentDay] = useState(salary?.paymentDay?.toString() ?? "")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Nome é obrigatório")
    if (!accountId) return setError("Conta é obrigatória")
    if (!startDate) return setError("Data de início é obrigatória")
    if (calcType === "FIXED" && !fixedAmount) return setError("Valor fixo é obrigatório")
    if (calcType === "HOURLY" && !hourlyRate) return setError("Valor por hora é obrigatório")

    const input: SalaryInput = {
      name: name.trim(), description: description || undefined, accountId,
      incomeCategory,
      calculationType: calcType,
      fixedAmount: calcType === "FIXED" ? parseFloat(fixedAmount) : undefined,
      hourlyRate: calcType === "HOURLY" ? parseFloat(hourlyRate) : undefined,
      hoursPerDay: calcType === "HOURLY" ? parseFloat(hoursPerDay) : undefined,
      workDays: calcType === "HOURLY" ? workDays : undefined,
      includeHolidays: calcType === "HOURLY" ? includeHolidays : false,
      isRecurring, startDate, endDate: endDate || undefined,
      paymentDay: paymentDay ? parseInt(paymentDay) : undefined,
    }
    setError("")
    startTransition(async () => {
      try {
        if (salary) { await updateSalary(salary.id, input); toast.success("Receita atualizada!") }
        else { await createSalary(input); toast.success("Receita criada!") }
        onSuccess()
      } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado") }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
      <div className="space-y-1.5"><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Salário CLT, Freelance..." /></div>
      <div className="space-y-1.5"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
      <div className="space-y-1.5">
        <Label>Conta *</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Tipo de cálculo</Label>
        <div className="flex gap-2">
          {["FIXED", "HOURLY"].map((t) => (
            <button key={t} type="button" onClick={() => setCalcType(t as SalaryCalculationType)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${calcType === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
              {t === "FIXED" ? "Valor Fixo" : "Por Hora"}
            </button>
          ))}
        </div>
      </div>
      {calcType === "FIXED" ? (
        <div className="space-y-1.5"><Label>Valor mensal (R$) *</Label><Input type="number" step="0.01" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} placeholder="0,00" /></div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Valor por hora (R$) *</Label><Input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Horas/dia</Label><Input type="number" step="0.5" value={hoursPerDay} onChange={(e) => setHoursPerDay(e.target.value)} /></div>
          <div className="col-span-2 space-y-1.5">
            <Label>Dias trabalhados</Label>
            <Select value={workDays} onValueChange={(v) => setWorkDays(v as WorkDaysType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="WEEKDAYS">Dias úteis</SelectItem><SelectItem value="ALL_DAYS">Todos os dias</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <Label className="cursor-pointer">Incluir feriados nacionais</Label>
            <Switch checked={includeHolidays} onCheckedChange={setIncludeHolidays} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Início *</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Fim (opcional)</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Dia do pagamento</Label><Input type="number" min="1" max="31" value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} placeholder="1-31" /></div>
        <div className="space-y-1.5 flex flex-col justify-end">
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 h-9">
            <Label className="cursor-pointer text-xs">Recorrente</Label>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          {salary ? "Salvar" : "Criar receita"}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface Props {
  salaries: SalaryWithRels[]
  accounts: { id: string; name: string }[]
}

export function SalariesTable({ salaries, accounts }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SalaryWithRels | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState("")

  const filtered = salaries.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()))

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(s: SalaryWithRels) { setEditing(s); setDialogOpen(true) }

  async function handleDelete() {
    if (!deleteId) return
    await deleteSalary(deleteId); toast.success("Receita excluída!")
    setDeleteId(null)
  }

  async function handleToggle(id: string, current: boolean) {
    await toggleSalaryActive(id, !current)
    toast.success(!current ? "Ativada" : "Desativada")
  }

  return (
    <>
      <div className="px-4 lg:px-6 pb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Input placeholder="Buscar receita..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs h-9" />
          <Button size="sm" onClick={openCreate}><PlusIcon className="h-4 w-4 mr-1.5" />Nova receita</Button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border">
            <EmptyState icon={TrendingUpIcon} title="Nenhuma receita" description="Cadastre fontes de renda como salários e freelances" action={!filter ? <Button size="sm" onClick={openCreate}><PlusIcon className="h-4 w-4 mr-1.5" />Nova receita</Button> : undefined} />
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Receita</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Tipo</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Valor</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Conta</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Período</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Ativa</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant="secondary" className={s.calculationType === "FIXED" ? "bg-blue-500/10 text-blue-600" : "bg-violet-500/10 text-violet-600"}>
                        {s.calculationType === "FIXED" ? "Fixo" : "Por hora"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-emerald-600">
                      {s.calculationType === "FIXED" ? fmtCurrency(s.fixedAmount) : `${fmtCurrency(s.hourlyRate)}/h`}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{s.account?.name}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {fmtDate(s.startDate)}{s.endDate ? ` → ${fmtDate(s.endDate)}` : " → ∞"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex justify-center"><Switch checked={s.isActive} onCheckedChange={() => handleToggle(s.id, s.isActive)} /></div>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontalIcon className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(s)}><Edit2Icon className="h-4 w-4" />Editar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(s.id)}><Trash2Icon className="h-4 w-4" />Excluir</DropdownMenuItem>
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
            <DialogTitle>{editing ? "Editar receita" : "Nova receita"}</DialogTitle>
            <DialogDescription>Configure sua fonte de renda</DialogDescription>
          </DialogHeader>
          <SalaryForm salary={editing} accounts={accounts} onSuccess={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title="Excluir receita?" description="Esta ação não pode ser desfeita." onConfirm={handleDelete} />
    </>
  )
}

"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createSalary, updateSalary, deleteSalary, toggleSalaryActive, type SalaryInput } from "@/actions/salaries"
import type { SalaryCalculationType, WorkDaysType, IncomeCategoryType } from '@/lib/db-types'
import { fmtCurrency, formatCurrencyMask, parseCurrencyToFloat } from "@/lib/currency"
import { CurrencyInput } from "@/components/shared/currency-input"
import {
  getMonthlyRevenueAmount,
  getRevenueMonthStatus,
  fmtMonthName,
  nextMonthYear,
} from "@/lib/revenue-calculations"
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
  BriefcaseIcon,
  CodeIcon,
  TrendingUpIcon,
  DicesIcon,
  HomeIcon,
  HeartIcon,
  BarChart2Icon,
  GiftIcon,
  CircleDollarSignIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  SearchIcon,
  InfoIcon,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ─── Categoria de Receita ──────────────────────────────────────────────────

const INCOME_CATEGORIES: {
  value: IncomeCategoryType
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
}[] = [
  { value: "SALARY",     label: "Salário",       icon: BriefcaseIcon,         color: "text-blue-600",    bg: "bg-blue-500/10"    },
  { value: "FREELANCE",  label: "Freelance",      icon: CodeIcon,              color: "text-violet-600",  bg: "bg-violet-500/10"  },
  { value: "INVESTMENT", label: "Investimento",   icon: TrendingUpIcon,        color: "text-emerald-600", bg: "bg-emerald-500/10" },
  { value: "BETTING",    label: "Apostas",        icon: DicesIcon,             color: "text-orange-600",  bg: "bg-orange-500/10"  },
  { value: "RENTAL",     label: "Aluguel",        icon: HomeIcon,              color: "text-amber-600",   bg: "bg-amber-500/10"   },
  { value: "PENSION",    label: "Aposentadoria",  icon: HeartIcon,             color: "text-rose-600",    bg: "bg-rose-500/10"    },
  { value: "DIVIDEND",   label: "Dividendos",     icon: BarChart2Icon,         color: "text-cyan-600",    bg: "bg-cyan-500/10"    },
  { value: "BONUS",      label: "Bônus",          icon: GiftIcon,              color: "text-pink-600",    bg: "bg-pink-500/10"    },
  { value: "OTHER",      label: "Outro",          icon: CircleDollarSignIcon,  color: "text-gray-600",    bg: "bg-gray-500/10"    },
]

function getCategoryInfo(value: IncomeCategoryType) {
  return INCOME_CATEGORIES.find((c) => c.value === value) ?? INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1]
}

// ─── Tipos ────────────────────────────────────────────────────────────────

type SalaryWithRels = {
  id: string; userId: string; accountId: string; name: string; description: string | null
  incomeCategory: IncomeCategoryType
  calculationType: SalaryCalculationType; fixedAmount: number; hourlyRate: number; hoursPerDay: number
  workDays: WorkDaysType | null; includeHolidays: boolean; isRecurring: boolean
  startDate: Date; endDate: Date | null; paymentDay: number | null; isActive: boolean; createdAt: Date; updatedAt: Date
  account: { id: string; name: string; color: string } | null
}

// ─── Utilitários ──────────────────────────────────────────────────────────

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
}

function getRevenueStatusLabel(
  salary: SalaryWithRels,
  status: ReturnType<typeof getRevenueMonthStatus>
): string | null {
  if (status.isHourlyCurrentWork) return null // tratado separadamente como preview
  if (!status.inMonth) {
    if (status.notYetStarted) return `Inicia em ${fmtDate(salary.startDate)}`
    if (status.ended) return "Encerrada neste período"
    return "Fora do período"
  }
  if (!salary.isActive) return "Inativa"
  return null
}

// ─── Formulário ──────────────────────────────────────────────────────────

interface FormProps {
  salary?: SalaryWithRels | null
  accounts: { id: string; name: string }[]
  onSuccess: () => void
  onCancel: () => void
  onRequestDelete?: () => void
}

function ReceitaForm({ salary, accounts, onSuccess, onCancel, onRequestDelete }: FormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(salary?.name ?? "")
  const [description, setDescription] = useState(salary?.description ?? "")
  const [accountId, setAccountId] = useState(salary?.accountId ?? "")
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategoryType>(salary?.incomeCategory ?? "OTHER")
  const [calcType, setCalcType] = useState<SalaryCalculationType>(salary?.calculationType ?? "FIXED")

  const initFixed = salary?.fixedAmount ? formatCurrencyMask(Math.round(salary.fixedAmount * 100).toFixed(0)) : ""
  const initHourly = salary?.hourlyRate ? formatCurrencyMask(Math.round(salary.hourlyRate * 100).toFixed(0)) : ""

  const [fixedAmountMasked, setFixedAmountMasked] = useState(initFixed)
  const [fixedAmountFloat, setFixedAmountFloat] = useState(salary?.fixedAmount ?? 0)
  const [hourlyRateMasked, setHourlyRateMasked] = useState(initHourly)
  const [hourlyRateFloat, setHourlyRateFloat] = useState(salary?.hourlyRate ?? 0)
  const [hoursPerDay, setHoursPerDay] = useState(salary?.hoursPerDay ? salary.hoursPerDay.toString() : "8")
  const [workDays, setWorkDays] = useState<WorkDaysType>(salary?.workDays ?? "WEEKDAYS")
  const [includeHolidays, setIncludeHolidays] = useState(salary?.includeHolidays ?? false)
  const [isRecurring, setIsRecurring] = useState(salary?.isRecurring ?? true)
  const today = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(salary?.startDate ? new Date(salary.startDate).toISOString().slice(0, 10) : today)
  const [endDate, setEndDate] = useState(salary?.endDate ? new Date(salary.endDate).toISOString().slice(0, 10) : "")
  const [paymentDay, setPaymentDay] = useState(salary?.paymentDay?.toString() ?? "")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Nome é obrigatório")
    if (!accountId) return setError("Conta é obrigatória")
    if (!startDate) return setError("Data de início é obrigatória")
    if (calcType === "FIXED" && !fixedAmountFloat) return setError("Valor mensal é obrigatório")
    if (calcType === "HOURLY" && !hourlyRateFloat) return setError("Valor por hora é obrigatório")

    const input: SalaryInput = {
      name: name.trim(),
      description: description || undefined,
      accountId,
      incomeCategory,
      calculationType: calcType,
      fixedAmount: calcType === "FIXED" ? fixedAmountFloat : undefined,
      hourlyRate: calcType === "HOURLY" ? hourlyRateFloat : undefined,
      hoursPerDay: calcType === "HOURLY" ? parseFloat(hoursPerDay) : undefined,
      workDays: calcType === "HOURLY" ? workDays : undefined,
      includeHolidays: calcType === "HOURLY" ? includeHolidays : false,
      isRecurring,
      startDate,
      endDate: endDate || undefined,
      paymentDay: paymentDay ? parseInt(paymentDay) : undefined,
    }

    setError("")
    startTransition(async () => {
      try {
        if (salary) {
          await updateSalary(salary.id, input)
          toast.success("Receita atualizada!")
        } else {
          await createSalary(input)
          toast.success("Receita criada!")
        }
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro inesperado")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Erro sempre visível acima do layout */}
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-4">{error}</p>
      )}

      {/* Layout horizontal: categorias à esquerda | form à direita */}
      <div className="flex min-h-[440px]">

        {/* Coluna esquerda — categorias + excluir fixo embaixo */}
        <div className="w-44 shrink-0 flex flex-col min-h-[440px] py-1 pr-5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-2 shrink-0">
            Categoria
          </p>
          <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto min-h-0">
            {INCOME_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const selected = incomeCategory === cat.value
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setIncomeCategory(cat.value)}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all cursor-pointer text-left w-full shrink-0 ${
                    selected
                      ? `${cat.bg} ${cat.color}`
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              )
            })}
          </div>
          {salary && onRequestDelete && (
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full shrink-0 cursor-pointer text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={onRequestDelete}
              disabled={isPending}
            >
              <Trash2Icon className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          )}
        </div>

        {/* Divisor vertical */}
        <div className="w-px bg-border shrink-0" />

        {/* Coluna direita — campos */}
        <div className="flex-1 pl-5 py-1 space-y-4 overflow-y-auto">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Salário CLT, Freelance design..."
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Detalhes opcionais..."
              className="resize-none"
            />
          </div>

          {/* Conta */}
          <div className="space-y-1.5">
            <Label>Conta *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="cursor-pointer">{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de cálculo */}
          <div className="space-y-2">
            <Label>Tipo de cálculo</Label>
            <div className="flex gap-2">
              {(["FIXED", "HOURLY"] as SalaryCalculationType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCalcType(t)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                    calcType === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {t === "FIXED" ? "Valor Fixo" : "Por Hora"}
                </button>
              ))}
            </div>
          </div>

          {/* Valores */}
          {calcType === "FIXED" ? (
            <div className="space-y-1.5">
              <Label htmlFor="fixedAmount">Valor mensal *</Label>
              <CurrencyInput
                id="fixedAmount"
                value={fixedAmountMasked}
                onChange={(masked, float) => { setFixedAmountMasked(masked); setFixedAmountFloat(float) }}
                placeholder="0,00"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="hourlyRate">Valor por hora *</Label>
                <CurrencyInput
                  id="hourlyRate"
                  value={hourlyRateMasked}
                  onChange={(masked, float) => { setHourlyRateMasked(masked); setHourlyRateFloat(float) }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hoursPerDay">Horas/dia</Label>
                <Input
                  id="hoursPerDay"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(e.target.value)}
                />
              </div>
              <div className="col-span-2 flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label>Dias trabalhados</Label>
                  <Select value={workDays} onValueChange={(v) => setWorkDays(v as WorkDaysType)}>
                    <SelectTrigger className="w-full cursor-pointer"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKDAYS" className="cursor-pointer">Dias úteis</SelectItem>
                      <SelectItem value="ALL_DAYS" className="cursor-pointer">Todos os dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-border px-3 h-9 cursor-pointer shrink-0">
                  <span className="text-sm font-medium whitespace-nowrap">Feriados</span>
                  <Switch checked={includeHolidays} onCheckedChange={setIncludeHolidays} />
                </label>
              </div>
            </div>
          )}

          {/* Datas + pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Início *</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="cursor-pointer" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">Fim (opcional)</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="cursor-pointer" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentDay">Dia do pagamento</Label>
              <Input
                id="paymentDay"
                type="number"
                min="1"
                max="31"
                value={paymentDay}
                onChange={(e) => setPaymentDay(e.target.value)}
                placeholder="1–31"
              />
            </div>
            <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 self-end cursor-pointer">
              <span className="text-sm font-medium">Recorrente</span>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </label>
          </div>
        </div>
      </div>

      {/* Footer com divisor */}
      <div className="border-t border-border pt-4 mt-4">
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} className="cursor-pointer">
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="cursor-pointer">
            {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            {salary ? "Salvar alterações" : "Criar receita"}
          </Button>
        </DialogFooter>
      </div>
    </form>
  )
}

// ─── Tabela principal ─────────────────────────────────────────────────────

interface Props {
  salaries: SalaryWithRels[]
  accounts: { id: string; name: string }[]
  month: number
  year: number
}

export function ReceitasTable({ salaries, accounts, month, year }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SalaryWithRels | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<IncomeCategoryType | "ALL">("ALL")

  const filtered = salaries
    .filter((s) => {
      const matchName = s.name.toLowerCase().includes(filter.toLowerCase())
      const matchCat = categoryFilter === "ALL" || s.incomeCategory === categoryFilter
      return matchName && matchCat
    })
    .sort((a, b) => {
      const statusA = getRevenueMonthStatus(a, year, month)
      const statusB = getRevenueMonthStatus(b, year, month)
      // Ordem: vigentes no mês > preview de trabalho atual > fora do período
      const rankA = statusA.inMonth ? 0 : statusA.isHourlyCurrentWork ? 1 : 2
      const rankB = statusB.inMonth ? 0 : statusB.isHourlyCurrentWork ? 1 : 2
      if (rankA !== rankB) return rankA - rankB
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return a.name.localeCompare(b.name, "pt-BR")
    })

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(s: SalaryWithRels) { setEditing(s); setDialogOpen(true) }

  async function handleDelete() {
    if (!deleteId) return
    await deleteSalary(deleteId)
    toast.success("Receita excluída!")
    setDeleteId(null)
    setDialogOpen(false)
    setEditing(null)
  }

  async function handleToggle(id: string, current: boolean) {
    await toggleSalaryActive(id, !current)
    toast.success(!current ? "Receita ativada" : "Receita desativada")
  }

  const salariesInMonth = salaries.filter((s) => {
    const st = getRevenueMonthStatus(s, year, month)
    return st.inMonth || st.isHourlyCurrentWork
  })

  const categoryCounts = INCOME_CATEGORIES.map((cat) => ({
    ...cat,
    count: salariesInMonth.filter((s) => s.incomeCategory === cat.value).length,
  })).filter((c) => c.count > 0)

  return (
    <>
      <div className="px-4 lg:px-6 pb-8 space-y-5">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar receita..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <Button size="sm" onClick={openCreate} className="cursor-pointer shrink-0">
            <PlusIcon className="h-4 w-4 mr-1.5" />
            Nova receita
          </Button>
        </div>

        {/* Filtro por categoria */}
        {categoryCounts.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter("ALL")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                categoryFilter === "ALL"
                  ? "bg-foreground text-background border-foreground"
                  : "border-border hover:bg-muted text-muted-foreground"
              }`}
            >
              Todas
              <span className="text-[10px] opacity-70">{salaries.length}</span>
            </button>
            {categoryCounts.map((cat) => {
              const Icon = cat.icon
              const selected = categoryFilter === cat.value
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    selected
                      ? `${cat.bg} ${cat.color} border-current/30`
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {cat.label}
                  <span className="text-[10px] opacity-70">{cat.count}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border">
            <EmptyState
              icon={TrendingUpIcon}
              title="Nenhuma receita"
              description={
                filter || categoryFilter !== "ALL"
                  ? "Nenhum resultado para os filtros aplicados"
                  : "Cadastre uma fonte de renda para começar"
              }
              action={
                !filter && categoryFilter === "ALL" ? (
                  <Button size="sm" onClick={openCreate} className="cursor-pointer">
                    <PlusIcon className="h-4 w-4 mr-1.5" />Nova receita
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
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 text-xs uppercase tracking-wide">Receita</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 text-xs uppercase tracking-wide hidden sm:table-cell">Categoria</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 text-xs uppercase tracking-wide hidden sm:table-cell">Tipo</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3 text-xs uppercase tracking-wide">Valor no mês</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 text-xs uppercase tracking-wide hidden md:table-cell">Conta</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 text-xs uppercase tracking-wide hidden lg:table-cell">Período</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3 text-xs uppercase tracking-wide hidden md:table-cell">Ativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((s) => {
                  const catInfo = getCategoryInfo(s.incomeCategory)
                  const Icon = catInfo.icon
                  const monthStatus = getRevenueMonthStatus(s, year, month)
                  const statusLabel = getRevenueStatusLabel(s, monthStatus)
                  const appliesToMonth = monthStatus.inMonth
                  const isPreview = monthStatus.isHourlyCurrentWork
                  const monthlyAmount = getMonthlyRevenueAmount(s, year, month)
                  const isRowMuted = !appliesToMonth || !s.isActive
                  const { year: nextY, month: nextM } = nextMonthYear(year, month)
                  return (
                    <tr
                      key={s.id}
                      onClick={() => openEdit(s)}
                      className={`transition-colors cursor-pointer ${
                        isRowMuted
                          ? "opacity-50 hover:bg-muted/30"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${catInfo.bg}`}>
                            <Icon className={`h-4 w-4 ${catInfo.color}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium leading-tight flex items-center gap-2 flex-wrap">
                              {s.name}
                              {isPreview && (
                                <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0 bg-amber-500/10 text-amber-700">
                                  Recebe em {fmtMonthName(nextY, nextM).split(" ")[0]}
                                </Badge>
                              )}
                              {statusLabel && (
                                <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                                  {statusLabel}
                                </Badge>
                              )}
                            </div>
                            {s.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {s.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <Badge
                          variant="secondary"
                          className={`${catInfo.bg} ${catInfo.color} border-0 font-normal`}
                        >
                          {catInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <Badge
                          variant="secondary"
                          className={
                            s.calculationType === "FIXED"
                              ? "bg-blue-500/10 text-blue-600 border-0 font-normal"
                              : "bg-violet-500/10 text-violet-600 border-0 font-normal"
                          }
                        >
                          {s.calculationType === "FIXED" ? "Fixo" : "Por hora"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {appliesToMonth ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="flex items-center gap-1.5">
                              {s.calculationType === "HOURLY" && (
                                <TooltipProvider delayDuration={100}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <InfoIcon className="h-3.5 w-3.5 text-amber-500 shrink-0 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-xs text-xs">
                                      <p className="font-medium mb-1">Regra T+1 — Receita por hora</p>
                                      <p>O trabalho é feito em <strong>{fmtMonthName(monthStatus.workYear, monthStatus.workMonth)}</strong> e o pagamento é recebido no mês seguinte.</p>
                                      <p className="mt-1 text-muted-foreground">Valor = {fmtCurrency(s.hourlyRate)}/h × {s.hoursPerDay}h/dia × dias úteis de {fmtMonthName(monthStatus.workYear, monthStatus.workMonth).split(" ")[0]}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <span
                                className={`font-mono font-semibold ${
                                  s.isActive
                                    ? "text-emerald-600"
                                    : "text-muted-foreground line-through"
                                }`}
                              >
                                {fmtCurrency(monthlyAmount)}
                              </span>
                            </div>
                            {s.calculationType === "HOURLY" && (
                              <div className="text-[10px] text-muted-foreground">
                                ref. {fmtMonthName(monthStatus.workYear, monthStatus.workMonth).split(" ")[0]}
                              </div>
                            )}
                          </div>
                        ) : isPreview ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <InfoIcon className="h-3.5 w-3.5 text-amber-500 shrink-0 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-xs text-xs">
                                    <p className="font-medium mb-1">Regra T+1 — Receita por hora</p>
                                    <p>O trabalho está sendo feito <strong>agora</strong>. O pagamento será recebido em <strong>{fmtMonthName(nextY, nextM)}</strong>.</p>
                                    <p className="mt-1 text-muted-foreground">Este valor não entra nos totais deste mês.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <span className="text-muted-foreground text-xs font-mono">
                                {fmtCurrency(s.hourlyRate)}/h
                              </span>
                            </div>
                            <div className="text-[10px] text-amber-600">paga em {fmtMonthName(nextY, nextM).split(" ")[0]}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell text-muted-foreground text-xs">
                        {s.account?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-muted-foreground">
                        {s.endDate ? (
                          <span className="tabular-nums">{fmtDate(s.startDate)} → {fmtDate(s.endDate)}</span>
                        ) : (
                          <span>Tempo indeterminado</span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3.5 hidden md:table-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-center">
                          <Switch
                            checked={s.isActive}
                            onCheckedChange={() => handleToggle(s.id, s.isActive)}
                            className="cursor-pointer"
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar receita" : "Nova receita"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados da sua fonte de renda" : "Cadastre uma nova fonte de renda"}
            </DialogDescription>
          </DialogHeader>
          <ReceitaForm
            salary={editing}
            accounts={accounts}
            onSuccess={() => setDialogOpen(false)}
            onCancel={() => setDialogOpen(false)}
            onRequestDelete={
              editing ? () => setDeleteId(editing.id) : undefined
            }
          />
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir receita?"
        description="Esta ação não pode ser desfeita. A receita será removida permanentemente."
        onConfirm={handleDelete}
      />
    </>
  )
}

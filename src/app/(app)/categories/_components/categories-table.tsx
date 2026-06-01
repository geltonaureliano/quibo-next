"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createCategory, updateCategory, deleteCategory, type CategoryInput } from "@/actions/categories"
import type { TransactionType } from '@/lib/db-types'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { Edit2Icon, Loader2Icon, MoreHorizontalIcon, PlusIcon, TagIcon, Trash2Icon } from "lucide-react"

type CategoryWithMeta = {
  id: string; name: string; type: TransactionType; color: string; icon: string; archived: boolean; parentId: string | null; createdAt: Date; updatedAt: Date; userId: string
  parent: { id: string; name: string } | null
  _count: { transactions: number }
}

const TYPES: { value: TransactionType; label: string; color: string }[] = [
  { value: "INCOME", label: "Receita", color: "bg-emerald-500/10 text-emerald-600" },
  { value: "EXPENSE", label: "Despesa", color: "bg-red-500/10 text-red-600" },
  { value: "TRANSFER", label: "Transferência", color: "bg-blue-500/10 text-blue-600" },
]

const COLORS = ["#6b7280","#3b82f6","#10b981","#8b5cf6","#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16","#f97316"]

interface FormProps {
  category?: CategoryWithMeta | null
  categories: CategoryWithMeta[]
  onSuccess: () => void
  onCancel: () => void
}

function CategoryForm({ category, categories, onSuccess, onCancel }: FormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(category?.name ?? "")
  const [type, setType] = useState<TransactionType>(category?.type ?? "EXPENSE")
  const [color, setColor] = useState(category?.color ?? "#6b7280")
  const [parentId, setParentId] = useState(category?.parentId ?? "")
  const [error, setError] = useState("")

  const parents = categories.filter((c) => !c.parentId && c.id !== category?.id)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Nome é obrigatório")
    const input: CategoryInput = { name: name.trim(), type, color, parentId: parentId || undefined }
    setError("")
    startTransition(async () => {
      try {
        if (category) { await updateCategory(category.id, input); toast.success("Categoria atualizada!") }
        else { await createCategory(input); toast.success("Categoria criada!") }
        onSuccess()
      } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado") }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Alimentação, Salário..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tipo *</Label>
          <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Categoria pai</Label>
          <Select value={parentId || "none"} onValueChange={(v) => setParentId(v === "none" ? "" : v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma (raiz)</SelectItem>
              {parents.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button key={c} type="button" className="h-7 w-7 rounded-full transition-all"
              style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }}
              onClick={() => setColor(c)} />
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          {category ? "Salvar" : "Criar categoria"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function CategoriesTable({ categories }: { categories: CategoryWithMeta[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryWithMeta | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">("ALL")

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(filter.toLowerCase()) &&
    (typeFilter === "ALL" || c.type === typeFilter)
  )

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(c: CategoryWithMeta) { setEditing(c); setDialogOpen(true) }

  async function handleDelete() {
    if (!deleteId) return
    const result = await deleteCategory(deleteId)
    if (result?.error) toast.error(result.error)
    else toast.success("Categoria removida!")
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
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={openCreate}><PlusIcon className="h-4 w-4 mr-1.5" />Nova categoria</Button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border">
            <EmptyState icon={TagIcon} title="Nenhuma categoria" description={filter ? "Tente outro termo" : "Organize seus gastos com categorias"} action={!filter ? <Button size="sm" onClick={openCreate}><PlusIcon className="h-4 w-4 mr-1.5" />Nova categoria</Button> : undefined} />
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Categoria</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Tipo</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Pai</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Transações</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((cat) => {
                  const typeInfo = TYPES.find((t) => t.value === cat.type)
                  return (
                    <tr key={cat.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + "20" }}>
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{cat.name}</span>
                            {cat.archived && <Badge variant="secondary" className="text-xs">Arquivada</Badge>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge variant="secondary" className={typeInfo?.color}>{typeInfo?.label}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                        {cat.parent?.name ?? <span className="italic">Raiz</span>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-right text-muted-foreground">{cat._count.transactions}</td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(cat)}><Edit2Icon className="h-4 w-4" />Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(cat.id)}><Trash2Icon className="h-4 w-4" />Excluir</DropdownMenuItem>
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
            <DialogDescription>Classifique suas transações por categoria</DialogDescription>
          </DialogHeader>
          <CategoryForm category={editing} categories={categories} onSuccess={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title="Excluir categoria?" description="Categorias com transações serão arquivadas." onConfirm={handleDelete} />
    </>
  )
}

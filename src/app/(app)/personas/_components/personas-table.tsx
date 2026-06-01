"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createPersona, updatePersona, deletePersona, archivePersona, type PersonaInput } from "@/actions/personas"
import type { Persona } from '@/lib/db-types'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { ArchiveIcon, Edit2Icon, Loader2Icon, MoreHorizontalIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react"

const COLORS = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
]

interface PersonaFormProps {
  persona?: Persona | null
  onSuccess: () => void
  onCancel: () => void
}

function PersonaForm({ persona, onSuccess, onCancel }: PersonaFormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(persona?.name ?? "")
  const [description, setDescription] = useState(persona?.description ?? "")
  const [color, setColor] = useState(persona?.color ?? "#3b82f6")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Nome é obrigatório")

    const input: PersonaInput = { name: name.trim(), description: description || undefined, color }
    setError("")

    startTransition(async () => {
      try {
        if (persona) {
          await updatePersona(persona.id, input)
          toast.success("Persona atualizada!")
        } else {
          await createPersona(input)
          toast.success("Persona criada!")
        }
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro inesperado")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pessoal, Trabalho, PJ..." />
      </div>
      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva essa persona..." rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c} type="button"
              className="h-7 w-7 rounded-full transition-all"
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
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          {persona ? "Salvar" : "Criar persona"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function PersonasTable({ personas }: { personas: Persona[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Persona | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState("")

  const filtered = personas.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  )

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(p: Persona) { setEditing(p); setDialogOpen(true) }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deletePersona(deleteId)
      toast.success("Persona excluída!")
    } catch {
      toast.error("Não foi possível excluir")
    }
    setDeleteId(null)
  }

  async function handleArchive(id: string, archived: boolean) {
    await archivePersona(id, !archived)
    toast.success(!archived ? "Persona arquivada" : "Persona restaurada")
  }

  return (
    <>
      <div className="px-4 lg:px-6 pb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Input placeholder="Buscar persona..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs h-9" />
          <Button size="sm" onClick={openCreate}>
            <PlusIcon className="h-4 w-4 mr-1.5" />Nova persona
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border">
            <EmptyState
              icon={UsersIcon}
              title="Nenhuma persona encontrada"
              description={filter ? "Tente outro termo" : "Crie contextos financeiros separados"}
              action={!filter ? <Button size="sm" onClick={openCreate}><PlusIcon className="h-4 w-4 mr-1.5" />Nova persona</Button> : undefined}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((persona) => (
              <div
                key={persona.id}
                className="group rounded-xl border border-border/60 p-4 hover:shadow-md transition-all bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: persona.color + "20" }}
                    >
                      <UsersIcon className="h-5 w-5" style={{ color: persona.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{persona.name}</p>
                      {persona.archived && (
                        <Badge variant="secondary" className="text-xs mt-0.5">Arquivada</Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(persona)}>
                        <Edit2Icon className="h-4 w-4" />Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchive(persona.id, persona.archived)}>
                        <ArchiveIcon className="h-4 w-4" />{persona.archived ? "Restaurar" : "Arquivar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(persona.id)}>
                        <Trash2Icon className="h-4 w-4" />Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {persona.description && (
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{persona.description}</p>
                )}
                <div
                  className="h-1 rounded-full mt-3"
                  style={{ backgroundColor: persona.color }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar persona" : "Nova persona"}</DialogTitle>
            <DialogDescription>Contextos financeiros para organizar seus dados</DialogDescription>
          </DialogHeader>
          <PersonaForm persona={editing} onSuccess={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir persona?"
        description="Os itens vinculados a esta persona serão desvinculados, mas não excluídos."
        onConfirm={handleDelete}
      />
    </>
  )
}

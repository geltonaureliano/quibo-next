"use client"

import { useActionState } from "react"
import Link from "next/link"
import { login } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircleIcon, Loader2Icon } from "lucide-react"

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null)

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex lg:hidden items-center gap-2 justify-center">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">Q</span>
        </div>
        <span className="font-semibold text-lg">Quibo</span>
      </div>

      <Card className="shadow-xl border-border/60">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold">Entrar</CardTitle>
          <CardDescription>Acesse sua conta de gestão financeira</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            {state?.error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                <AlertCircleIcon className="h-4 w-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              {pending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Não tem uma conta?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  )
}

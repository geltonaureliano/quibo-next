import type { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-sidebar text-sidebar-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
        <div className="relative z-10 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">Q</span>
          </div>
          <span className="font-semibold text-lg">Quibo</span>
        </div>
        <div className="relative z-10 space-y-4">
          <blockquote className="text-xl font-medium leading-relaxed">
            "Controle total da sua vida financeira, domínio por domínio."
          </blockquote>
          <p className="text-sidebar-foreground/60 text-sm">
            Receitas, despesas, dívidas, cartões — tudo organizado e separado por entidade.
          </p>
        </div>
        <div className="relative z-10 text-sidebar-foreground/40 text-xs">
          © {new Date().getFullYear()} Quibo. Gestão financeira pessoal.
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        {children}
      </div>
    </div>
  )
}

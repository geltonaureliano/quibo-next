import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getStats() {
  const [users, posts, publishedPosts] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.post.count({ where: { published: true } }),
  ]);
  return { users, posts, publishedPosts };
}

export default async function Home() {
  const stats = await getStats();

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center space-y-6 py-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Next.js 16 + Prisma 7
        </div>
        <h1 className="text-5xl font-bold text-white leading-tight">
          Fullstack com{" "}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Next.js & Prisma
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
          App Router, Server Actions, rotas de API REST e banco de dados SQLite
          com ORM type-safe de ponta a ponta.
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <Link
            href="/users"
            className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
          >
            Gerenciar Usuários
          </Link>
          <Link
            href="/posts"
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors border border-white/10"
          >
            Ver Posts
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-4">
        {[
          { label: "Usuários", value: stats.users, icon: "👤", href: "/users" },
          { label: "Posts Totais", value: stats.posts, icon: "📝", href: "/posts" },
          { label: "Publicados", value: stats.publishedPosts, icon: "✅", href: "/posts" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-white/8 transition-all"
          >
            <div className="text-3xl mb-3">{stat.icon}</div>
            <div className="text-4xl font-bold text-white">{stat.value}</div>
            <div className="text-slate-400 text-sm mt-1">{stat.label}</div>
          </Link>
        ))}
      </section>

      {/* Stack */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Stack utilizada</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              title: "Next.js 16 App Router",
              desc: "Server Components, Server Actions, rotas de API com Route Handlers e streaming nativo.",
              color: "from-slate-700 to-slate-800",
            },
            {
              title: "Prisma 7 ORM",
              desc: "Cliente type-safe gerado em src/generated/prisma com nova API prisma.config.ts.",
              color: "from-indigo-900/40 to-slate-800",
            },
            {
              title: "SQLite (dev)",
              desc: "Banco leve para desenvolvimento. Troque por PostgreSQL, MySQL ou MongoDB no prisma.config.ts.",
              color: "from-cyan-900/30 to-slate-800",
            },
            {
              title: "TypeScript + Tailwind v4",
              desc: "Tipagem de ponta a ponta e estilização com a nova sintaxe @import do Tailwind v4.",
              color: "from-violet-900/30 to-slate-800",
            },
          ].map((item) => (
            <div
              key={item.title}
              className={`p-6 rounded-2xl bg-gradient-to-br ${item.color} border border-white/10`}
            >
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* API Routes */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Rotas de API disponíveis</h2>
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden divide-y divide-white/10">
          {[
            { method: "GET", path: "/api/users", desc: "Listar todos os usuários" },
            { method: "POST", path: "/api/users", desc: "Criar novo usuário" },
            { method: "GET", path: "/api/users/:id", desc: "Buscar usuário por ID" },
            { method: "DELETE", path: "/api/users/:id", desc: "Remover usuário" },
            { method: "GET", path: "/api/posts", desc: "Listar todos os posts" },
            { method: "POST", path: "/api/posts", desc: "Criar novo post" },
          ].map((route) => (
            <div key={route.path + route.method} className="flex items-center gap-4 px-6 py-3">
              <span
                className={`text-xs font-mono font-bold px-2 py-1 rounded w-16 text-center ${
                  route.method === "GET"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : route.method === "POST"
                    ? "bg-blue-500/15 text-blue-400"
                    : "bg-red-500/15 text-red-400"
                }`}
              >
                {route.method}
              </span>
              <code className="text-slate-300 font-mono text-sm">{route.path}</code>
              <span className="text-slate-500 text-sm ml-auto">{route.desc}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

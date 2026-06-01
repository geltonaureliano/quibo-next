import { getUsers, createUser, deleteUser } from "@/lib/actions/users";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-white">Usuários</h1>
        <p className="text-slate-400 mt-1">Gerencie usuários via Server Actions + Prisma</p>
      </div>

      {/* Form */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
        <h2 className="font-semibold text-white">Novo Usuário</h2>
        <form action={createUser} className="flex flex-col sm:flex-row gap-3">
          <input
            name="name"
            required
            placeholder="Nome completo"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="email@exemplo.com"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors whitespace-nowrap"
          >
            Criar
          </button>
        </form>
      </div>

      {/* List */}
      <div className="space-y-3">
        {users.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            Nenhum usuário cadastrado ainda.
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div>
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-slate-400 text-sm">{user.email}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-500 text-sm">
                  {user._count.posts} post{user._count.posts !== 1 ? "s" : ""}
                </span>
                <span className="text-slate-600 text-xs font-mono">
                  {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                </span>
                <form
                  action={async () => {
                    "use server";
                    await deleteUser(user.id);
                  }}
                >
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors"
                  >
                    Remover
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

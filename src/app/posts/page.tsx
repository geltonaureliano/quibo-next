import { getPosts, createPost, togglePublishPost, deletePost } from "@/lib/actions/posts";
import { getUsers } from "@/lib/actions/users";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const [posts, users] = await Promise.all([getPosts(), getUsers()]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-white">Posts</h1>
        <p className="text-slate-400 mt-1">CRUD completo com Server Actions e relações Prisma</p>
      </div>

      {/* Form */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
        <h2 className="font-semibold text-white">Novo Post</h2>
        {users.length === 0 ? (
          <p className="text-slate-400 text-sm">
            Crie um usuário primeiro para poder publicar posts.
          </p>
        ) : (
          <form action={createPost} className="space-y-3">
            <div className="flex gap-3">
              <input
                name="title"
                required
                placeholder="Título do post"
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <select
                name="authorId"
                required
                className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:border-violet-500 transition-colors"
              >
                <option value="">Autor</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              name="content"
              placeholder="Conteúdo (opcional)"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
            >
              Publicar
            </button>
          </form>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="text-center py-16 text-slate-500">Nenhum post ainda.</div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        post.published
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-slate-500/20 text-slate-400"
                      }`}
                    >
                      {post.published ? "Publicado" : "Rascunho"}
                    </span>
                    <span className="text-slate-500 text-xs">por {post.author.name}</span>
                  </div>
                  <h3 className="font-medium text-white">{post.title}</h3>
                  {post.content && (
                    <p className="text-slate-400 text-sm leading-relaxed">{post.content}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <form
                    action={async () => {
                      "use server";
                      await togglePublishPost(post.id, post.published);
                    }}
                  >
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-sm transition-colors"
                    >
                      {post.published ? "Despublicar" : "Publicar"}
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await deletePost(post.id);
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
              <p className="text-slate-600 text-xs">
                {new Date(post.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

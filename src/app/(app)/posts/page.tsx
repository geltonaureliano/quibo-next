import { getPosts, createPost, togglePublishPost, deletePost } from "@/lib/actions/posts"
import { getUsers } from "@/lib/actions/users"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { FilePlus, Trash2, Eye, EyeOff, Circle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PostsPage() {
  const [posts, users] = await Promise.all([getPosts(), getUsers()])

  return (
    <>
      <SiteHeader title="Posts" />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              CRUD completo com Server Actions e relações Prisma
            </p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {posts.length} post{posts.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FilePlus className="h-4 w-4" />
              Novo Post
            </CardTitle>
            <CardDescription className="text-xs">
              Crie um post e associe a um autor existente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Crie um usuário primeiro para poder publicar posts.
              </p>
            ) : (
              <form action={createPost} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input name="title" required placeholder="Título do post" className="flex-1" />
                  <select name="authorId" required
                    className="px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">Selecionar autor</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <textarea name="content" placeholder="Conteúdo (opcional)" rows={3}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
                <Button type="submit">Criar post</Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* List */}
        <div className="space-y-2">
          {posts.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="py-16 text-center">
                <div className="text-4xl mb-3">📝</div>
                <p className="text-muted-foreground text-sm">Nenhum post criado ainda.</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {post.published ? (
                          <Badge className="h-5 text-[10px] px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1">
                            <Circle className="h-1.5 w-1.5 fill-emerald-500" />
                            Publicado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="h-5 text-[10px] px-1.5 gap-1">
                            <Circle className="h-1.5 w-1.5 fill-amber-400" />
                            Rascunho
                          </Badge>
                        )}
                      </div>
                      <p className="font-semibold text-sm line-clamp-1">{post.title}</p>
                      {post.content && (
                        <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">
                          {post.content}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
                            {post.author.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{post.author.name}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <form action={async () => { "use server"; await togglePublishPost(post.id, post.published) }}>
                        <Button type="submit" variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title={post.published ? "Despublicar" : "Publicar"}>
                          {post.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      </form>
                      <form action={async () => { "use server"; await deletePost(post.id) }}>
                        <Button type="submit" variant="ghost" size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  )
}

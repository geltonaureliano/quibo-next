import { createUser, deleteUser, getUsers } from "@/actions/users";
import { SiteHeader } from "@/components/layout/header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trash2, UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <>
      <SiteHeader title="Usuários" />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Gerencie os usuários via Server Actions + Prisma
            </p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {users.length} cadastrado{users.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Novo Usuário
            </CardTitle>
            <CardDescription className="text-xs">
              Preencha os dados para cadastrar um novo usuário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={createUser}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Input
                name="name"
                required
                placeholder="Nome completo"
                className="flex-1"
              />
              <Input
                name="email"
                type="email"
                required
                placeholder="email@exemplo.com"
                className="flex-1"
              />
              <Button type="submit" className="shrink-0">
                Criar usuário
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* List */}
        <div className="space-y-2">
          {users.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="py-16 text-center">
                <div className="text-4xl mb-3">👤</div>
                <p className="text-muted-foreground text-sm">
                  Nenhum usuário cadastrado ainda.
                </p>
              </CardContent>
            </Card>
          ) : (
            users.map((user) => (
              <Card
                key={user.id}
                className="shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="px-5 py-3.5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.name}
                      </p>
                      <p className="text-muted-foreground text-xs truncate">
                        {user.email}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {user._count.posts} post
                      {user._count.posts !== 1 ? "s" : ""}
                    </Badge>
                    <span className="text-muted-foreground text-xs shrink-0 hidden md:block">
                      {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    <form
                      action={async () => {
                        "use server";
                        await deleteUser(user.id);
                      }}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}

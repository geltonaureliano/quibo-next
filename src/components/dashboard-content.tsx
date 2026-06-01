"use client";

import {
  Users,
  FileText,
  CheckCircle2,
  FilePen,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Circle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

type Post = {
  id: string;
  title: string;
  published: boolean;
  createdAt: Date;
  author: { name: string };
};

type User = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  _count: { posts: number };
};

type DashboardData = {
  users: number;
  posts: number;
  publishedPosts: number;
  draftPosts: number;
  recentPosts: Post[];
  recentUsers: User[];
};

const mockActivityData = [
  { day: "Seg", posts: 2, users: 1 },
  { day: "Ter", posts: 5, users: 2 },
  { day: "Qua", posts: 3, users: 4 },
  { day: "Qui", posts: 7, users: 1 },
  { day: "Sex", posts: 4, users: 3 },
  { day: "Sáb", posts: 6, users: 2 },
  { day: "Dom", posts: 9, users: 5 },
];

const mockAreaData = [
  { month: "Jan", value: 12 },
  { month: "Fev", value: 19 },
  { month: "Mar", value: 15 },
  { month: "Abr", value: 28 },
  { month: "Mai", value: 22 },
  { month: "Jun", value: 35 },
];

const chartConfig = {
  posts: { label: "Posts", color: "var(--color-chart-1)" },
  users: { label: "Usuários", color: "var(--color-chart-2)" },
  value: { label: "Acessos", color: "var(--color-chart-1)" },
};

export function DashboardContent({ data }: { data: DashboardData }) {
  const publishRate = data.posts > 0 ? Math.round((data.publishedPosts / data.posts) * 100) : 0;

  const stats = [
    {
      title: "Total de Usuários",
      value: data.users,
      change: "+12%",
      positive: true,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
      desc: "vs. mês anterior",
    },
    {
      title: "Total de Posts",
      value: data.posts,
      change: "+8%",
      positive: true,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
      desc: "vs. mês anterior",
    },
    {
      title: "Publicados",
      value: data.publishedPosts,
      change: `${publishRate}%`,
      positive: true,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      desc: "taxa de publicação",
    },
    {
      title: "Rascunhos",
      value: data.draftPosts,
      change: "-3%",
      positive: false,
      icon: FilePen,
      color: "text-amber-600",
      bg: "bg-amber-50",
      desc: "vs. mês anterior",
    },
  ];

  return (
    <main className="flex-1 space-y-6 p-6 bg-muted/30 min-h-[calc(100vh-3.5rem)]">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Visão geral da aplicação em tempo real.
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" />
          Relatório
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </span>
                <div className={`h-9 w-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold tracking-tight">{stat.value}</span>
                <div className={`flex items-center gap-0.5 text-xs font-medium ${
                  stat.positive ? "text-emerald-600" : "text-rose-500"
                }`}>
                  {stat.positive ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {stat.change}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar chart */}
        <Card className="lg:col-span-3 border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Atividade Semanal</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Posts e usuários criados por dia
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockActivityData} barGap={4}>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="posts" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="users" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Area chart */}
        <Card className="lg:col-span-2 border shadow-sm">
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Crescimento</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Acessos nos últimos 6 meses
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockAreaData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <Tabs defaultValue="posts" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="h-8">
            <TabsTrigger value="posts" className="text-xs px-3">Posts Recentes</TabsTrigger>
            <TabsTrigger value="users" className="text-xs px-3">Usuários Recentes</TabsTrigger>
          </TabsList>
        </div>

        {/* Posts tab */}
        <TabsContent value="posts" className="m-0">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Posts Recentes</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Últimas publicações do sistema
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                  <a href="/posts">Ver todos</a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="text-xs pl-6">Título</TableHead>
                    <TableHead className="text-xs">Autor</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right pr-6">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentPosts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10 text-sm">
                        Nenhum post encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentPosts.map((post) => (
                      <TableRow key={post.id} className="hover:bg-muted/30 border-border/40">
                        <TableCell className="pl-6 py-3">
                          <span className="font-medium text-sm line-clamp-1 max-w-[260px] block">
                            {post.title}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                                {post.author.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground">
                              {post.author.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
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
                        </TableCell>
                        <TableCell className="pr-6 py-3 text-right text-xs text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users tab */}
        <TabsContent value="users" className="m-0">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Usuários Recentes</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Últimos usuários cadastrados
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                  <a href="/users">Ver todos</a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="text-xs pl-6">Usuário</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Posts</TableHead>
                    <TableHead className="text-xs text-right pr-6">Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10 text-sm">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/30 border-border/40">
                        <TableCell className="pl-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                {user.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <Progress
                              value={Math.min((user._count.posts / 5) * 100, 100)}
                              className="h-1.5 w-16"
                            />
                            <span className="text-xs text-muted-foreground">
                              {user._count.posts}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="pr-6 py-3 text-right text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Progress overview */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Visão Geral do Conteúdo</CardTitle>
          <CardDescription className="text-xs">
            Distribuição e saúde do conteúdo publicado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                label: "Taxa de publicação",
                value: data.posts > 0 ? Math.round((data.publishedPosts / data.posts) * 100) : 0,
                color: "bg-emerald-500",
                detail: `${data.publishedPosts} de ${data.posts} posts`,
              },
              {
                label: "Engajamento médio",
                value: 74,
                color: "bg-primary",
                detail: "estimativa baseada em atividade",
              },
              {
                label: "Autores ativos",
                value: data.users > 0 ? Math.min(100, Math.round((data.users / 10) * 100)) : 0,
                color: "bg-blue-500",
                detail: `${data.users} usuário${data.users !== 1 ? "s" : ""} cadastrado${data.users !== 1 ? "s" : ""}`,
              },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground font-semibold">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

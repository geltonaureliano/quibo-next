"use client";

import * as React from "react";

import { NavMain } from "@/components/layout/nav-main";
import { NavProjects } from "@/components/layout/nav-projects";
import { NavSecondary } from "@/components/layout/nav-secondary";
import { NavUser } from "@/components/layout/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  BarChart3Icon,
  CircleHelpIcon,
  DatabaseIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  Settings2Icon,
  ShieldIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";

const data = {
  user: {
    name: "Admin",
    email: "admin@quibo.dev",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
      isActive: true,
      items: [
        { title: "Visão Geral", url: "/dashboard" },
        { title: "Analytics", url: "#" },
        { title: "Relatórios", url: "#" },
      ],
    },
    {
      title: "Usuários",
      url: "/users",
      icon: <UsersIcon />,
      items: [
        { title: "Listar", url: "/users" },
        { title: "Novo Usuário", url: "/users" },
        { title: "Permissões", url: "#" },
      ],
    },
    {
      title: "Posts",
      url: "/posts",
      icon: <FileTextIcon />,
      items: [
        { title: "Todos os Posts", url: "/posts" },
        { title: "Publicados", url: "/posts" },
        { title: "Rascunhos", url: "/posts" },
      ],
    },
    {
      title: "Configurações",
      url: "#",
      icon: <Settings2Icon />,
      items: [
        { title: "Geral", url: "#" },
        { title: "Banco de Dados", url: "#" },
        { title: "Segurança", url: "#" },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Suporte",
      url: "#",
      icon: <CircleHelpIcon />,
    },
  ],
  projects: [
    {
      name: "API REST",
      url: "/api/users",
      icon: <DatabaseIcon />,
    },
    {
      name: "Métricas",
      url: "#",
      icon: <BarChart3Icon />,
    },
    {
      name: "Segurança",
      url: "#",
      icon: <ShieldIcon />,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ZapIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">quibo</span>
                  <span className="truncate text-xs opacity-60">
                    Next.js + Prisma
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Database,
  Settings,
  ChevronRight,
  Zap,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const navMain = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Usuários", href: "/users", icon: Users },
  { title: "Posts", href: "/posts", icon: FileText },
];

const navSystem = [
  { title: "Configurações", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      {/* Logo */}
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <Zap className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-sidebar-foreground text-base tracking-tight">
              quibo
            </span>
            <span className="text-xs text-sidebar-foreground/50">
              Next.js + Prisma
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="bg-sidebar-border" />

      <SidebarContent>
        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-widest">
            Aplicação
          </SidebarGroupLabel>
          <SidebarMenu>
            {navMain.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {isActive && (
                        <ChevronRight className="ml-auto h-3 w-3 opacity-60" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* API */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-widest">
            Sistema
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="API REST">
                <a href="/api/users" target="_blank" rel="noopener noreferrer">
                  <Database className="h-4 w-4" />
                  <span>API REST</span>
                  <Badge
                    variant="secondary"
                    className="ml-auto text-[10px] px-1.5 py-0 h-4 bg-sidebar-accent text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden"
                  >
                    6
                  </Badge>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {navSystem.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="px-3 py-4">
        <SidebarSeparator className="bg-sidebar-border mb-3" />
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
              QA
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden min-w-0">
            <span className="text-sm font-medium text-sidebar-foreground truncate">
              Admin
            </span>
            <span className="text-xs text-sidebar-foreground/50 truncate">
              admin@quibo.dev
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

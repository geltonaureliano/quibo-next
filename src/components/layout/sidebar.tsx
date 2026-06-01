"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { NavUser } from "@/components/layout/nav-user"
import {
  BarChart3Icon,
  ChevronRightIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  PiggyBankIcon,
  ReceiptIcon,
  RepeatIcon,
  Settings2Icon,
  ShieldAlertIcon,
  TagIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react"

interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
      { title: "Transações", url: "/transactions", icon: RepeatIcon },
    ],
  },
  {
    label: "Receitas & Despesas",
    items: [
      { title: "Receitas", url: "/revenues", icon: TrendingUpIcon },
      { title: "Custo de Vida", url: "/living-costs", icon: ReceiptIcon },
      { title: "Dívidas", url: "/debts", icon: ShieldAlertIcon },
      { title: "Cartões de Crédito", url: "/credit-cards", icon: CreditCardIcon },
    ],
  },
  {
    label: "Configurações",
    items: [
      { title: "Contas", url: "/accounts", icon: WalletIcon },
      { title: "Categorias", url: "/categories", icon: TagIcon },
    ],
  },
  {
    label: "Análises",
    items: [
      { title: "Relatórios", url: "/reports", icon: BarChart3Icon, disabled: true },
      { title: "Planejamento", url: "/planning", icon: PiggyBankIcon, disabled: true },
      { title: "Configurações", url: "/settings", icon: Settings2Icon, disabled: true },
    ],
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: { name: string; email: string; avatar: string }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                  <span className="font-bold text-sm">Q</span>
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-semibold text-sm">Quibo</span>
                  <span className="text-[10px] text-sidebar-foreground/50">Gestão financeira</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.url || pathname.startsWith(item.url + "/")
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild={!item.disabled}
                      isActive={isActive}
                      tooltip={item.title}
                      className={item.disabled ? "opacity-40 cursor-not-allowed" : ""}
                    >
                      {item.disabled ? (
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </span>
                      ) : (
                        <Link href={item.url}>
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user ?? { name: "", email: "", avatar: "" }} />
      </SidebarFooter>
    </Sidebar>
  )
}

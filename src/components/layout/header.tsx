import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface SiteHeaderProps {
  title?: string;
}

export function SiteHeader({ title }: SiteHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2  top-2 z-40 mx-4 rounded-xl">
      <SidebarTrigger className="-ml-1 cursor-pointer" />
      {title && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium">{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
    </header>
  );
}

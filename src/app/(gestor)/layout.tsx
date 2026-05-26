import { SidebarGestor } from "@/components/layout/sidebar-gestor";
import { HeaderGestor } from "@/components/layout/header-gestor";

export default function LayoutGestor({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <SidebarGestor />
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderGestor />
        <main className="fundo-app flex-1">{children}</main>
      </div>
    </div>
  );
}

import { SidebarAdmin } from "@/components/layout/sidebar-admin";
import { HeaderGestor } from "@/components/layout/header-gestor";

// reusa header do gestor (mesma estrutura — só muda o sidebar)
export default function LayoutAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <SidebarAdmin />
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderGestor />
        <main className="fundo-app flex-1">{children}</main>
      </div>
    </div>
  );
}

import { SidebarProfessor } from "@/components/layout/sidebar-professor";
import { HeaderProfessor } from "@/components/layout/header-professor";

export default function LayoutProfessor({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <SidebarProfessor />
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderProfessor />
        <main className="fundo-app flex-1">{children}</main>
      </div>
    </div>
  );
}

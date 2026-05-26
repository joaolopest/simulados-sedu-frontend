import { HeaderAluno } from "@/components/layout/header-aluno";
import { NavInferiorAluno } from "@/components/layout/nav-inferior-aluno";

export default function LayoutAluno({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <HeaderAluno />
      <main className="fundo-app flex-1 pb-20 md:pb-0">{children}</main>
      <NavInferiorAluno />
    </div>
  );
}

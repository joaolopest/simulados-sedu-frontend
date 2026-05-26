// Layout fullscreen pro executar do simulado — sem header, sem nav inferior.
// O componente da página gerencia tudo (cronômetro fixo, autosave, etc.).
export default function LayoutAlunoTelaCheia({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-background">{children}</div>;
}

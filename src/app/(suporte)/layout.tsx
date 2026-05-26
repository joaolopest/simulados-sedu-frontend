import { HeaderSuporte } from "@/components/layout/header-suporte";

export default function LayoutSuporte({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <HeaderSuporte />
      <main className="fundo-app flex-1">{children}</main>
    </div>
  );
}

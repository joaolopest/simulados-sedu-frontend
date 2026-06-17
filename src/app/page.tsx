import { HeaderLanding } from "@/components/landing/header-landing";
import { HeroLanding } from "@/components/landing/hero-landing";
import { ManifestoBlock } from "@/components/landing/manifesto-block";
import { SecaoComoFunciona } from "@/components/landing/secao-como-funciona";
import { SecaoDepoimentos } from "@/components/landing/secao-depoimentos";
import { SecaoDiagnosticoReal } from "@/components/landing/secao-diagnostico-real";
import { SecaoAcessibilidade } from "@/components/landing/secao-acessibilidade";
import { MarqueeEscolas } from "@/components/landing/marquee-escolas";
import { CtaFinal } from "@/components/landing/cta-final";
import { FooterLanding } from "@/components/landing/footer-landing";

export default function PaginaLanding() {
  return (
    <div className="textura-grain bg-marble text-shade transition-colors dark:bg-shade dark:text-marble">
      <HeaderLanding />
      <main className="bg-marble transition-colors dark:bg-shade">
        <HeroLanding />
        <ManifestoBlock />
        <SecaoComoFunciona />
        <SecaoDepoimentos />
        <SecaoDiagnosticoReal />
        <SecaoAcessibilidade />
        <MarqueeEscolas />
        <CtaFinal />
      </main>
      <FooterLanding />
    </div>
  );
}

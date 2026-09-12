import { ScrollExperience } from "@/components/layout/scroll-experience";
import { BackgroundLayer } from "@/components/layout/background-layer";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Hero } from "@/components/sections/hero";
import { CoreSequence } from "@/components/sections/core-sequence";
import { Identity } from "@/components/sections/identity";
import { PortfolioSections } from "@/components/sections/portfolio-sections";

export default function Home() {
  return (
    <ScrollExperience>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <BackgroundLayer />
      <div className="site-content">
        <SiteHeader />
        <main id="main-content" tabIndex={-1}>
          <Hero />
          <Identity />
          <CoreSequence />
          <PortfolioSections />
        </main>
        <SiteFooter />
      </div>
    </ScrollExperience>
  );
}

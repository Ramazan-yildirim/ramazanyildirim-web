import { SectionShell } from "@/components/ui/section-shell";
import { portfolioSections } from "@/data/site";

export function PortfolioSections() {
  return portfolioSections.map(({ description, note, ...section }) => (
    <SectionShell key={section.id} {...section}>
      <p className="section-description">{description}</p>
      <p className="section-note">{note}</p>
    </SectionShell>
  ));
}

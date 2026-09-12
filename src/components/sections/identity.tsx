import { SectionShell } from "@/components/ui/section-shell";

export function Identity() {
  return (
    <SectionShell id="identity" number="01" label="IDENTITY" title="Engineering meets intelligence.">
      <p className="section-description">I’m Ramazan, a Computer Engineer. This is my digital space for AI, software, and intelligent systems.</p>
      <ul className="identity-disciplines" aria-label="Areas of focus">
        <li>Artificial intelligence</li>
        <li>Software engineering</li>
        <li>Intelligent systems</li>
      </ul>
    </SectionShell>
  );
}

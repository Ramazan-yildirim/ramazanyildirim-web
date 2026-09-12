import type { ReactNode } from "react";

import type { SectionId } from "@/data/site";

type SectionShellProps = {
  id: SectionId;
  number: string;
  label: string;
  title: string;
  children: ReactNode;
};

export function SectionShell({ id, number, label, title, children }: SectionShellProps) {
  return (
    <section id={id} data-scroll-section={id} className="content-section page-width" aria-labelledby={`${id}-title`}>
      <p className="section-label eyebrow"><span>{number}</span> / {label}</p>
      <div className="section-body">
        <h2 id={`${id}-title`}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

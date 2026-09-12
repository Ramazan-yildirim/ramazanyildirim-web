import type { ReactNode } from "react";

type SectionShellProps = {
  id: string;
  number: string;
  label: string;
  title: string;
  children: ReactNode;
};

export function SectionShell({ id, number, label, title, children }: SectionShellProps) {
  return (
    <section id={id} className="content-section page-width" aria-labelledby={`${id}-title`}>
      <p className="section-label eyebrow"><span>{number}</span> / {label}</p>
      <div className="section-body">
        <h2 id={`${id}-title`}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

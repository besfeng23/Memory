import type { ReactNode } from "react";

export function SectionCard({ title, description, children }: Readonly<{ title: string; description?: string; children: ReactNode }>) {
  return (
    <section className="section-card">
      <div className="section-card__header">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

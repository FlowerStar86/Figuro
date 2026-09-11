import type { ReactNode } from "react";

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-10 pb-32 md:pb-20">{children}</div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      {eyebrow ? (
        <span className="mb-2 block text-[10px] font-semibold tracking-widest text-accent uppercase">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="text-3xl font-medium tracking-tight text-balance">{title}</h1>
      {description ? (
        <p className="mt-3 max-w-[48ch] text-base text-pretty text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-card p-6 ring-1 ring-border ${className}`}>{children}</div>
  );
}

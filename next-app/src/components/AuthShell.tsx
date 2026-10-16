import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  footer: ReactNode;
  children: ReactNode;
};

export default function AuthShell({ eyebrow, title, description, footer, children }: AuthShellProps) {
  return (
    <main className="authPage">
      <Link className="brand authBrand" href="/">skill<span>barter</span></Link>
      <section className="authCard">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="authIntro">{description}</p>
        {children}
        <p className="authFoot">{footer}</p>
        <Link className="backHome" href="/">← Back to home</Link>
      </section>
    </main>
  );
}

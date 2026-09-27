"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/analizar", label: "Analizar" },
  { href: "/guias", label: "Guías por broker" },
  { href: "/aprender", label: "Aprender" },
  { href: "/mis-carteras", label: "Mis carteras" },
];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] border-b border-line">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg" onClick={() => setOpen(false)}>
          <Logo />
          Invertify
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-full text-sm font-medium transition ${
                path.startsWith(l.href) ? "bg-brand-soft text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/analizar" className="btn btn-primary ml-2 text-sm !py-2">
            Empezar gratis
          </Link>
        </nav>
        <button className="md:hidden p-2" aria-label="Menú" onClick={() => setOpen((o) => !o)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="md:hidden border-t border-line px-4 py-3 flex flex-col gap-1 bg-surface">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="px-3 py-3 rounded-xl hover:bg-surface-2 font-medium">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

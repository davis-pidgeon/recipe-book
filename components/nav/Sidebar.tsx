"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "./tabs";

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-48 shrink-0 border-r border-buttercream bg-card p-4 md:block">
      <h2 className="text-xl text-canyon">Recipe book</h2>
      <nav className="mt-6 flex flex-col gap-2">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-3 py-2 ${
                active ? "bg-buttercream text-ink font-bold" : "text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

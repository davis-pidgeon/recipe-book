"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "./tabs";

export default function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-buttercream bg-card md:hidden">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 py-3 text-center text-sm ${
              active ? "text-canyon font-bold" : "text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

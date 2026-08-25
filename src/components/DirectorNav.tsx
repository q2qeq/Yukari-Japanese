"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/director", label: "홈" },
  { href: "/director/unpaid", label: "미수·알림 현황" },
  { href: "/director/consultations", label: "상담 관리" },
];

export function DirectorNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
      {NAV.map((item) => {
        const active = item.href === "/director" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition-colors ${
              active ? "bg-accent-soft text-accent" : "text-ink-mid hover:bg-surface hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

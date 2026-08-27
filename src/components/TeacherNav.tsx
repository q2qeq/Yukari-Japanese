"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "ホーム" },
  { href: "/students", label: "生徒" },
  { href: "/schedule", label: "時間割" },
  { href: "/classrooms", label: "教室" },
  { href: "/monthly-reports", label: "月次報告" },
];

export function TeacherNav() {
  const pathname = usePathname();

  return (
    <nav className="flex border-b border-line-light">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 text-center py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
              active ? "border-accent text-accent" : "border-transparent text-ink-mid"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

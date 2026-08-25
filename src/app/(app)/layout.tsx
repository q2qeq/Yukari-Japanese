import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logout } from "@/lib/actions/auth-actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex-1 flex flex-col max-w-md w-full mx-auto">
      <header className="flex items-center justify-between px-5 py-4 border-b border-line-light">
        <Link href="/" className="flex flex-col gap-0.5">
          <span className="text-[11px] text-ink-mid">미도리 일본어학원</span>
          <span className="text-[15px] font-bold">{session.name} 선생님</span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="text-[12.5px] text-ink-mid font-semibold px-2 py-1"
          >
            로그아웃
          </button>
        </form>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logout } from "@/lib/actions/auth-actions";
import { DirectorNav } from "@/components/DirectorNav";

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "owner") redirect("/");

  return (
    <div className="flex-1 flex min-h-full bg-surface">
      <aside className="w-[220px] shrink-0 bg-white border-r border-line-light flex flex-col">
        <div className="px-5 py-5 border-b border-line-light">
          <p className="text-[11px] text-ink-mid">미도리 일본어학원</p>
          <p className="text-[15px] font-bold mt-0.5">{session.name} 원장님</p>
        </div>
        <DirectorNav />
        <form action={logout} className="px-3 pb-4">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2.5 text-left text-[13px] text-ink-mid font-semibold hover:bg-surface"
          >
            로그아웃
          </button>
        </form>
      </aside>
      <main className="flex-1 min-w-0 px-8 py-7 max-w-[1100px]">{children}</main>
    </div>
  );
}

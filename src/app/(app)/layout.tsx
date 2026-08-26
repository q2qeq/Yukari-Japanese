import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logout } from "@/lib/actions/auth-actions";
import { TeacherNav } from "@/components/TeacherNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex-1 flex flex-col max-w-md w-full mx-auto">
      <header className="flex items-center justify-between px-5 py-4 border-b border-line-light">
        <Link href="/" className="flex flex-col gap-0.5">
          <span className="text-[11px] text-ink-mid">ゆかり日本語教室</span>
          <span className="text-[15px] font-bold">
            {session.name}先生
          </span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="text-[12.5px] text-ink-mid font-semibold px-2 py-1"
          >
            ログアウト
          </button>
        </form>
      </header>
      <TeacherNav />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <main className="flex-1 flex flex-col justify-center px-6 py-8 max-w-sm w-full mx-auto">
      <div className="flex flex-col gap-1.5 mb-9">
        <p className="text-xs font-semibold tracking-wide uppercase text-ink-mid">
          ゆかり日本語教室
        </p>
        <h1 className="text-2xl font-bold">先生ログイン</h1>
        <p className="text-[13px] text-ink-mid leading-relaxed">
          出席チェックと授業管理のための
          <br />
          先生専用ページです。
        </p>
      </div>
      <LoginForm />
      <p className="text-center text-[11.5px] text-ink-mid/70 mt-8">
        デモアカウント：010-1111-2222 / teacher123
      </p>
    </main>
  );
}

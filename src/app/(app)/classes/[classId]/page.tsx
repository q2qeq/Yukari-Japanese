import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getClassDetail,
  getClassScheduleSlots,
  getClassRoster,
  getEnrollableStudents,
} from "@/lib/queries";
import { dayLabel, hm } from "@/lib/schedule-utils";
import { ClassRoster } from "@/components/ClassRoster";
import { EnrollStudentForm } from "@/components/EnrollStudentForm";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const [cls, session] = await Promise.all([getClassDetail(classId), getSession()]);
  if (!cls) notFound();

  const [slots, roster, enrollable] = await Promise.all([
    getClassScheduleSlots(classId),
    getClassRoster(classId),
    getEnrollableStudents(classId),
  ]);

  const canEdit = !!session && (session.role === "owner" || session.staffId === cls.teacher_id);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-2">
        <Link href="/schedule" aria-label="戻る">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="text-[16.5px] font-bold flex-1">クラス情報</span>
        {canEdit && (
          <Link
            href={`/classes/${classId}/edit`}
            className="text-[12.5px] font-semibold text-accent px-2 py-1"
          >
            編集
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-auto px-5 pb-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1 pt-1">
          <span className="text-[18px] font-bold">{cls.class_name}</span>
          <span className="text-[12.5px] text-ink-mid">
            {cls.level ?? "レベル未指定"} ・{cls.teacher_name}先生 ・定員{cls.capacity}名
          </span>
          {cls.status === "archived" && (
            <span className="w-fit rounded-full bg-surface text-ink-mid text-[10.5px] font-semibold px-2 py-0.5">
              保管済み（運営終了したクラス）
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-ink-mid uppercase tracking-wide">
            曜日・時間
          </span>
          <div className="flex flex-col gap-1.5">
            {slots.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 text-[13px]">
                <span className="font-semibold w-12">{dayLabel(s.day_of_week)}曜日</span>
                <span className="font-mono text-ink-mid">
                  {hm(s.start_time)}–{hm(s.end_time)}
                </span>
              </div>
            ))}
          </div>
          <span className="text-[12.5px] text-ink-mid">
            教室：{cls.classroom_name ?? "未指定"}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-semibold text-ink-mid uppercase tracking-wide">
            登録生徒（{roster.length}名）
          </span>
          <ClassRoster classId={classId} initialRoster={roster} />
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-semibold text-ink-mid uppercase tracking-wide">
            生徒登録
          </span>
          <EnrollStudentForm classId={classId} students={enrollable} />
        </div>
      </div>
    </div>
  );
}

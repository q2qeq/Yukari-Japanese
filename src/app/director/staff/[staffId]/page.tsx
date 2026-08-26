import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getStaffForEdit,
  getClassesForStaff,
  getScheduleSlotsForStaffClasses,
  getRosterForStaffClasses,
} from "@/lib/director-queries";
import { dayLabel, hm } from "@/lib/schedule-utils";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ staffId: string }>;
}) {
  const { staffId } = await params;
  const staff = await getStaffForEdit(staffId);
  if (!staff) notFound();

  const [classes, slots, roster] = await Promise.all([
    getClassesForStaff(staffId),
    getScheduleSlotsForStaffClasses(staffId),
    getRosterForStaffClasses(staffId),
  ]);

  const studentCount = new Set(roster.map((r) => r.student_id)).size;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold">
            {staff.name}先生
          </h1>
          <p className="text-[13px] text-ink-mid mt-1">
            {staff.phone} ・担当クラス{classes.length}件 ・生徒{studentCount}名
          </p>
        </div>
        <Link
          href={`/director/staff/${staffId}/edit`}
          className="rounded-lg border border-line text-ink text-[13.5px] font-semibold px-4 py-2.5"
        >
          情報編集
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-line-light py-14 text-center text-[13px] text-ink-mid">
          担当しているクラスがありません。
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {classes.map((c) => {
            const classSlots = slots.filter((s) => s.class_id === c.class_id);
            const students = roster.filter((r) => r.class_id === c.class_id);
            return (
              <div
                key={c.class_id}
                className="bg-white rounded-2xl border border-line-light p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/classes/${c.class_id}`}
                      className="text-[15px] font-bold hover:text-accent"
                    >
                      {c.class_name}
                    </Link>
                    <span className="text-[12px] text-ink-mid">
                      {c.level ?? "レベル未指定"}
                      {c.classroom_name ? ` ・${c.classroom_name}` : ""}
                    </span>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {classSlots.map((s, i) => (
                        <span key={i} className="font-mono text-[11.5px] text-ink-mid">
                          {dayLabel(s.day_of_week)} {hm(s.start_time)}–{hm(s.end_time)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 text-[12.5px] text-ink-mid">生徒{students.length}名</span>
                </div>
                {students.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-line-light">
                    {students.map((s) => (
                      <Link
                        key={s.student_id}
                        href={`/students/${s.student_id}`}
                        className="rounded-full bg-surface hover:bg-accent-soft hover:text-accent px-3 py-1 text-[12px] font-semibold mt-2.5"
                      >
                        {s.student_name}
                        {s.remaining_sessions !== null && s.remaining_sessions <= 0 && (
                          <span className="text-critical"> ・未払い</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

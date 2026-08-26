"use client";

import Link from "next/link";
import { useState } from "react";
import { DAY_LABELS, DAY_ORDER, dayLabel, hm } from "@/lib/schedule-utils";

export type ScheduleGridRow = {
  class_id: string;
  class_name: string;
  level?: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  teacher_name?: string;
  classroom_name?: string | null;
  enrolled_count?: number;
};

function todayDayOfWeek(): number {
  return new Date().getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 요일별로 반을 보여주는 시간표. 선생님 개인 시간표, 원장의 전체 시간표,
 * 강의실별 시간표에서 공통으로 쓴다.
 *
 * 넓은 화면(원장 데스크톱 대시보드)에서는 요일 7칸을 한 번에 보여주는 그리드로,
 * 좁은 화면(선생님 모바일 앱)에서는 가로 슬라이드 없이 요일 탭 + 세로 카드 목록으로
 * 보여준다. 뷰포트가 아니라 이 컴포넌트가 실제로 차지하는 폭을 기준으로 전환한다
 * (@container) — 선생님 앱은 데스크톱 브라우저로 열어도 가운데 좁은 폭(max-w-md)
 * 으로 렌더링되기 때문에, 뷰포트 기준 브레이크포인트를 쓰면 넓은 화면에서도
 * 다시 가로 스크롤 그리드가 나와버린다.
 *
 * "요일별" / "달력" 두 가지 보기 모드를 토글로 제공한다. 데이터는 여전히
 * day_of_week(요일) 기준 주간 반복 스케줄 그대로이고 — 달력은 그 데이터를
 * 실제 날짜 위에 얹어서 더 보기 좋게 보여주는 것뿐, 특정 날짜에만 다른 반이
 * 열리는 예외(휴강 등)는 반영하지 않는다. 기본값은 기존과 동일한 "요일별".
 */
export function WeeklyScheduleGrid({
  rows,
  showTeacher = false,
  showClassroom = false,
  emptyMessage = "登録された時間割がありません。",
}: {
  rows: ScheduleGridRow[];
  showTeacher?: boolean;
  showClassroom?: boolean;
  emptyMessage?: string;
}) {
  const [viewMode, setViewMode] = useState<"day" | "calendar">("day");
  const today = todayDayOfWeek();
  const [selectedDay, setSelectedDay] = useState<number>(
    DAY_ORDER.includes(today) ? today : DAY_ORDER[0],
  );

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-line-light py-14 text-center text-[13px] text-ink-mid">
        {emptyMessage}
      </div>
    );
  }

  function rowsForDay(day: number) {
    return rows
      .filter((r) => r.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  const selectedDayRows = rowsForDay(selectedDay);

  return (
    <div className="@container flex flex-col gap-3">
      <div className="flex gap-1 rounded-xl bg-surface p-1 self-start">
        {(
          [
            ["day", "曜日別"],
            ["calendar", "カレンダー"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`rounded-lg px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
              viewMode === mode ? "bg-white text-accent shadow-sm" : "text-ink-mid"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {viewMode === "calendar" ? (
        <ScheduleMonthCalendar
          rows={rows}
          showTeacher={showTeacher}
          showClassroom={showClassroom}
        />
      ) : (
        <>
          {/* 좁은 화면: 요일 탭 + 세로 카드 목록 */}
          <div className="@3xl:hidden flex flex-col gap-3">
            <div className="flex gap-1 rounded-xl bg-surface p-1">
              {DAY_ORDER.map((day) => {
                const count = rowsForDay(day).length;
                const active = day === selectedDay;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`relative flex-1 rounded-lg py-2 text-[12.5px] font-bold transition-colors ${
                      active ? "bg-white text-accent shadow-sm" : "text-ink-mid"
                    }`}
                  >
                    {dayLabel(day)}
                    {day === today && (
                      <span className="absolute top-0.5 right-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
                    )}
                    <span className="block text-[9.5px] font-semibold text-ink-mid/60 mt-0.5">
                      {count > 0 ? count : "-"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2.5">
              {selectedDayRows.length === 0 && (
                <div className="rounded-xl border border-line-light py-10 text-center text-[12.5px] text-ink-mid">
                  {dayLabel(selectedDay)}曜日はクラスがありません。
                </div>
              )}
              {selectedDayRows.map((r, i) => (
                <Link
                  key={`${r.class_id}-${selectedDay}-${i}`}
                  href={`/classes/${r.class_id}`}
                  className="rounded-xl border border-line-light bg-white p-3.5 flex items-center gap-3 hover:border-accent transition-colors"
                >
                  <div className="flex flex-col items-center justify-center w-16 shrink-0 font-mono text-[11.5px] text-ink-mid leading-tight">
                    <span>{hm(r.start_time)}</span>
                    <span className="text-ink-mid/50">–</span>
                    <span>{hm(r.end_time)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[14px] font-bold leading-tight truncate">{r.class_name}</span>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-mid">
                      {r.level && <span>{r.level}</span>}
                      {showTeacher && r.teacher_name && (
                        <span className="text-accent font-semibold">{r.teacher_name}先生</span>
                      )}
                      {showClassroom && <span>{r.classroom_name ?? "教室未指定"}</span>}
                      {typeof r.enrolled_count === "number" && <span>生徒{r.enrolled_count}名</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 넓은 화면: 요일 7칸 그리드 */}
          <div className="hidden @3xl:grid grid-cols-7 gap-3">
            {DAY_ORDER.map((day) => {
              const dayRows = rowsForDay(day);
              return (
                <div key={day} className="flex flex-col gap-2 min-w-0">
                  <div className="text-center text-[12.5px] font-bold text-ink-mid pb-1 border-b border-line-light">
                    {dayLabel(day)}曜日
                    {day === today && (
                      <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {dayRows.length === 0 && (
                      <p className="text-center text-[11px] text-ink-mid/60 py-3">-</p>
                    )}
                    {dayRows.map((r, i) => (
                      <Link
                        key={`${r.class_id}-${day}-${i}`}
                        href={`/classes/${r.class_id}`}
                        className="rounded-xl border border-line-light bg-white p-2.5 flex flex-col gap-1 hover:border-accent transition-colors"
                      >
                        <span className="font-mono text-[11px] text-ink-mid">
                          {hm(r.start_time)}–{hm(r.end_time)}
                        </span>
                        <span className="text-[12.5px] font-bold leading-tight">{r.class_name}</span>
                        {r.level && <span className="text-[10.5px] text-ink-mid">{r.level}</span>}
                        {showTeacher && r.teacher_name && (
                          <span className="text-[10.5px] text-accent font-semibold">
                            {r.teacher_name}先生
                          </span>
                        )}
                        {showClassroom && (
                          <span className="text-[10.5px] text-ink-mid">
                            {r.classroom_name ?? "教室未指定"}
                          </span>
                        )}
                        {typeof r.enrolled_count === "number" && (
                          <span className="text-[10.5px] text-ink-mid">生徒{r.enrolled_count}名</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 요일 기반 반복 스케줄(rows)을 실제 달력 위에 얹어서 보여주는 월간 달력.
 * 날짜를 클릭하면 그 날(요일)에 해당하는 반 목록을 아래에 카드로 보여준다.
 * 좁은/넓은 화면 모두에서 같은 레이아웃을 쓴다(달력 자체가 이미 컴팩트해서
 * 요일 그리드처럼 별도의 좁은 화면 전용 레이아웃이 필요 없다).
 */
function ScheduleMonthCalendar({
  rows,
  showTeacher,
  showClassroom,
}: {
  rows: ScheduleGridRow[];
  showTeacher: boolean;
  showClassroom: boolean;
}) {
  const todayDate = startOfToday();
  const [cursor, setCursor] = useState<Date>(
    () => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<Date>(() => todayDate);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  function rowsForDow(dow: number) {
    return rows
      .filter((r) => r.day_of_week === dow)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  function goToMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setCursor(next);
    setSelectedDate(next);
  }

  function goToToday() {
    setCursor(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
    setSelectedDate(todayDate);
  }

  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
  const cells: Date[] = Array.from(
    { length: 42 },
    (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i),
  );

  const selectedRows = rowsForDow(selectedDate.getDay());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          aria-label="前の月"
          className="h-7 w-7 flex items-center justify-center rounded-lg text-ink-mid hover:bg-surface text-[14px]"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goToToday}
          className="text-[14px] font-bold hover:text-accent transition-colors"
        >
          {year}年{month + 1}月
        </button>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          aria-label="次の月"
          className="h-7 w-7 flex items-center justify-center rounded-lg text-ink-mid hover:bg-surface text-[14px]"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7">
        {DAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[10.5px] font-bold pb-1.5 text-ink-mid">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          const inMonth = date.getMonth() === month;
          const dow = date.getDay();
          const dayRows = rowsForDow(dow);
          const isToday = isSameDay(date, todayDate);
          const isSelected = isSameDay(date, selectedDate);
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDate(date)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-[12px] transition-colors ${
                isSelected
                  ? "bg-accent text-white font-bold"
                  : isToday
                    ? "bg-surface font-bold"
                    : "hover:bg-surface"
              } ${!inMonth && !isSelected ? "text-ink-mid/30" : ""}`}
            >
              <span>{date.getDate()}</span>
              {dayRows.length > 0 && (
                <span
                  className={`h-1 w-1 rounded-full ${isSelected ? "bg-white" : "bg-accent"} ${!inMonth ? "opacity-40" : ""}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5 pt-2 border-t border-line-light">
        <p className="text-[12.5px] font-bold text-ink-mid">
          {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日（{dayLabel(selectedDate.getDay())}）授業{" "}
          {selectedRows.length}件
        </p>
        {selectedRows.length === 0 && (
          <div className="rounded-xl border border-line-light py-10 text-center text-[12.5px] text-ink-mid">
            {dayLabel(selectedDate.getDay())}曜日はクラスがありません。
          </div>
        )}
        {selectedRows.map((r, i) => (
          <Link
            key={`${r.class_id}-cal-${i}`}
            href={`/classes/${r.class_id}`}
            className="rounded-xl border border-line-light bg-white p-3.5 flex items-center gap-3 hover:border-accent transition-colors"
          >
            <div className="flex flex-col items-center justify-center w-16 shrink-0 font-mono text-[11.5px] text-ink-mid leading-tight">
              <span>{hm(r.start_time)}</span>
              <span className="text-ink-mid/50">–</span>
              <span>{hm(r.end_time)}</span>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[14px] font-bold leading-tight truncate">{r.class_name}</span>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-mid">
                {r.level && <span>{r.level}</span>}
                {showTeacher && r.teacher_name && (
                  <span className="text-accent font-semibold">{r.teacher_name}先生</span>
                )}
                {showClassroom && <span>{r.classroom_name ?? "教室未指定"}</span>}
                {typeof r.enrolled_count === "number" && <span>生徒{r.enrolled_count}名</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getRescheduleRequestsForTeacher } from "@/lib/queries";
import { RescheduleManager } from "@/components/RescheduleManager";

export default async function ReschedulePage() {
  const session = await getSession();
  const requests = await getRescheduleRequestsForTeacher(session!.staffId);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-3.5">
        <Link href="/" aria-label="뒤로">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="text-[16.5px] font-bold">연기 요청 관리</span>
      </div>

      <div className="flex-1 overflow-auto px-5 pb-6">
        <RescheduleManager initialRows={requests} />
      </div>
    </div>
  );
}

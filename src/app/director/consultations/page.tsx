import { getConsultations } from "@/lib/director-queries";
import { listActiveTeachers } from "@/lib/queries";
import { NewConsultationForm } from "@/components/NewConsultationForm";
import { ConsultationBoard } from "@/components/ConsultationBoard";

export default async function ConsultationManagementPage() {
  const [consultations, teachers] = await Promise.all([getConsultations(), listActiveTeachers()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold">相談管理</h1>
          <p className="text-[13px] text-ink-mid mt-1">
            新規相談から登録完了まで段階別に管理できます。
          </p>
        </div>
      </div>

      <NewConsultationForm />

      {consultations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-line-light py-16 text-center text-[13px] text-ink-mid">
          登録された相談がありません。上から新規相談を登録してみましょう。
        </div>
      ) : (
        <ConsultationBoard initialRows={consultations} teachers={teachers} />
      )}
    </div>
  );
}

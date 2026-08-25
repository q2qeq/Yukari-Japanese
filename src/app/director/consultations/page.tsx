import { getConsultations } from "@/lib/director-queries";
import { NewConsultationForm } from "@/components/NewConsultationForm";
import { ConsultationBoard } from "@/components/ConsultationBoard";

export default async function ConsultationManagementPage() {
  const consultations = await getConsultations();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold">상담 관리</h1>
          <p className="text-[13px] text-ink-mid mt-1">
            신규 상담부터 등록 완료까지 단계별로 관리해요.
          </p>
        </div>
      </div>

      <NewConsultationForm />

      {consultations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-line-light py-16 text-center text-[13px] text-ink-mid">
          등록된 상담이 없어요. 위에서 신규 상담을 등록해보세요.
        </div>
      ) : (
        <ConsultationBoard initialRows={consultations} />
      )}
    </div>
  );
}

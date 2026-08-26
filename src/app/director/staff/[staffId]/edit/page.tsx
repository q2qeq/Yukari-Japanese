import { notFound } from "next/navigation";
import { getStaffForEdit } from "@/lib/director-queries";
import { StaffForm } from "@/components/StaffForm";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ staffId: string }>;
}) {
  const { staffId } = await params;
  const staff = await getStaffForEdit(staffId);
  if (!staff) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[22px] font-bold">先生情報編集</h1>
      <StaffForm mode="edit" staffId={staffId} initial={staff} />
    </div>
  );
}

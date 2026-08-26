import { StaffForm } from "@/components/StaffForm";

export default function NewStaffPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[22px] font-bold">先生を追加</h1>
      <StaffForm mode="create" />
    </div>
  );
}

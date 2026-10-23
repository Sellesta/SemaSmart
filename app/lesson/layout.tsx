import { SchoolRenewalNotice } from "@/components/school-renewal-notice";
import { requireSchoolAccess } from "@/lib/requireSchoolAccess";

type Props = {
  children: React.ReactNode;
};

const LessonLayout = async ({ children }: Props) => {
  const access = await requireSchoolAccess();

  return (
    <>
      {access.showRenewalNotice && <SchoolRenewalNotice />}
      <div className="felx flex-col h-full">
        <div className="flex flex-col h-full w-full">{children}</div>
      </div>
    </>
  );
};

export default LessonLayout;

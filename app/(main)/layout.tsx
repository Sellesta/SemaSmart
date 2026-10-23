import { MobileHeader } from "@/components/mobile-header";
import { SchoolRenewalNotice } from "@/components/school-renewal-notice";
import { Sidebar } from "@/components/sidebar";
import { requireSchoolAccess } from "@/lib/requireSchoolAccess";

type Props = { 
  children: React.ReactNode;
};

const MainLayout = async ({ children }: Props) => {
  const access = await requireSchoolAccess();

  return (
    <>
      <MobileHeader />
      <Sidebar className="hidden lg:flex" />
      <main className="lg:pl-[256px] h-full pt-[50px] lg:pt-0">
        {access.showRenewalNotice && <SchoolRenewalNotice />}
        <div className="max-w-[1056px] mx-auto pt-6 h-full">{children}</div>
      </main>
    </>
  );
};

export default MainLayout;

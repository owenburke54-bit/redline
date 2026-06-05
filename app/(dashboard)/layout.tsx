import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingCoachButton } from "@/components/coach/FloatingCoachButton";
import { MobilePreview } from "@/components/dev/MobilePreview";
import { MobileHeader } from "@/components/layout/MobileHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id as string },
    select: { onboardingComplete: true },
  });

  if (!user?.onboardingComplete) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userName={session.user?.name} />
      <MobileHeader />
      <main className="flex-1 overflow-y-auto p-4 pt-16 pb-24 md:pt-8 md:p-8 md:pb-8 lg:p-10 animate-page-in">{children}</main>
      <FloatingCoachButton />
      <MobilePreview />
    </div>
  );
}

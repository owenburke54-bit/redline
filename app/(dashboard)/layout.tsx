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

  const userId = session.user.id as string;
  const [user, hyroxEvent, profile] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { onboardingComplete: true } }),
    db.event.findFirst({
      where: {
        userId,
        isActive: true,
        type: { in: ["HYROX", "HYROX_WOMENS", "HYROX_DOUBLES", "HYROX_DOUBLES_MIXED", "HYROX_DOUBLES_MENS", "HYROX_DOUBLES_WOMENS"] },
        date: { gte: new Date() },
      },
      select: { id: true },
    }),
    db.athleteProfile.findUnique({ where: { userId }, select: { showHyroxTab: true } }),
  ]);

  if (!user?.onboardingComplete) redirect("/onboarding");

  const showHyroxTab = !!hyroxEvent && (profile?.showHyroxTab ?? true);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userName={session.user?.name} showHyroxTab={showHyroxTab} />
      <MobileHeader />
      <main className="flex-1 overflow-y-auto p-4 pt-16 pb-24 md:pt-8 md:p-8 md:pb-8 lg:p-10 animate-page-in">{children}</main>
      <FloatingCoachButton />
      <MobilePreview />
    </div>
  );
}

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "./OnboardingFlow";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id as string },
    select: { onboardingComplete: true },
  });

  if (user?.onboardingComplete) redirect("/");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <OnboardingFlow userId={session.user!.id as string} userName={session.user?.name} />
    </div>
  );
}

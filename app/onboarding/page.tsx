import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "./OnboardingFlow";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <OnboardingFlow userId={session.user!.id as string} userName={session.user?.name} />
    </div>
  );
}

import { MessageSquare } from "lucide-react";

export default function CoachPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-24">
      <MessageSquare className="h-10 w-10 text-muted-foreground mb-4" />
      <h1 className="text-xl font-bold mb-2">AI Coach</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        Your AI coach is coming soon. It will analyse your training, answer questions, and adjust your plan in real time.
      </p>
    </div>
  );
}

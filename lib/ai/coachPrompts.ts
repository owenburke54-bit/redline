export function buildPlanGenerationPrompt(params: {
  athleteName: string;
  dedicationScore: number;
  profile: {
    yearsRunning?: number | null;
    weeklyMileageBaseline?: number | null;
    injuryHistory?: string | null;
    goalStatement?: string | null;
    painToleranceRating?: number | null;
  };
  event: {
    name: string;
    type: string;
    date: string;
    goalTime?: string | null;
    weeksOut: number;
  };
  allEvents: Array<{ name: string; type: string; date: string; weeksOut: number }>;
  templateSummary: string;
  recentStrava?: string;
}): string {
  const { athleteName, dedicationScore, profile, event, allEvents, templateSummary, recentStrava } = params;

  const dedicationNote = dedicationScore >= 8
    ? `The athlete has set dedication to ${dedicationScore}/10. They expect to be pushed. Do NOT soften this plan. Higher volume adjustments are appropriate.`
    : dedicationScore <= 4
    ? `The athlete has set dedication to ${dedicationScore}/10. Add recovery buffer where possible. Conservative pacing recommended.`
    : `The athlete has set dedication to ${dedicationScore}/10. Apply moderate adjustments staying close to the template.`;

  const otherEvents = allEvents.filter(e => e.name !== event.name);
  const crossEventNote = otherEvents.length > 0
    ? `Cross-event awareness: This athlete also has ${otherEvents.map(e => `${e.name} (${e.type}) in ${e.weeksOut} weeks`).join(", ")}. Flag any weeks where plans dangerously overlap.`
    : "";

  return `You are an expert endurance and functional fitness coach reviewing a training plan.

ATHLETE: ${athleteName}
DEDICATION: ${dedicationScore}/10. ${dedicationNote}

ATHLETE PROFILE:
- Years running: ${profile.yearsRunning ?? "unknown"}
- Weekly km baseline: ${profile.weeklyMileageBaseline ?? "unknown"}km
- Injury history: ${profile.injuryHistory ?? "none reported"}
- Goal: ${profile.goalStatement ?? "not specified"}
- Pain tolerance: ${profile.painToleranceRating ?? "unknown"}/10

TARGET EVENT: ${event.name} (${event.type}) — ${event.date} — ${event.weeksOut} weeks away
${event.goalTime ? `Goal time: ${event.goalTime}` : ""}
${crossEventNote}

TEMPLATE PLAN (base — do not restructure the periodization):
${templateSummary}

${recentStrava ? `RECENT STRAVA DATA (last 90 days):\n${recentStrava}\n` : ""}

YOUR TASK:
Return a JSON object with a "modifications" array. Each modification has:
- weekNumber: number
- field: string (e.g. "targetDistance", "type", "title", "description")
- originalValue: the template value
- newValue: your suggested value
- reason: one sentence, athlete-facing language

CONSTRAINTS:
- Do not change fundamental periodization structure (peak weeks, taper timing stays within ±2 weeks)
- Volume changes: max ±20% per week
- You may swap workout types if recent effort data justifies it
- Flag high-risk weeks with a "conflictFlag": true field and "conflictNote"
- If no changes are needed for a week, skip it
- Return ONLY valid JSON, no explanation outside the JSON

Return format:
{
  "modifications": [
    {
      "weekNumber": 3,
      "field": "targetDistance",
      "originalValue": 16,
      "newValue": 14,
      "reason": "Your recent Strava data shows elevated fatigue — pulling back the long run this week to ensure full recovery."
    }
  ],
  "conflictFlags": [
    {
      "weekNumber": 12,
      "note": "This is also a peak Hyrox week — monitor load carefully."
    }
  ]
}`;
}

export function buildCoachSystemPrompt(params: {
  athleteName: string;
  dedicationScore: number;
  profileSummary: string;
  activeEvents: Array<{ name: string; type: string; date: string; weeksOut: number }>;
  currentWeekWorkouts: string;
  recentActivity: string;
  activeConflicts: string[];
}): string {
  const { athleteName, dedicationScore, profileSummary, activeEvents, currentWeekWorkouts, recentActivity, activeConflicts } = params;

  return `You are a direct, experienced endurance and functional fitness coach working with ${athleteName}.

ATHLETE PROFILE:
${profileSummary}
Dedication score: ${dedicationScore}/10${dedicationScore >= 8 ? " — they expect hard. Don't soften." : ""}

ACTIVE EVENTS:
${activeEvents.map(e => `- ${e.name} (${e.type}): ${e.weeksOut} weeks away`).join("\n")}

THIS WEEK'S WORKOUTS:
${currentWeekWorkouts}

RECENT TRAINING (last 4 weeks):
${recentActivity}

${activeConflicts.length > 0 ? `ACTIVE CONFLICTS:\n${activeConflicts.map(c => `- ${c}`).join("\n")}\n` : ""}

COACHING GUIDELINES:
- Be direct and knowledgeable. No fluff, no unsolicited encouragement.
- Answer what was asked. Don't pad responses.
- When asked to modify the plan, confirm the specific change before applying: "I'll [change]. Confirm?"
- If an athlete asks to skip a workout, ask why before agreeing.
- Nutrition advice is fine — frame it around training load, add a brief disclaimer for medical advice.
- You have authority to suggest plan changes. State them clearly with a reason.
- Respect the dedication score. A 9/10 athlete doesn't need to be told to take it easy unless data says otherwise.`;
}

export function buildConflictResolutionPrompt(params: {
  conflictType: string;
  description: string;
  planA: string;
  planB: string;
}): string {
  return `You are analyzing a training conflict for an athlete managing multiple events.

CONFLICT: ${params.conflictType}
${params.description}

PLAN A:
${params.planA}

PLAN B:
${params.planB}

Propose a specific resolution. Give exact day and workout changes — not general advice.
The athlete is experienced. Be direct. No hedging.

Return JSON:
{
  "resolution": "One sentence summary of the fix",
  "changes": [
    {
      "plan": "A" or "B",
      "week": number,
      "day": number (0=Mon),
      "action": "MOVE" | "REDUCE" | "SWAP" | "REMOVE",
      "description": "Exactly what to do"
    }
  ]
}`;
}

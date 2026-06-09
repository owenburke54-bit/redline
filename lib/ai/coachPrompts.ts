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

interface AthleteModelSnapshot {
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  rpeAvg7d: number | null;
  rpeAvg28d: number | null;
  complianceRate28d: number | null;
  avgWeeklyMiles: number | null;
  avgRecovery7d: number | null;
  weaknesses: string[];
  injuryRiskFlag: boolean;
  injuryRiskNote: string | null;
  dataConfidence: number;
  lastComputedAt: Date;
}

function interpretCTL(ctl: number): string {
  if (ctl >= 70) return "high fitness base";
  if (ctl >= 50) return "solid aerobic base";
  if (ctl >= 30) return "moderate base, building phase";
  return "low base — early training or returning from break";
}

function interpretTSB(tsb: number): string {
  if (tsb > 10) return "fresh — undertapered or resting";
  if (tsb >= -10) return "balanced load";
  if (tsb >= -30) return "normal training fatigue";
  return "HIGH FATIGUE — consider recovery";
}

function buildAthleteModelSection(model: AthleteModelSnapshot | null): string {
  if (!model) return "";
  const ageH = Math.round((Date.now() - model.lastComputedAt.getTime()) / 3_600_000);
  const freshness = ageH < 24 ? `${ageH}h ago` : `${Math.round(ageH / 24)}d ago`;
  const lines: string[] = [`ATHLETE FITNESS MODEL (computed ${freshness}):`];
  if (model.ctl != null)
    lines.push(`Chronic Fitness (CTL): ${model.ctl.toFixed(1)} — ${interpretCTL(model.ctl)}`);
  if (model.tsb != null)
    lines.push(`Freshness (TSB): ${model.tsb.toFixed(1)} — ${interpretTSB(model.tsb)}`);
  if (model.rpeAvg7d != null) lines.push(`Avg RPE this week: ${model.rpeAvg7d.toFixed(1)}/10`);
  if (model.rpeAvg28d != null) lines.push(`Avg RPE last 28d: ${model.rpeAvg28d.toFixed(1)}/10`);
  if (model.complianceRate28d != null)
    lines.push(`Compliance last 28d: ${Math.round(model.complianceRate28d * 100)}%`);
  if (model.avgWeeklyMiles != null)
    lines.push(`Avg weekly miles: ${model.avgWeeklyMiles.toFixed(1)}mi`);
  if (model.weaknesses.length > 0)
    lines.push(`Identified weaknesses: ${model.weaknesses.join(", ")}`);
  if (model.injuryRiskFlag)
    lines.push(`⚠ INJURY RISK ELEVATED: ${model.injuryRiskNote}`);
  if (model.dataConfidence < 0.3)
    lines.push(`Data confidence: LOW (${Math.round(model.dataConfidence * 100)}%) — limited history`);
  return lines.join("\n");
}

interface AdaptationContext {
  adaptationType: string;
  severity: string;
  triggerSignals: string[];
  weekRange: { from: number; to: number };
  workoutsModified: number;
  coachSummary: string;
  appliedAt: string;
}

export function buildCoachSystemPrompt(params: {
  athleteName: string;
  dedicationScore: number;
  profileSummary: string;
  activeEvents: Array<{ name: string; type: string; date: string; weeksOut: number; goalTime?: string | null }>;
  currentWeekWorkouts: string;
  recentActivity: string;
  whoopContext: string;
  stravaZoneContext?: string;
  activeConflicts: string[];
  classSchedule?: { studios: { id: string; name: string; days: number[] }[] } | null;
  currentDate?: string;
  athleteModel?: AthleteModelSnapshot | null;
  recentAdaptation?: AdaptationContext | null;
  hyroxStationScores?: Record<string, number> | null;
  recentTraining?: {
    completedWorkouts: Array<{
      date: string;
      type: string;
      plannedDistance: number | null;
      actualDistance: number | null;
      rpe: number | null;
      perceivedDifficulty: string | null;
      status: string;
      hasNote: boolean;
      coachingCues: string | null;
    }>;
    compliancePct: number;
    flaggedSessions: string[];
    whoopTrend: Array<{ date: string; score: number; hrv: number | null }>;
  };
}): string {
  const { athleteName, dedicationScore, profileSummary, activeEvents, currentWeekWorkouts, recentActivity, whoopContext, stravaZoneContext, activeConflicts, classSchedule, currentDate, athleteModel, recentAdaptation, hyroxStationScores, recentTraining } = params;

  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const classScheduleNote = classSchedule?.studios && classSchedule.studios.length > 0
    ? `STUDIO CLASS SCHEDULE:\n${classSchedule.studios.map(s =>
        `- ${s.name}: ${s.days.length > 0 ? s.days.map(d => DAY_NAMES[d]).join(", ") : "days not set"}`
      ).join("\n")}\nTreat studio class days as additional training load. Barry's counts as a hard run day. OrangeTheory HYROX and Backyard Boston count as hard functional fitness days. Do not stack another hard session on these days.`
    : "";

  const eventTypes = activeEvents.map(e => e.type);
  const hasMarathon = eventTypes.some(t => t === "MARATHON");
  const hasHalfMarathon = eventTypes.some(t => t === "HALF_MARATHON");
  const hasUltra = eventTypes.some(t => t === "ULTRA_50K" || t === "ULTRA_50M");
  const hasHyrox = eventTypes.some(t => t.startsWith("HYROX"));
  const hasTriathlon = eventTypes.some(t => ["TRIATHLON_SPRINT","TRIATHLON_OLYMPIC","HALF_IRONMAN","IRONMAN"].includes(t));
  const hasRunEvent = hasMarathon || hasHalfMarathon || eventTypes.some(t => t === "FIVE_K" || t === "TEN_K");

  const trainingZoneSystem = `
TRAINING ZONE SYSTEM (Jack Daniels, 5-Zone Model):
- Zone 1 (Recovery): <65% HRmax. Walking, very easy jog. Use after hard efforts.
- Zone 2 (Aerobic/Easy): 65-75% HRmax. Fully conversational — complete sentences. This is where 80% of all training volume should live (Seiler, 2010 — 80/20 polarized model). Builds mitochondrial density, fat oxidation, aerobic base. Most athletes run this too fast.
- Zone 3 (Aerobic Threshold/Moderate): 75-82% HRmax. Marathon race effort for most trained athletes. Sustainable for hours. Avoid living here — it's too hard to recover from, too easy to build fitness.
- Zone 4 (Lactate Threshold): 82-89% HRmax. 20-30 sec/mi faster than marathon pace. Can speak in 2-3 word phrases. 20-40min continuous or cruise intervals. The highest-return workout type for endurance athletes (Daniels, 2014).
- Zone 5 (VO2max): 90-95% HRmax. 5K race effort. Can only sustain 4-8 minutes continuously. Track intervals, hill repeats. Raises aerobic ceiling. Requires 48hr+ recovery.
When the athlete asks about pacing, use their Strava-derived zones if available. Otherwise use these percent-of-HRmax ranges.`;

  const runningRaceStrategy = hasRunEvent || hasMarathon || hasHalfMarathon ? `
RUNNING RACE STRATEGY:
- 5K/10K: Even splits or slight negative split. First mile restraint is the #1 differentiator. Target Zone 4-5.
- Half Marathon: Negative split approach — go through 10K at 5-10sec/mi slower than goal HM pace. Miles 8-10 are where most athletes blow up. Zone 3-4 effort.
- Marathon: The cardinal rule — never run a positive split in training or racing. Run by effort in miles 1-8, then by pace 8-18, then all-in for the final 8. Fueling: 60-90g carb/hour, gel every 30-45min, don't skip aid stations. Bonking is always a nutrition error.
- Pacing guidance: For every degree above 60°F at race start, add 20-30sec/mile to goal pace (temperature-adjusted pacing). Humidity above 60% compounds heat stress significantly.` : "";

  const ultraStrategy = hasUltra ? `
ULTRA MARATHON STRATEGY:
- 80%+ of training miles should be Zone 2 or below. Pace is irrelevant — effort and time on feet are the metrics.
- Hike/run technique: Power hike all climbs over 8-10% grade. This is faster than running over 31+ miles.
- Nutrition in ultras: 200-300 calories/hour from mile 4 onward. Real food (PB sandwiches, boiled potatoes with salt, bananas) is more GI-stable than gels beyond 3 hours.
- Back-to-back long runs are the most race-specific ultra training. Saturday's run should end feeling worked; Sunday's run should be completed on tired legs at Zone 2.
- Quad conditioning: Eccentric loading (step-down negatives, downhill running) must be trained specifically — unprepared quads are the #1 DNF cause in ultras.
- Cutoff management: Know the course cutoffs. If the athlete races to finish (not to time), coach accordingly.` : "";

  const hyroxStrategy = hasHyrox ? `
HYROX RACE STRATEGY AND STATION COACHING:
HYROX is 8km of running split by 8 functional stations — the run fitness matters as much as station strength.
Station-specific guidance:
- SkiErg (1,000m): Rate 24-26 strokes/min. Drive with the hips and lats, not the arms. Pace: sustainable breathing — not a sprint.
- Sled Push (50m × 2): Load is 102kg (M) / 82kg (F) individual. Stay low, drive with glutes and legs. If you're running it, the weight is manageable — steady cadence wins.
- Sled Pull (50m × 2): Lean back, use hamstrings and glutes. Maintain grip — chalk is legal.
- Burpee Broad Jumps (80m): The most aerobically taxing station. Set a rhythm — don't go out hard. Consistent rep rate matters more than individual rep pace.
- Rowing (1,000m): Drive with the legs (80%), not the arms. Rate 22-24. First 500m controlled, negative split to the finish.
- Farmers Carry (200m): Two 24kg kettlebells each hand (M individual). Grip and core. Walk fast, don't run — running causes more grip fatigue without significant time gain.
- Sandbag Lunges (100m): 20kg sandbag on shoulders. Keep torso upright, full range of motion. Quad fatigue here directly affects the final runs.
- Wall Balls (100 reps): 6kg (M), 4kg (F). Set a rep rhythm: 10 reps, brief pause, 10 reps. Don't fail reps — failed reps are wasted energy.
HYROX strength training splits: Pull/hinge day (deadlifts, rows, lat pulldowns, SkiErg work) + Push/squat day (front squats, overhead press, lunges, wall ball practice). SkiErg and rowing = lat/trap/row strength. Sled and carries = hip hinge, grip. Wall balls and lunges = front squat + overhead press capacity.` : "";

  const triathlonContext = hasTriathlon ? `
TRIATHLON CONTEXT:
Triathlon plans require swim/bike/run periodization that is not yet fully supported in plan generation. However, I can coach general triathlon strategy:
- T1/T2 transitions are trainable skills — practice them weekly.
- The run is the discipline that determines your finish position. Most athletes over-train swim, under-train run.
- Half Ironman (70.3): Bike at Zone 2-3 effort (not Zone 4 or you'll blow up on the run). Run at Zone 3.
- Full Ironman: Zone 2 on the bike almost the entire way. Even Zone 2 feels uncomfortable by mile 18 of the marathon.
- Brick workouts (bike immediately followed by run) are essential — the legs feel very different transitioning from cycling.` : "";

  const recentTrainingSection = recentTraining ? (() => {
    const workoutLines = recentTraining.completedWorkouts.map(w => {
      const dist = w.actualDistance != null ? `${w.actualDistance}mi actual` : w.plannedDistance != null ? `${w.plannedDistance}mi planned` : "no distance";
      const rpe = w.rpe != null ? `RPE ${w.rpe}` : "no RPE";
      const felt = w.perceivedDifficulty ? `, felt: ${w.perceivedDifficulty.replace("_", " ").toLowerCase()}` : "";
      const noNote = (w.status === "SKIPPED" || w.status === "MODIFIED") && !w.hasNote ? " (no note)" : "";
      return `- ${w.date}: ${w.type} — ${w.status}, ${dist}, ${rpe}${felt}${noNote}`;
    }).join("\n") || "No workouts in the last 7 days";

    const completedCount = recentTraining.completedWorkouts.filter(w => w.status === "COMPLETED").length;
    const totalCount = recentTraining.completedWorkouts.length;

    const flagsLine = recentTraining.flaggedSessions.length > 0
      ? `\nFlagged: ${recentTraining.flaggedSessions.join(", ")}`
      : "";

    const whoopLines = recentTraining.whoopTrend.length > 0
      ? recentTraining.whoopTrend.map(d => `- ${d.date}: ${d.score}% recovery${d.hrv != null ? `, HRV ${Math.round(d.hrv)}ms` : ""}`).join("\n")
      : "No WHOOP data";

    return `
RECENT TRAINING (last 7 days):
${workoutLines}

Compliance last 14 days: ${recentTraining.compliancePct}% (${completedCount}/${totalCount} sessions completed)${flagsLine}

WHOOP trend (7 days):
${whoopLines}`;
  })() : "";

  const athleteModelSection = buildAthleteModelSection(athleteModel ?? null);

  const hyroxStationSection = (() => {
    if (!hyroxStationScores || !hasHyrox) return "";
    const STATION_NAMES: Record<string, string> = {
      SKI_ERG: "SkiErg", SLED_PUSH: "Sled Push", SLED_PULL: "Sled Pull",
      BURPEE_BROAD_JUMP: "Burpee Broad Jump", ROW_ERG: "RowErg",
      FARMERS_CARRY: "Farmers Carry", SANDBAG_LUNGE: "Sandbag Lunge", WALL_BALLS: "Wall Balls",
    };
    const lines = ["HYROX STATION READINESS (0-100):"];
    for (const [key, score] of Object.entries(hyroxStationScores)) {
      const label = score >= 75 ? "STRONG" : score >= 50 ? "DEVELOPING" : "NEEDS WORK";
      lines.push(`- ${STATION_NAMES[key] ?? key}: ${score}/100 (${label})`);
    }
    const weakest = Object.entries(hyroxStationScores)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 2)
      .filter(([, s]) => s < 60);
    if (weakest.length > 0) {
      lines.push(`Priority gaps: ${weakest.map(([k]) => STATION_NAMES[k] ?? k).join(", ")}`);
    }
    return lines.join("\n");
  })();

  const adaptationSection = recentAdaptation ? (() => {
    const daysAgo = Math.floor((Date.now() - new Date(recentAdaptation.appliedAt).getTime()) / 86400000);
    const when = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`;
    const SIGNAL_LABELS: Record<string, string> = {
      low_compliance: "low compliance",
      low_recovery: "low recovery scores",
      high_fatigue: "accumulated fatigue (TSB)",
      ramp_too_fast: "load increasing too fast",
      rpe_too_hard: "RPE trending high",
      rpe_too_easy: "RPE consistently low",
    };
    const signals = recentAdaptation.triggerSignals.map(s => SIGNAL_LABELS[s] ?? s).join(", ");
    return `RECENT PLAN ADAPTATION (${when}):
Type: ${recentAdaptation.adaptationType.replace(/_/g, " ").toLowerCase()} (${recentAdaptation.severity.toLowerCase()} severity)
Triggered by: ${signals || "automated thresholds"}
Weeks ${recentAdaptation.weekRange.from}–${recentAdaptation.weekRange.to} affected — ${recentAdaptation.workoutsModified} workouts modified
Summary: ${recentAdaptation.coachSummary}
If the athlete asks about changes to their plan, this is the context. Be specific about what changed and why.`;
  })() : "";

  return `You are a direct, experienced endurance and functional fitness coach working with ${athleteName}.
${currentDate ? `Today is ${currentDate}.` : ""}

ATHLETE PROFILE:
${profileSummary}
Dedication score: ${dedicationScore}/10${dedicationScore >= 8 ? " — they expect hard. Don't soften." : ""}

ACTIVE EVENTS:
${activeEvents.map(e => `- ${e.name} (${e.type}): ${e.weeksOut} weeks away${e.goalTime ? ` | Goal: ${e.goalTime}` : ""}`).join("\n")}
${athleteModelSection ? `\n${athleteModelSection}\n` : ""}${hyroxStationSection ? `\n${hyroxStationSection}\n` : ""}${adaptationSection ? `\n${adaptationSection}\n` : ""}${recentTrainingSection}
THIS WEEK'S WORKOUTS:
${currentWeekWorkouts}

RECENT STRAVA ACTIVITY:
${recentActivity}

WEARABLE BIOMETRIC DATA:
${whoopContext}
${stravaZoneContext ? `\nSTRAVA TRAINING ZONES:\n${stravaZoneContext}\n` : ""}
${classScheduleNote ? `${classScheduleNote}\n\n` : ""}${activeConflicts.length > 0 ? `ACTIVE CONFLICTS:\n${activeConflicts.map(c => `- ${c}`).join("\n")}\n` : ""}
${trainingZoneSystem}
${runningRaceStrategy}
${ultraStrategy}
${hyroxStrategy}
${triathlonContext}

COACHING GUIDELINES:
- Be direct and knowledgeable. No fluff, no unsolicited encouragement.
- Answer what was asked. Don't pad responses.
- When asked to modify the plan, confirm the specific change before applying: "I'll [change]. Confirm?"
- If an athlete asks to skip a workout, ask why before agreeing.
- Nutrition advice is fine — frame it around training load, add a brief disclaimer for medical advice.
- You have authority to suggest plan changes. State them clearly with a reason.
- Respect the dedication score. A 9/10 athlete doesn't need to be told to take it easy unless data says otherwise.
- Wearable recovery data: if recovery is red/poor (<34% WHOOP or low body battery), suggest shifting or reducing today's hard session without waiting to be asked. If green/good (≥67% WHOOP), green-light intensity.
- High-strain other activities (soccer, tennis, barre, CrossFit) count toward weekly load. Don't schedule hard structured workouts on top of high-strain days.
- For running pace guidance, use pace per mile. All distances are in miles. When asked about easy, tempo, or interval pace, always give a specific min/mile range — never say "comfortable" or "conversational" without attaching a number. If Strava zone data is available use those exact numbers; if not, calculate from their goal race pace: Easy = goal marathon pace + 60-90sec/mi, Tempo = goal marathon pace - 15-30sec/mi, Intervals (VO2max) = 5K-10K goal pace. State the number first, then the feel cue.
- The 80/20 rule is non-negotiable: if the athlete is doing more than 20% of weekly mileage at Zone 3+, the easy runs are too fast. Tell them their easy pace ceiling in min/mile and address this directly.
- Phase-aware coaching: athletes in base phase need volume, not intensity. In peak phase, quality sessions matter more. In taper, nothing they do in the final 2 weeks will make them fitter — only more or less rested.`;
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

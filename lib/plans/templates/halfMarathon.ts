import type { PlanTemplateData, TemplateWeek } from "./types";

// Half Marathon 12-Week Plan
// Structure: Base (wks 1-3) → Build (wks 4-7) → Peak (wks 8-10) → Taper (wks 11-12)
// Framework: 80/20 polarized, Daniels threshold model
// Peak weekly mileage: ~40mi | Long run peak: 14mi
// Key sessions: weekly threshold run, bi-weekly VO2max intervals, long run with race-pace finish
function buildHalfMarathonWeeks(): TemplateWeek[] {
  return [
    // ── Week 1: Base — Aerobic Foundation ─────────────────────────────────
    {
      week: 1, phase: "Base", totalMi: 22,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest day. Let your body absorb the week ahead." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Zone 2 aerobic base. Heart rate 60-70% max — fully conversational throughout. Slow enough that you'd feel slightly embarrassed running this pace in public. Research shows easy runs at this intensity build mitochondrial density and fat oxidation in ways that faster running cannot (Holloszy, 1967). Start here.",
          targetDistance: 4, intensityZone: 2,
        },
        {
          day: 2, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Mid-week aerobic run. Same Zone 2 effort as Tuesday. Focus on relaxed form: slight forward lean, midfoot strike, arms at 90° swinging front-to-back. If you're breathing through your mouth at all, slow down.",
          targetDistance: 5, intensityZone: 2,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Recovery run. Zone 2. If yesterday felt hard, drop this to 3mi. The goal is aerobic stimulus without accumulated fatigue.",
          targetDistance: 4, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest before your long run." },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 9mi",
          description: "Week's key session. Zone 2 throughout — the pace should feel genuinely easy for all 9 miles. Long runs build the musculoskeletal durability and glycogen utilization patterns specific to half marathon racing. Do not add pace. The fitness gain is from time on feet, not effort.",
          targetDistance: 9, intensityZone: 2,
        },
        {
          day: 6, type: "EASY_RUN", title: "Easy Run 3mi (+ strides)",
          description: "Easy run followed by 4×100m strides at 5K effort (full recovery between). Strides maintain neuromuscular sharpness without adding fatigue. Don't skip them.",
          targetDistance: 3, intensityZone: 2,
        },
      ],
    },

    // ── Week 2: Base — Introduce Threshold ──────────────────────────────
    {
      week: 2, phase: "Base", totalMi: 25,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2 aerobic run. Keep it conversational.",
          targetDistance: 5, intensityZone: 2,
        },
        {
          day: 2, type: "TEMPO", title: "Threshold Run — 2mi tempo",
          description: "Warm up 1.5mi easy. Then 2mi at threshold pace — 20-30 sec/mi faster than goal half marathon pace, Zone 4. The test: you can speak in 2-3 word phrases but not sentences. This is the single highest-return workout in half marathon training (Daniels, 2014). Cool down 1.5mi easy. Total 5mi.",
          targetDistance: 5, intensityZone: 4,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Easy recovery run after yesterday's threshold. Zone 2 only — resist any temptation to make this faster.",
          targetDistance: 4, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest before the long run." },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 10mi",
          description: "Zone 2 throughout. Long runs should feel controlled and sustainable — not a death march. Final mile can drift slightly faster if you feel strong. Fuel: take a gel or sports drink at mile 5.",
          targetDistance: 10, intensityZone: 2,
        },
        {
          day: 6, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Zone 2 shakeout to close the week.",
          targetDistance: 4, intensityZone: 2,
        },
      ],
    },

    // ── Week 3: Base — Cutback ───────────────────────────────────────────
    {
      week: 3, phase: "Base", totalMi: 19,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Cutback week — full rest Monday." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Cutback week. Zone 2 only. The past two weeks of training is absorbing this week — don't undermine it by going harder.",
          targetDistance: 4, intensityZone: 2,
        },
        {
          day: 2, type: "TEMPO", title: "Threshold Run — 2mi tempo",
          description: "Same structure as week 2: 1.5mi warm-up, 2mi at threshold (Zone 4), 1.5mi cool-down. Keep intensity but reduced overall volume. Total 5mi.",
          targetDistance: 5, intensityZone: 4,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 3mi",
          description: "Easy Zone 2. Short and simple.",
          targetDistance: 3, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 7mi",
          description: "Cutback long run. Zone 2, easy effort. Let the body absorb weeks 1-2.",
          targetDistance: 7, intensityZone: 2,
        },
        { day: 6, type: "REST", title: "Rest", description: "Rest." },
      ],
    },

    // ── Week 4: Build — Intervals Introduced ────────────────────────────
    {
      week: 4, phase: "Build", totalMi: 28,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2 aerobic base. Build week — volume increases.",
          targetDistance: 5, intensityZone: 2,
        },
        {
          day: 2, type: "INTERVALS", title: "VO₂max Intervals: 4×1km",
          description: "After 1mi warm-up: 4×1km at 5K race effort (90-95% max HR). 90sec jog recovery between each. VO2max intervals raise your aerobic ceiling — the highest predictor of improvement in trained athletes. The short jog recovery keeps lactate cycling so each rep achieves the same stimulus. 1mi cool-down. Total ~5.5mi.",
          targetDistance: 5.5, intensityZone: 5,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Easy Zone 2. Day after hard intervals — go easy.",
          targetDistance: 5, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest before the long run." },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 11mi",
          description: "Zone 2 throughout. First double-digit run of the build block. Fuel at miles 4 and 8. Last 2mi can drift toward marathon goal pace if you feel strong — don't force it.",
          targetDistance: 11, intensityZone: 2,
        },
        {
          day: 6, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2. Build week runs slightly longer.",
          targetDistance: 5, intensityZone: 2,
        },
      ],
    },

    // ── Week 5: Build — Threshold Load ──────────────────────────────────
    {
      week: 5, phase: "Build", totalMi: 30,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 6mi",
          description: "Zone 2. Mileage building.",
          targetDistance: 6, intensityZone: 2,
        },
        {
          day: 2, type: "TEMPO", title: "Threshold Run — 3mi tempo",
          description: "Warm up 1.5mi easy. Then 3mi at threshold pace (Zone 4). Longest tempo so far. The extended threshold segment develops your ability to sustain race-pace effort. Cool down 1.5mi. Total 6mi.",
          targetDistance: 6, intensityZone: 4,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2 recovery. Yesterday's threshold creates adaptation — today's easy run facilitates it.",
          targetDistance: 5, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest before the long run." },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 12mi with Race-Pace Finish",
          description: "First 9mi at Zone 2 easy pace. Final 3mi progressively faster, finishing at goal half marathon pace. This progression long run is the cornerstone of half marathon preparation — it trains your body to push race pace when glycogen is depleted. Zone 4 for the final mile. Fuel at miles 4 and 8.",
          targetDistance: 12, intensityZone: 2,
        },
        {
          day: 6, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2. Close the week with easy aerobic work.",
          targetDistance: 5, intensityZone: 2,
        },
      ],
    },

    // ── Week 6: Build — Cutback ──────────────────────────────────────────
    {
      week: 6, phase: "Build", totalMi: 22,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Cutback week." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Cutback week. Zone 2 only. Weeks 4-5 adaptations consolidate now.",
          targetDistance: 4, intensityZone: 2,
        },
        {
          day: 2, type: "INTERVALS", title: "VO₂max Intervals: 5×800m",
          description: "After 1mi warm-up: 5×800m at 5K effort. 60sec jog recovery. Same intensity as week 4 but shorter reps — maintains the aerobic ceiling stimulus with less fatigue during cutback week. 1mi cool-down. Total ~5mi.",
          targetDistance: 5, intensityZone: 5,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Easy Zone 2.",
          targetDistance: 4, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 9mi",
          description: "Cutback long run. Zone 2 throughout — no race pace finish today. Easy and relaxed.",
          targetDistance: 9, intensityZone: 2,
        },
        { day: 6, type: "REST", title: "Rest", description: "Rest." },
      ],
    },

    // ── Week 7: Build — Peak Volume ──────────────────────────────────────
    {
      week: 7, phase: "Build", totalMi: 35,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 6mi",
          description: "Zone 2. Back to building after the cutback.",
          targetDistance: 6, intensityZone: 2,
        },
        {
          day: 2, type: "TEMPO", title: "Threshold Run — 4mi tempo",
          description: "Warm up 1.5mi easy. Then 4mi at threshold pace (Zone 4) — the longest threshold segment of the plan. This is where your half marathon fitness is made. Cool down 1.5mi. Total 7mi.",
          targetDistance: 7, intensityZone: 4,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 6mi",
          description: "Zone 2 recovery.",
          targetDistance: 6, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest before the peak long run." },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 14mi with Race-Pace Finish",
          description: "Longest run of the plan. First 10mi at Zone 2. Final 4mi at goal half marathon pace (Zone 3-4). A 14-mile long run with a race-pace finish is the most race-specific workout in the plan — it simulates the exact physiological demand of the final miles of your race. Fuel at miles 4, 8, and 12. Hydrate well.",
          targetDistance: 14, intensityZone: 2,
        },
        {
          day: 6, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2. Close the peak week.",
          targetDistance: 5, intensityZone: 2,
        },
      ],
    },

    // ── Week 8: Peak — Race-Specific Intensity ───────────────────────────
    {
      week: 8, phase: "Peak", totalMi: 33,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 6mi",
          description: "Zone 2. Keep mileage consistent — you're in peak territory now.",
          targetDistance: 6, intensityZone: 2,
        },
        {
          day: 2, type: "INTERVALS", title: "Race-Specific Intervals: 3×2mi at HM Pace",
          description: "After 1.5mi warm-up: 3×2mi at goal half marathon pace. 90sec jog recovery. This session is race simulation in intervals — your body learns the specific effort required. Zone 3-4 effort. These should feel hard but controlled. 1.5mi cool-down. Total ~8mi.",
          targetDistance: 8, intensityZone: 4,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2 recovery.",
          targetDistance: 5, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 13mi",
          description: "Zone 2 for first 10mi. Final 3mi at goal half marathon pace. Second peak long run — reinforce the race-pace finish pattern. Your legs will feel it more than week 7. That's the adaptation.",
          targetDistance: 13, intensityZone: 2,
        },
        {
          day: 6, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2.",
          targetDistance: 5, intensityZone: 2,
        },
      ],
    },

    // ── Week 9: Peak — Sharpening ────────────────────────────────────────
    {
      week: 9, phase: "Peak", totalMi: 30,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2.",
          targetDistance: 5, intensityZone: 2,
        },
        {
          day: 2, type: "TEMPO", title: "Threshold Run — 3mi tempo (sharp)",
          description: "Warm up 1.5mi. Then 3mi at threshold (Zone 4). Slightly shorter than week 7 — this is peak sharpening, not more loading. Feel crisp. Cool down 1.5mi. Total 6mi.",
          targetDistance: 6, intensityZone: 4,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2 recovery.",
          targetDistance: 5, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest before last long run." },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 11mi with Race-Pace Finish",
          description: "First 8mi at Zone 2. Final 3mi at race pace. Last long run of the plan. Keep it controlled — you're sharpening now, not loading. Final long run should end feeling like you could do 2 more miles at race pace.",
          targetDistance: 11, intensityZone: 2,
        },
        {
          day: 6, type: "EASY_RUN", title: "Easy Run 5mi + strides",
          description: "4mi easy + 4×100m strides at 5K effort. Close the peak block feeling sharp.",
          targetDistance: 4, intensityZone: 2,
        },
      ],
    },

    // ── Week 10: Peak — Cutback into Taper ──────────────────────────────
    {
      week: 10, phase: "Peak", totalMi: 22,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Transition into taper begins." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Volume drops significantly. Zone 2 only.",
          targetDistance: 4, intensityZone: 2,
        },
        {
          day: 2, type: "INTERVALS", title: "Sharpener: 5×800m at HM Pace",
          description: "After 1mi warm-up: 5×800m at goal half marathon pace. 60sec rest. Short, crisp, confident. You're not building fitness anymore — you're maintaining it and reinforcing the race-pace neuromuscular pattern. 1mi cool-down. Total ~5mi.",
          targetDistance: 5, intensityZone: 4,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Zone 2. Light.",
          targetDistance: 4, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 9mi",
          description: "Taper begins. Zone 2 for the full run — no race-pace section. The fitness is locked in. Just keep the engine warm.",
          targetDistance: 9, intensityZone: 2,
        },
        { day: 6, type: "REST", title: "Rest", description: "Rest. Your body is adapting." },
      ],
    },

    // ── Week 11: Taper ───────────────────────────────────────────────────
    {
      week: 11, phase: "Taper", totalMi: 16,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Taper week. Volume drops 40-50%. Intensity stays. Fitness is set — nothing you do this week will make you fitter. Everything you do can make you more or less rested." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Zone 2. Keep it easy.",
          targetDistance: 4, intensityZone: 2,
        },
        {
          day: 2, type: "TEMPO", title: "Taper Tempo: 2mi at threshold",
          description: "Warm up 1mi. Then 2mi at threshold pace (Zone 4). Cool down 1mi. Short and sharp — maintains the neuromuscular sharpness without creating fatigue. This is the last quality session before race week. Total 4mi.",
          targetDistance: 4, intensityZone: 4,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 3mi",
          description: "Zone 2.",
          targetDistance: 3, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        {
          day: 5, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2 long run equivalent during taper. Feel the legs responding to the reduced load — you should feel good.",
          targetDistance: 5, intensityZone: 2,
        },
        { day: 6, type: "REST", title: "Rest", description: "Rest. Eat well, hydrate, sleep." },
      ],
    },

    // ── Week 12: Race Week ───────────────────────────────────────────────
    {
      week: 12, phase: "Race", totalMi: 16.1,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Rest. Eat carbohydrate-rich meals. Hydrate." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 3mi + strides",
          description: "3mi easy + 4×100m strides at race pace. Keeps fast-twitch fibers primed. Minimal fatigue.",
          targetDistance: 3, intensityZone: 2,
        },
        {
          day: 2, type: "EASY_RUN", title: "Race-Day Prep 2mi",
          description: "10min easy jog, 4×20sec at race pace, walk recovery. Under 20 minutes total. Priming, not training.",
          targetDistance: 2, intensityZone: 2,
        },
        { day: 3, type: "REST", title: "Rest", description: "Rest. Visualize the race. Final gear check." },
        { day: 4, type: "REST", title: "Rest", description: "Rest day before race." },
        {
          day: 5, type: "RACE", title: "Half Marathon Race Day",
          description: "Race strategy: go through 10K at ~5sec/mi slower than goal HM pace. Miles 8-10 are where most athletes blow up — resist surging. Hold form in the final 5K: tall posture, relaxed shoulders, driven arms. The last mile is where the race is won. Trust the training.",
          targetDistance: 13.1,
        },
        { day: 6, type: "REST", title: "Recovery", description: "You raced. Easy walk if anything. Celebrate." },
      ],
    },
  ];
}

export const HALF_MARATHON_12WK: PlanTemplateData = {
  name: "Half Marathon 12-Week Plan",
  totalWeeks: 12,
  weeks: buildHalfMarathonWeeks(),
};

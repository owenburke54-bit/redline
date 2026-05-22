import type { PlanTemplateData, TemplateWeek, HyroxStation } from "./types";

// Official HYROX race format (men's division weights)
// Sources: hyrox.com, HYROX Level 1 Academy, TrainRox, HyroxDataLab, RB100 Fitness
const HYROX_SIM_STATIONS: HyroxStation[] = [
  { station: "1km Run", type: "run" },
  { station: "SkiErg", distance: "1000m" },
  { station: "1km Run", type: "run" },
  { station: "Sled Push", distance: "50m", weightKg: 102 },
  { station: "1km Run", type: "run" },
  { station: "Sled Pull", distance: "50m", weightKg: 78 },
  { station: "1km Run", type: "run" },
  { station: "Burpee Broad Jumps", distance: "80m" },
  { station: "1km Run", type: "run" },
  { station: "Rowing", distance: "1000m" },
  { station: "1km Run", type: "run" },
  { station: "Farmers Carry", distance: "200m", weightKg: 24 },
  { station: "1km Run", type: "run" },
  { station: "Sandbag Lunges", distance: "100m", weightKg: 20 },
  { station: "1km Run", type: "run" },
  { station: "Wall Balls", reps: 100, weightKg: 6 },
];

// ─── 8-WEEK PLAN ────────────────────────────────────────────────────────────
// For athletes with existing aerobic and strength base.
// Structure: Base/Technique (wks 1-2) → Build/Station Pairings (wks 3-4) →
//            Peak Volume + Compromised Runs (wks 5-6) → Taper (wks 7-8)
// Framework: 80/20 polarized (80% Zone 2, 20% threshold/VO2max)
// Station progression: Isolate → Pair → Compromised Run → Half Sim → Full Sim
function build8WeekHyrox(): TemplateWeek[] {
  return [
    // ── Week 1: Base / Technique ────────────────────────────────────────────
    {
      week: 1, phase: "Base", totalMi: 10,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Zone 2 Run 4mi",
          description: "Aerobic base builder. 60-70% max HR — fully conversational. Running accounts for ~60% of HYROX race time. Build this engine first.",
          targetDistance: 4, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength A: Pull & Hinge — Foundation",
          description: "Deadlift 4×10 (form over weight — neutral spine throughout). Lat pulldown or ring rows 4×10. Single-arm DB row 3×12/side. Farmers carry 3×30m (light). Dead bug 3×8/side. These movements transfer directly to SkiErg pull mechanics, sled pull, and the 200m farmers carry station.",
          intensityZone: 3,
        },
        {
          day: 2, type: "HYROX_STATION_WORK",
          title: "Station Technique: SkiErg (Isolated)",
          description: "5×300m SkiErg at moderate pace, 2min rest. Cue: start tall, then hinge at the hips — drive comes from lats and hip extension, not shoulders. Arms are levers, not the engine. This one technique fix saves 60-90sec on race day.",
          intensityZone: 2,
        },
        {
          day: 3, type: "STRENGTH",
          title: "Strength B: Push & Squat — Foundation",
          description: "Goblet squat 4×10 (chest high, knees tracking toes). DB overhead press 4×10. Walking lunges 3×12/leg. Box jumps 3×6 (full reset — power, not speed). Hollow body hold 3×30s. Targets sled push, wall balls, and sandbag lunge mechanics.",
          intensityZone: 3,
        },
        {
          day: 4, type: "TEMPO",
          title: "Threshold Run 3mi",
          description: "Zone 4 — comfortably hard. You can speak in short sentences but wouldn't choose to. This is your race-run effort without the station fatigue layered on top. Sustain it for 3mi.",
          targetDistance: 3, intensityZone: 4,
        },
        {
          day: 5, type: "HYROX_STATION_WORK",
          title: "Station Technique: Sled Push + Sled Pull",
          description: "Sled push 6×20m (bodyweight on sled — technique only). Lean 45° forward, arms locked, drive from hips. Sled pull 6×20m: lean back, arms long, pull through the hips not the biceps. Mechanics now will protect you when the weight goes up.",
          intensityZone: 3,
        },
        {
          day: 6, type: "EASY_RUN",
          title: "Easy Run 3mi",
          description: "Short Zone 2 recovery run to close the week.",
          targetDistance: 3, intensityZone: 2,
        },
      ],
    },

    // ── Week 2: Base / Technique ─────────────────────────────────────────────
    {
      week: 2, phase: "Base", totalMi: 9,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Zone 2 Run 5mi",
          description: "Build aerobic base. 60-70% max HR. If breathing prevents conversation, slow down. Zone 2 builds mitochondrial density — the foundation that lets you hold pace through 8 runs.",
          targetDistance: 5, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength B: Push & Squat — Foundation",
          description: "Goblet squat 4×10 (chest high, knees out). DB overhead press 4×10. Walking lunges 3×12/leg. Box jumps 3×6 (full reset between reps — power, not speed). Hollow body hold 3×30s. Targets sled push, wall balls, and sandbag lunge mechanics.",
          intensityZone: 3,
        },
        {
          day: 2, type: "HYROX_STATION_WORK",
          title: "Station Technique: Rowing + Farmers Carry",
          description: "Rowing 5×400m at moderate pace (aim 2:15/500m). Key: legs drive 60% of power — push with legs first, then swing back, then pull arms. Farmers carry 4×50m: brace core, shoulders packed, don't let hips rotate. These two stations are where athletes lose time to poor mechanics.",
          intensityZone: 3,
        },
        { day: 3, type: "REST", title: "Rest", description: "Rest day." },
        {
          day: 4, type: "INTERVALS",
          title: "Run Intervals: 5×600m",
          description: "5×600m at 5K race effort (90-95% max HR). 2min jog recovery between. Total ~3.5mi. This is the hardest run session of the week — don't shortcut the rest periods.",
          targetDistance: 3.5, intensityZone: 5,
        },
        {
          day: 5, type: "HYROX_STATION_WORK",
          title: "Station Technique: Burpee Broad Jumps + Wall Balls",
          description: "Burpee broad jumps 4×20m — maximize distance per rep, not speed. Wall balls 4×15 reps at technique weight: catch at chin height, squat below parallel, drive through heels on the throw. These two stations combined cost most athletes 3-5 minutes they didn't budget for.",
          intensityZone: 3,
        },
        { day: 6, type: "REST", title: "Rest", description: "Rest day." },
      ],
    },

    // ── Week 3: Build — Station Pairings + Compromised Running ──────────────
    {
      week: 3, phase: "Build", totalMi: 14,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Zone 2 Run 6mi",
          description: "Longer aerobic run. Slow enough to maintain full conversation for all 6mi. Long runs build the specific endurance that carries you through 8km of race running.",
          targetDistance: 6, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength A: Pull & Hinge — Load",
          description: "Trap bar deadlift 4×6 (heavier than week 1 — 5-10% load increase). Weighted pull-ups 4×5. Single-arm row 4×8/side. Farmers carry 4×40m (approaching race weight: 24kg each). Copenhagen plank 3×20s/side. Log every set — progressive overload is the mechanism.",
          intensityZone: 4,
        },
        {
          day: 2, type: "HYROX_STATION_WORK",
          title: "Station Pairing: SkiErg + Rowing",
          description: "4 rounds: 500m SkiErg + 500m row. 2min rest between. Note how your rowing pace drops after the SkiErg — that fatigue carryover is exactly what the race asks you to manage. This pairing mirrors the first two HYROX stations.",
          intensityZone: 4,
        },
        {
          day: 3, type: "STRENGTH",
          title: "Strength B: Push & Squat — Load",
          description: "Front squat 4×8 (heavier than last week — build toward race-day demand). Overhead press 4×8. Reverse lunges 3×10/leg (add KB). Box jumps 4×5 (explosive). Sandbag squat hold 3×30s (20kg on traps — practice keeping torso upright under load). Directly prepares for wall balls and sandbag lunges.",
          intensityZone: 4,
        },
        {
          day: 4, type: "INTERVALS",
          title: "VO₂max Intervals: 4×1km",
          description: "4×1km at just-above race-run effort (90-95% max HR). 2:30 rest between. This mirrors the sustained intensity of HYROX race runs under fatigue. Total ~4mi.",
          targetDistance: 4, intensityZone: 5,
        },
        {
          day: 5, type: "HYROX_STATION_WORK",
          title: "Compromised Run: Run → Sled → Run",
          description: "3 rounds: 1km run at race pace → Sled push 50m (race weight, 102kg) → 1km run at race pace. 3min rest between rounds. This is your first compromised run — the defining training method for HYROX. Your legs will feel the sled on that second run. That's the adaptation you're building.",
          intensityZone: 4,
        },
        {
          day: 6, type: "EASY_RUN",
          title: "Easy Run 4mi",
          description: "Zone 2 recovery run to close the build week.",
          targetDistance: 4, intensityZone: 2,
        },
      ],
    },

    // ── Week 4: Build / Cutback + First Half Sim ─────────────────────────────
    {
      week: 4, phase: "Build", totalMi: 12,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Easy Run 4mi",
          description: "Cutback week. Zone 2 only. Fitness is built during hard weeks and absorbed during cutback weeks — don't skip this one.",
          targetDistance: 4, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength B: Push & Squat — Cutback",
          description: "Front squat 4×8 (reduce load 15% from last week). Overhead press 3×10. Lunges 3×10/leg. Box jumps 3×5 (explosive, not heavy). Reduce volume and weight intentionally. Absorb the past 3 weeks.",
          intensityZone: 3,
        },
        { day: 2, type: "REST", title: "Rest", description: "Extra rest — cutback week." },
        {
          day: 3, type: "TEMPO",
          title: "Threshold Run 3mi",
          description: "Zone 4 tempo. Cutback week — keep intensity but cut back on volume. Short and sharp.",
          targetDistance: 3, intensityZone: 4,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest before your first sim." },
        {
          day: 5, type: "HYROX_SIM",
          title: "Half HYROX Sim — Stations 1–4",
          description: "Race format for the first half: 4×1km runs + SkiErg, Sled Push, Sled Pull, Burpee Broad Jumps. Time each run and each station. Start controlled — most athletes go out 15% too fast and blow up. This is a learning session. Data > ego.",
          stations: HYROX_SIM_STATIONS.slice(0, 8), isHyroxSim: true, targetDistance: 2.5, intensityZone: 4,
        },
        {
          day: 6, type: "EASY_RUN",
          title: "Easy Run 2mi",
          description: "Short easy shakeout after sim day.",
          targetDistance: 2, intensityZone: 2,
        },
      ],
    },

    // ── Week 5: Build — Peak Volume ──────────────────────────────────────────
    {
      week: 5, phase: "Build", totalMi: 16,
      workouts: [
        {
          day: 0, type: "LONG_RUN",
          title: "Long Run 8mi",
          description: "Longest run of the plan. Zone 2. Build toward 90min at comfortable effort. Running is ~60% of HYROX race time — this session is foundational, not optional.",
          targetDistance: 8, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength A: Power — Peak",
          description: "Trap bar deadlift 3×3 at ~90% effort. Weighted pull-ups 5×3 (heavy). Broad jumps 4×5 (maximum distance, full reset). Sled push 3×20m at race weight. Pallof press 3×12/side. Short rests — power output is the focus, not volume.",
          intensityZone: 5,
        },
        {
          day: 2, type: "HYROX_STATION_WORK",
          title: "Station Pairing: Sled + Sandbag Lunges + Farmers Carry",
          description: "3 rounds: Sled push 50m (race weight) + sandbag lunges 50m (20kg) + farmers carry 100m (24kg each). 4min rest between rounds. Sandbag cue: high on traps, torso vertical, 0.9-1.1m step length. This three-station combo is where HYROX races are lost — train it weekly.",
          intensityZone: 5,
        },
        {
          day: 3, type: "STRENGTH",
          title: "Strength B: Push & Squat — Power",
          description: "Front squat 4×5 (near max load for the plan). Push press 4×5 (use leg drive — teaches the explosive hip extension needed for wall balls). Step-ups with KB 3×8/leg. Broad jumps 4×5. Sandbag lunge 3×30m (race weight, 20kg). Peak strength session — log everything.",
          intensityZone: 5,
        },
        {
          day: 4, type: "INTERVALS",
          title: "VO₂max Intervals: 6×800m",
          description: "6×800m at 5K race effort. 90s jog recovery between. Total ~5mi. Peak interval session — push the pace. Race-day running should feel controlled by comparison.",
          targetDistance: 5, intensityZone: 5,
        },
        {
          day: 5, type: "HYROX_STATION_WORK",
          title: "Compromised Run: Full Station Circuit",
          description: "2 full rounds: 1km run → SkiErg 1000m → 1km run → Rowing 1000m → 1km run → Wall balls 50 reps (6kg) → 1km run. 5min rest between rounds. Race pace effort throughout. This is your closest pre-sim experience — note every split.",
          intensityZone: 5,
        },
        {
          day: 6, type: "EASY_RUN",
          title: "Easy Run 3mi",
          description: "Zone 2 recovery run.",
          targetDistance: 3, intensityZone: 2,
        },
      ],
    },

    // ── Week 6: Peak — Full Race Simulation ──────────────────────────────────
    {
      week: 6, phase: "Peak", totalMi: 13,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Zone 2 Run 5mi",
          description: "Easy aerobic run. Peak week — save the legs for Saturday's full sim.",
          targetDistance: 5, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength B: Peak Push",
          description: "Front squat 4×5 (heaviest of the plan). Overhead press 4×5. Box jumps 4×5 (max height). Sandbag lunge 3×20m (race weight). This is the last heavy strength session before taper — make it count.",
          intensityZone: 5,
        },
        {
          day: 2, type: "HYROX_STATION_WORK",
          title: "Race Pace Openers",
          description: "3×1km at goal race-run pace, 2min rest. Then 2×500m SkiErg at race pace. That's it — sharpen, don't grind. Full sim is Saturday.",
          intensityZone: 4,
        },
        { day: 3, type: "REST", title: "Rest", description: "Rest before the simulation." },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        {
          day: 5, type: "HYROX_SIM",
          title: "Full HYROX Simulation",
          description: "Complete race format: 8km of running + all 8 stations at race effort. Time every split — each 1km run and each station. This data tells you exactly where your race will be won or lost. Go out controlled on run 1.",
          stations: HYROX_SIM_STATIONS, isHyroxSim: true, targetDistance: 5, intensityZone: 5,
        },
        {
          day: 6, type: "EASY_RUN",
          title: "Easy Shakeout 3mi",
          description: "Light shakeout after the full sim. Zone 1-2 only — walk if needed. Flush the legs.",
          targetDistance: 3, intensityZone: 1,
        },
      ],
    },

    // ── Week 7: Taper ─────────────────────────────────────────────────────────
    {
      week: 7, phase: "Taper", totalMi: 8,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Easy Run 3mi",
          description: "Taper begins. Volume drops 40-50%. Intensity stays sharp. The adaptations from the past 6 weeks are consolidating now — adding volume here only adds fatigue.",
          targetDistance: 3, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength: Taper Activation",
          description: "Pull-ups 3×5 (bodyweight). Goblet squat 3×5 (moderate). KB swings 3×10. Box jumps 3×4. 60-70% intensity, under 30 minutes. Neuromuscular activation — not a training stimulus. Move well, feel sharp.",
          intensityZone: 3,
        },
        { day: 2, type: "REST", title: "Rest", description: "Rest." },
        {
          day: 3, type: "TEMPO",
          title: "Short Tempo 2mi",
          description: "2mi at Zone 4. Tight and sharp — maintain race-pace feel without the volume. This is the last quality run before race week.",
          targetDistance: 2, intensityZone: 4,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        {
          day: 5, type: "HYROX_STATION_WORK",
          title: "Race Sharpeners",
          description: "2×500m SkiErg at race pace (full rest between). 2×sled push 20m at race weight (crisp and powerful). 2×10 wall balls (explosive). That's the entire session. No added sets, no extra work. Stay fresh.",
          intensityZone: 4,
        },
        {
          day: 6, type: "EASY_RUN",
          title: "Easy Run 3mi",
          description: "Final run before race week. Zone 2.",
          targetDistance: 3, intensityZone: 2,
        },
      ],
    },

    // ── Week 8: Race Week ─────────────────────────────────────────────────────
    {
      week: 8, phase: "Race", totalMi: 7,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Easy Run 2mi + Strides",
          description: "2mi easy, then 4×100m strides at race pace. Full walk recovery between strides. Keeps fast-twitch fibers primed without creating fatigue.",
          targetDistance: 2, intensityZone: 2,
        },
        { day: 1, type: "REST", title: "Rest", description: "Rest. Eat well. Hydrate. Prepare your gear." },
        {
          day: 2, type: "HYROX_STATION_WORK",
          title: "Race Day Priming",
          description: "5min easy jog. 2×200m SkiErg at race effort (not all out). 2×sled push 10m. 10 wall balls. Cool down. Under 20 minutes total. You are priming, not training.",
          intensityZone: 2,
        },
        { day: 3, type: "REST", title: "Rest", description: "Rest. Visualize the race. Finalize gear and logistics." },
        { day: 4, type: "REST", title: "Rest", description: "Rest day before race." },
        {
          day: 5, type: "RACE",
          title: "HYROX Race Day",
          description: "Race day. Start run 1 controlled — most athletes go 10-15% too fast and pay for it at wall balls. The race is decided in the last 3 stations. Your sim data is the blueprint.",
          targetDistance: 5, isHyroxSim: false,
        },
        { day: 6, type: "REST", title: "Recovery", description: "You raced. Rest and celebrate." },
      ],
    },
  ];
}

// ─── 16-WEEK PLAN ────────────────────────────────────────────────────────────
// For athletes building from scratch or with limited HYROX-specific base.
// Phase 1: Aerobic Base + Station Technique (wks 1-4)
// Phase 2: Strength Load + Station Pairings (wks 5-8)
// Phases 3-4: Mirrors the 8-week plan (wks 9-16)
function build16WeekHyrox(): TemplateWeek[] {
  const secondHalf = build8WeekHyrox().map(w => ({ ...w, week: w.week + 8 }));

  const firstHalf: TemplateWeek[] = [
    // ── Week 1: Base — Aerobic Foundation + Station Intro ─────────────────
    {
      week: 1, phase: "Base", totalMi: 9,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Zone 2 Run 3mi",
          description: "Aerobic base. 60-70% max HR — fully conversational. Over 16 weeks you'll build to 8mi long runs. Start here.",
          targetDistance: 3, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength A: Foundation Pull & Hinge",
          description: "Deadlift 4×12 (light — perfect form, neutral spine). Ring rows or lat pulldown 4×12. Single-arm DB row 3×12/side. Farmers carry 3×30m (light). Dead bug 3×10/side. Form is the only metric this week.",
          intensityZone: 3,
        },
        {
          day: 2, type: "HYROX_STATION_WORK",
          title: "Station Intro: SkiErg",
          description: "5×300m SkiErg at easy pace (2:30+/500m), 2min rest. Focus entirely on the hip hinge — start upright, push arms overhead, then drive them down by hinging at the hips. No shoulder-dominant pulling. Nail this movement pattern now.",
          intensityZone: 2,
        },
        {
          day: 3, type: "EASY_RUN",
          title: "Easy Run 3mi",
          description: "Second Zone 2 run of the week. Keep it conversational.",
          targetDistance: 3, intensityZone: 2,
        },
        {
          day: 4, type: "STRENGTH",
          title: "Strength B: Foundation Push & Squat",
          description: "Goblet squat 4×12 (chest up, knees track toes). DB overhead press 4×12. Walking lunges 3×12/leg. Box step-ups 3×10/leg. Plank 3×45s. First of two weekly strength sessions — 2 days lifts per week is the baseline for HYROX prep.",
          intensityZone: 3,
        },
        {
          day: 5, type: "HYROX_STATION_WORK",
          title: "Station Intro: Rowing + Farmers Carry",
          description: "Rowing 4×400m at easy pace (2:20+/500m). Farmers carry 4×50m (light). Rowing cue: legs, back, arms in sequence — legs drive 60% of each stroke. Farmers carry cue: shoulders packed, brace core, don't let the hips rotate.",
          intensityZone: 2,
        },
        {
          day: 6, type: "EASY_RUN",
          title: "Easy Run 3mi",
          description: "Third Zone 2 run. Easy. The triple run week builds volume without intensity.",
          targetDistance: 3, intensityZone: 2,
        },
      ],
    },

    // ── Week 2: Base — Station Technique Continued ────────────────────────
    {
      week: 2, phase: "Base", totalMi: 10,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Zone 2 Run 3mi",
          description: "Zone 2. Conversational pace.",
          targetDistance: 3, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength B: Foundation Push & Squat",
          description: "Goblet squat 4×12 (chest up, knees track toes). DB overhead press 4×12. Walking lunges 3×12/leg. Box step-ups 3×12/leg (controlled descent). Plank 3×45s. Building the base for wall balls, sled push, and sandbag lunges.",
          intensityZone: 3,
        },
        {
          day: 2, type: "HYROX_STATION_WORK",
          title: "Station Intro: Sled Push + Sled Pull",
          description: "Sled push 5×20m (bodyweight on sled, technique only). Sled pull 5×20m. Push cue: lean 45° forward, arms fully extended, push through the whole foot. Pull cue: sit back into the harness, pull hand-over-hand using your lats. These are technique sets — keep it light.",
          intensityZone: 2,
        },
        {
          day: 3, type: "EASY_RUN",
          title: "Easy Run 3mi",
          description: "Zone 2.",
          targetDistance: 3, intensityZone: 2,
        },
        {
          day: 4, type: "STRENGTH",
          title: "Strength A: Foundation Pull & Hinge",
          description: "Romanian deadlift 4×10 (slow eccentric, neutral spine). Lat pulldown 4×10. Single-arm DB row 3×12/side. Farmers carry 3×40m. Dead bug 3×10/side. These movements transfer directly to SkiErg pull, sled pull, and farmers carry station.",
          intensityZone: 3,
        },
        {
          day: 5, type: "HYROX_STATION_WORK",
          title: "Station Intro: Burpee Broad Jumps + Wall Balls",
          description: "Burpee broad jumps 4×15m (maximize jump distance per rep). Wall balls 4×12 reps at technique weight. Wall ball cue: catch at chin height, squat below parallel, drive through heels, extend hips fully on the throw. Perfect these now before weight goes up.",
          intensityZone: 2,
        },
        {
          day: 6, type: "EASY_RUN",
          title: "Easy Run 4mi",
          description: "Longer Zone 2 run to close the week. Aerobic base building.",
          targetDistance: 4, intensityZone: 2,
        },
      ],
    },

    // ── Week 3: Base — First Tempo + Station Load ─────────────────────────
    {
      week: 3, phase: "Base", totalMi: 11,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Zone 2 Run 4mi",
          description: "Aerobic base run. Stay conversational.",
          targetDistance: 4, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength A: Pull & Hinge — First Load",
          description: "Romanian deadlift 4×10 (hamstring focus — slow eccentric). Pull-ups 4×6. Single-arm row 3×10/side. Farmers carry 3×40m (add weight from week 1). Copenhagen plank 3×15s/side. RDL specifically primes the posterior chain for sled pull.",
          intensityZone: 3,
        },
        {
          day: 2, type: "HYROX_STATION_WORK",
          title: "Station Pairing: SkiErg + Rowing",
          description: "3 rounds: 500m SkiErg + 500m row, 2min rest. Push the SkiErg pace. Note how rowing pace drops after the SkiErg — that fatigue transfer is the race in miniature. The gap narrows with training.",
          intensityZone: 3,
        },
        {
          day: 3, type: "STRENGTH",
          title: "Strength B: Load Push & Squat",
          description: "Front squat 4×10 (add weight from week 2). DB overhead press 4×10. DB walking lunges 3×12/leg (add load). Box jumps 3×6. Hollow body hold 3×30s. Building the squat strength for wall balls and sled push.",
          intensityZone: 3,
        },
        {
          day: 4, type: "TEMPO",
          title: "First Threshold Run 3mi",
          description: "Zone 4 — comfortably hard. First tempo run of the plan. You should be working but sustainable. This pace approximates your HYROX race-run effort.",
          targetDistance: 3, intensityZone: 4,
        },
        {
          day: 5, type: "HYROX_STATION_WORK",
          title: "Station Pairing: Sled + Farmers Carry",
          description: "4 rounds: Sled push 30m (add weight from week 2) + farmers carry 50m. 2:30 rest. Add load progressively — by week 8 you want to be at race weight.",
          intensityZone: 3,
        },
        {
          day: 6, type: "EASY_RUN",
          title: "Easy Run 4mi",
          description: "Zone 2 long run.",
          targetDistance: 4, intensityZone: 2,
        },
      ],
    },

    // ── Week 4: Base Cutback ──────────────────────────────────────────────
    {
      week: 4, phase: "Base", totalMi: 8,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Easy Run 3mi",
          description: "Cutback week. Zone 2 only. Weeks 1-3 consolidate this week.",
          targetDistance: 3, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength B: Cutback — Form Reset",
          description: "Goblet squat 3×8 (moderate). DB press 3×10. KB swings 3×12 (hip hinge focus). Box step-ups 3×8/leg. Band pull-aparts 3×20. Mobility: hip flexors, lats, thoracic. 60% effort — absorb the past 3 weeks.",
          intensityZone: 2,
        },
        { day: 2, type: "REST", title: "Rest", description: "Extra rest — cutback week." },
        {
          day: 3, type: "EASY_RUN",
          title: "Easy Run 3mi",
          description: "Zone 2. Short and easy.",
          targetDistance: 3, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        {
          day: 5, type: "HYROX_STATION_WORK",
          title: "Light Station Circuit — All Movements",
          description: "Touch all 8 stations at light effort — this is a technique refresh, not a workout. SkiErg 3×200m, Sled push 2×20m (light), Sled pull 2×20m, Burpees 2×10m, Row 3×200m, Farmers carry 2×50m (light), Sandbag lunges 2×20m (light), Wall balls 2×10 reps. Feel the movements while fresh.",
          intensityZone: 2,
        },
        {
          day: 6, type: "EASY_RUN",
          title: "Easy Run 2mi",
          description: "Short easy shakeout to close the cutback week.",
          targetDistance: 2, intensityZone: 2,
        },
      ],
    },

    // ── Week 5: Build — Load + Compromised Run Intro ──────────────────────
    {
      week: 5, phase: "Build", totalMi: 12,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Zone 2 Run 4mi",
          description: "Aerobic base run — back to building after the cutback.",
          targetDistance: 4, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength A: Build Load",
          description: "Trap bar deadlift 4×8 (loading up from week 3). Weighted pull-ups 3×6. Single-arm row 4×8/side. Farmers carry 4×50m (building to race weight). Dead bug 3×10/side. Log every set — this is the start of a 4-week loading block.",
          intensityZone: 4,
        },
        {
          day: 2, type: "HYROX_STATION_WORK",
          title: "Station Work: SkiErg + Rowing at Pace",
          description: "4 rounds: 500m SkiErg at race pace + 500m row at race pace. Full rest between. Push the pace — no more technique-only effort. You know the movement; now build the engine.",
          intensityZone: 4,
        },
        {
          day: 3, type: "STRENGTH",
          title: "Strength B: Build Load Push & Squat",
          description: "Front squat 4×8 (heavier than week 3). Overhead press 4×8. Reverse lunges with KB 3×10/leg. Box jumps 4×6. Sandbag squat hold 3×30s (practice race-weight carry). Building toward the strength needed for the second-half compromised runs.",
          intensityZone: 4,
        },
        {
          day: 4, type: "INTERVALS",
          title: "Run Intervals: 5×600m",
          description: "5×600m at 5K race effort. 2min jog recovery. Total ~3mi. First interval session of the build phase.",
          targetDistance: 3, intensityZone: 5,
        },
        {
          day: 5, type: "HYROX_STATION_WORK",
          title: "Compromised Run Intro: Run → Sled → Run",
          description: "2 rounds: 1km run at race pace → Sled push 50m (race weight) → 1km run at race pace. 3min rest between rounds. Your legs will feel the sled on that second run. This is the core HYROX training concept — compromised running mimics race conditions.",
          intensityZone: 4,
        },
        {
          day: 6, type: "EASY_RUN",
          title: "Zone 2 Run 5mi",
          description: "Longer Zone 2 run — aerobic base continues to grow.",
          targetDistance: 5, intensityZone: 2,
        },
      ],
    },

    // ── Week 6: Build — Tempo + Multi-Station Compromised Run ────────────
    {
      week: 6, phase: "Build", totalMi: 12,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Zone 2 Run 4mi",
          description: "Zone 2 aerobic base.",
          targetDistance: 4, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength B: Build Load",
          description: "Front squat 4×8 (heavier than week 5). Overhead press 4×8. DB walking lunges 4×10/leg (add load). Box jumps 4×6 (explosive, full reset). Hollow body hold 3×30s. Building the squat pattern for wall balls and sled push.",
          intensityZone: 4,
        },
        {
          day: 2, type: "HYROX_STATION_WORK",
          title: "Station Pairing: Sled + Sandbag Lunges",
          description: "4 rounds: Sled push 50m (race weight) + sandbag lunges 50m (race weight). 3min rest. Lunge cue: torso vertical, 0.9-1.1m step length, sandbag rides high on traps. This is one of the hardest pairings in the race.",
          intensityZone: 4,
        },
        {
          day: 3, type: "STRENGTH",
          title: "Strength A: Build Load Pull & Hinge",
          description: "Trap bar deadlift 4×6 (loading up from week 5). Weighted pull-ups 3×6. Single-arm row 4×8/side. Farmers carry 4×50m (near race weight — 24kg each). Copenhagen plank 3×20s/side. Progressive overload is the mechanism — log it.",
          intensityZone: 4,
        },
        {
          day: 4, type: "TEMPO",
          title: "Threshold Run 4mi",
          description: "Zone 4 tempo run. Build to 4mi at sustained threshold effort. This is your race-run ceiling — hold it.",
          targetDistance: 4, intensityZone: 4,
        },
        {
          day: 5, type: "HYROX_STATION_WORK",
          title: "Compromised Run: 3-Station Circuit",
          description: "3 rounds: 1km run → SkiErg 500m → 1km run → Rowing 500m → 1km run → Wall balls 25 reps. 4min rest between rounds. Three stations, six runs. Note which runs feel hardest — that's your weakness to address.",
          intensityZone: 5,
        },
        {
          day: 6, type: "EASY_RUN",
          title: "Easy Run 4mi",
          description: "Zone 2 recovery run.",
          targetDistance: 4, intensityZone: 2,
        },
      ],
    },

    // ── Week 7: Build — Peak Volume + Half Sim ───────────────────────────
    {
      week: 7, phase: "Build", totalMi: 14,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Zone 2 Run 5mi",
          description: "Aerobic base — longest easy run of the first half.",
          targetDistance: 5, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength A: Heavy — Peak Load",
          description: "Trap bar deadlift 4×5 at ~90% effort. Weighted pull-ups 4×4. Broad jumps 4×5 (max effort, full reset). Farmers carry 4×50m (race weight or heavier). Pallof press 3×10/side. Peak of the first loading block.",
          intensityZone: 5,
        },
        {
          day: 2, type: "HYROX_STATION_WORK",
          title: "Full Station Circuit: All 8 at Load",
          description: "1 complete circuit — all 8 stations at race weight, no running between. SkiErg 1000m → Sled push 50m → Sled pull 50m → Burpee broad jumps 80m → Row 1000m → Farmers carry 200m → Sandbag lunges 100m → Wall balls 75 reps. Time each station. No race-pace running yet — the sim is Saturday.",
          intensityZone: 4,
        },
        { day: 3, type: "REST", title: "Rest", description: "Rest before the half sim." },
        {
          day: 4, type: "INTERVALS",
          title: "VO₂max Intervals: 4×1km",
          description: "4×1km at 90-95% max HR. 2:30 rest. Your race runs happen at sustained high intensity — these intervals train that capacity. Total ~4mi.",
          targetDistance: 4, intensityZone: 5,
        },
        {
          day: 5, type: "HYROX_SIM",
          title: "Half HYROX Sim — Stations 1–4",
          description: "First race simulation: 4×1km runs + SkiErg, Sled Push, Sled Pull, Burpee Broad Jumps. Time every segment. Start conservative — race pace on run 1, and hold it. The goal is consistent splits, not a fast total time.",
          stations: HYROX_SIM_STATIONS.slice(0, 8), isHyroxSim: true, targetDistance: 2.5, intensityZone: 4,
        },
        {
          day: 6, type: "EASY_RUN",
          title: "Easy Run 2.5mi",
          description: "Short easy shakeout after sim day.",
          targetDistance: 2.5, intensityZone: 2,
        },
      ],
    },

    // ── Week 8: Build Cutback ─────────────────────────────────────────────
    {
      week: 8, phase: "Build", totalMi: 10,
      workouts: [
        {
          day: 0, type: "EASY_RUN",
          title: "Easy Run 3mi",
          description: "Cutback week. Zone 2 only. Absorb weeks 5-7.",
          targetDistance: 3, intensityZone: 2,
        },
        {
          day: 1, type: "STRENGTH",
          title: "Strength B: Cutback",
          description: "Pull-ups 4×5 (bodyweight). Goblet squat 3×8 (moderate). KB swings 3×15. Box step-ups 3×10/leg. 60-70% intensity. Let the loading from weeks 5-7 absorb.",
          intensityZone: 3,
        },
        {
          day: 2, type: "HYROX_STATION_WORK",
          title: "Light Station Work: SkiErg + Rowing",
          description: "3×500m SkiErg at moderate pace + 3×500m rowing at moderate pace. Cutback volume. Maintain the movement quality from the full circuit on Wednesday.",
          intensityZone: 3,
        },
        { day: 3, type: "REST", title: "Rest", description: "Rest." },
        {
          day: 4, type: "TEMPO",
          title: "Threshold Run 3mi",
          description: "Zone 4 tempo. Keep intensity, cut back volume. Short and sharp.",
          targetDistance: 3, intensityZone: 4,
        },
        { day: 5, type: "REST", title: "Rest", description: "Rest before the final 8 weeks." },
        {
          day: 6, type: "EASY_RUN",
          title: "Easy Run 4mi",
          description: "Zone 2 long run to close the first half. You've built the base. The second half is where it becomes race-ready.",
          targetDistance: 4, intensityZone: 2,
        },
      ],
    },
  ];

  return [...firstHalf, ...secondHalf];
}

export const HYROX_8WK: PlanTemplateData = {
  name: "Hyrox 8-Week Plan",
  totalWeeks: 8,
  weeks: build8WeekHyrox(),
};

export const HYROX_16WK: PlanTemplateData = {
  name: "Hyrox 16-Week Plan",
  totalWeeks: 16,
  weeks: build16WeekHyrox(),
};

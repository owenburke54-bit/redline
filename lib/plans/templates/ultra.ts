import type { PlanTemplateData, TemplateWeek } from "./types";

// Ultra 50K 12-Week Plan
// Structure: Base (wks 1-3) → Build (wks 4-7) → Peak (wks 8-10) → Taper (wks 11-12)
// Framework: time-on-feet, back-to-back long runs (Sat+Sun), hike/run technique, RPE-based effort
// Peak weekly mileage: ~45-50mi | Peak long day: 22mi | Peak back-to-back: 18+12
// Research basis: Krismer et al. (2020 IJSPP), Scheer et al. (2021 Frontiers Sport)
function buildUltraWeeks(): TemplateWeek[] {
  return [
    // ── Week 1: Base — Aerobic Foundation ─────────────────────────────────
    {
      week: 1, phase: "Base", totalMi: 28,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest day. Ultra training is a cumulative load sport — protect recovery from the start." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2 aerobic base. Heart rate 60-70% max — fully conversational. The majority of ultra training should feel this easy. Research on ultra runners consistently shows that those who run 80%+ of mileage at truly easy effort outperform athletes who train harder on easy days (Scheer et al., 2021). Go slower than you think you should.",
          targetDistance: 5, intensityZone: 2,
        },
        {
          day: 2, type: "EASY_RUN", title: "Easy Run 6mi",
          description: "Mid-week aerobic run. Zone 2. Add a short section of trail or uneven terrain if available — proprioception and ankle stability are ultra-specific adaptations that you cannot get on flat roads.",
          targetDistance: 6, intensityZone: 2,
        },
        {
          day: 3, type: "STRENGTH", title: "Strength — Hinge & Carry",
          description: "Hip hinge focus: 4×8 Romanian deadlifts (moderate load), 3×12 single-leg Romanian deadlifts. Carry work: 3×40m farmer carries (heavy). Core: 3×60sec dead bug, 3×20 Copenhagen planks each side. Ultra racing demands eccentric leg strength for downhill running. Start building it now.",
          targetDuration: 50,
        },
        {
          day: 4, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2 recovery run. Keep it genuinely easy — you have two long runs coming this weekend.",
          targetDistance: 5, intensityZone: 2,
        },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 8mi (Sat)",
          description: "Day 1 of your back-to-back weekend runs. Zone 2 throughout. Ultra racing requires your body to run on tired legs — back-to-back runs are the most race-specific training you can do (Krismer et al., 2020). Keep this first day controlled and easy. Practice eating every 4-5mi with real food (banana, PB sandwich) — not just gels.",
          targetDistance: 8, intensityZone: 2,
        },
        {
          day: 6, type: "LONG_RUN", title: "Back-to-Back Run 4mi (Sun)",
          description: "Day 2 of your weekend back-to-back. This run is done on tired legs from yesterday — that's the entire point. Zone 2 only. If you need to walk the first mile, walk. The adaptation comes from running on accumulated fatigue. Fuel well between Saturday and Sunday.",
          targetDistance: 4, intensityZone: 2,
        },
      ],
    },

    // ── Week 2: Base — Introduce Threshold ──────────────────────────────
    {
      week: 2, phase: "Base", totalMi: 32,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Recovery from the weekend back-to-back. Full rest." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 6mi",
          description: "Zone 2 aerobic run.",
          targetDistance: 6, intensityZone: 2,
        },
        {
          day: 2, type: "TEMPO", title: "Threshold Run — 2mi tempo",
          description: "Warm up 1.5mi easy. Then 2mi at threshold pace — Zone 4, 20-30 sec/mi faster than goal marathon effort. Threshold training raises your lactate inflection point, meaning you can sustain faster paces before producing excess lactate. For ultras, this translates to ability to push hard sections without blowing up. Cool down 1.5mi. Total 5mi.",
          targetDistance: 5, intensityZone: 4,
        },
        {
          day: 3, type: "STRENGTH", title: "Strength — Quad & Posterior Chain",
          description: "Squat focus for downhill running: 4×8 Bulgarian split squats (each leg), 3×12 step-down negatives (slow 4-count lowering off a box — builds eccentric quad strength critical for downhill running). Posterior chain: 3×12 glute bridges, 3×8 Nordic hamstring curls if available. Core: 3×15 lateral band walks.",
          targetDuration: 50,
        },
        {
          day: 4, type: "EASY_RUN", title: "Easy Run 6mi",
          description: "Zone 2 before the weekend back-to-back.",
          targetDistance: 6, intensityZone: 2,
        },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 10mi (Sat)",
          description: "Day 1 of back-to-back. Zone 2 effort. Include 1mi of hiking intervals — hike powerfully for 5min, run for 5min. Most 50K races involve mandatory hiking on steep climbs. Practicing hike/run early builds the pattern. Fuel every 4-5 miles.",
          targetDistance: 10, intensityZone: 2,
        },
        {
          day: 6, type: "LONG_RUN", title: "Back-to-Back Run 5mi (Sun)",
          description: "Day 2. Tired legs. Zone 2. If pace slips 60-90sec/mi slower than yesterday — that's expected. Time on feet is the goal, not pace.",
          targetDistance: 5, intensityZone: 2,
        },
      ],
    },

    // ── Week 3: Base — Cutback ───────────────────────────────────────────
    {
      week: 3, phase: "Base", totalMi: 22,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Cutback week — full recovery." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Cutback week. Zone 2. Weeks 1-2 adaptations are consolidating. Honor the cutback.",
          targetDistance: 5, intensityZone: 2,
        },
        {
          day: 2, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Zone 2. Light week.",
          targetDistance: 4, intensityZone: 2,
        },
        {
          day: 3, type: "STRENGTH", title: "Strength — Mobility Focus",
          description: "Lighter strength session: 3×10 goblet squats, 3×10 single-leg deadlifts (bodyweight or light), 3×8 hip airplanes, 2×60sec side planks. Finish with 15min hip flexor and hamstring mobility work. Cutback strength sessions preserve the adaptation without adding load.",
          targetDuration: 40,
        },
        {
          day: 4, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Easy Zone 2.",
          targetDistance: 4, intensityZone: 2,
        },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 8mi (Sat)",
          description: "Cutback long run. Zone 2. Practice nutrition timing — 100-150 calories every 45 minutes using your planned race fuel.",
          targetDistance: 8, intensityZone: 2,
        },
        {
          day: 6, type: "REST", title: "Rest (no back-to-back)",
          description: "Single long run this week. The cutback applies to the back-to-back too. Rest and absorb.",
        },
      ],
    },

    // ── Week 4: Build — Volume Increasing ────────────────────────────────
    {
      week: 4, phase: "Build", totalMi: 36,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 6mi",
          description: "Zone 2. Build phase begins — weekly volume steps up.",
          targetDistance: 6, intensityZone: 2,
        },
        {
          day: 2, type: "INTERVALS", title: "Hill Repeats — 6×3min",
          description: "Find a hill with 6-8% grade. After 1.5mi warm-up: 6×3min hard uphill effort (Zone 4-5), walk/jog down for recovery. Hill repeats are the highest return VO2max workout for ultra runners — they load the cardiovascular system like track intervals but train the exact motor pattern you'll use on race climbs. 1.5mi cool-down. Total ~5.5mi.",
          targetDistance: 5.5, intensityZone: 5,
        },
        {
          day: 3, type: "STRENGTH", title: "Strength — Hinge & Pull",
          description: "Deadlift: 4×5 at ~75% 1RM. Single-leg Romanian deadlifts: 3×10 each leg. Pull-up or lat pulldown: 3×10. Bent-over row: 3×12. Grip strength: 3×60sec bar hang or farmer carry. Posterior chain and grip strength directly transfer to ultra race performance.",
          targetDuration: 55,
        },
        {
          day: 4, type: "EASY_RUN", title: "Easy Run 6mi",
          description: "Zone 2. Day before the key back-to-back — keep it easy.",
          targetDistance: 6, intensityZone: 2,
        },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 12mi (Sat)",
          description: "Day 1 of back-to-back. Zone 2 for the first 9mi, then 3mi of deliberate hike/run intervals (3min hike, 3min run) to practice transition between the two gaits. Include a climb if possible. Fuel every 4mi.",
          targetDistance: 12, intensityZone: 2,
        },
        {
          day: 6, type: "LONG_RUN", title: "Back-to-Back Run 6mi (Sun)",
          description: "Day 2. Tired legs from Saturday. Zone 2 — this is a success if you just get it done. Pace is irrelevant. Bring real food.",
          targetDistance: 6, intensityZone: 2,
        },
      ],
    },

    // ── Week 5: Build — Race-Pace Specific ───────────────────────────────
    {
      week: 5, phase: "Build", totalMi: 40,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest after hard back-to-back." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 7mi",
          description: "Zone 2. Volume building.",
          targetDistance: 7, intensityZone: 2,
        },
        {
          day: 2, type: "TEMPO", title: "Threshold Run — 3mi tempo",
          description: "Warm up 1.5mi easy. Then 3mi at threshold (Zone 4). Cool down 1.5mi. Total 6mi. Threshold capacity determines your ceiling — the longer you can hold a given effort, the more you can sustain over 50K.",
          targetDistance: 6, intensityZone: 4,
        },
        {
          day: 3, type: "STRENGTH", title: "Strength — Squat & Carry",
          description: "Front squat or goblet squat: 4×8, Weighted step-ups (24\" box): 3×12 each leg, Loaded carries (heavy, 40m each): farmer carry + sandbag carry. Core: 3×15 pallof press each side, 3×12 single-leg hip thrusts. Focus is loaded movement patterns that transfer to technical trails.",
          targetDuration: 55,
        },
        {
          day: 4, type: "EASY_RUN", title: "Easy Run 6mi",
          description: "Zone 2.",
          targetDistance: 6, intensityZone: 2,
        },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 14mi (Sat)",
          description: "Day 1 of the peak back-to-back weekend. Zone 2 throughout but aim for the last 3mi at goal 50K effort — easy, rhythmic, controlled. Practice your entire race nutrition strategy: gel every 45min, real food at mile 7. By the end, legs should feel worked but not destroyed.",
          targetDistance: 14, intensityZone: 2,
        },
        {
          day: 6, type: "LONG_RUN", title: "Back-to-Back Run 8mi (Sun)",
          description: "Day 2. This is the most race-specific training in the plan. Your legs are depleted. Your form will be rough. Run anyway — at Zone 2, with hike breaks on anything steep. This mimics miles 25-31 of a 50K. You are training the pattern of moving forward on tired legs.",
          targetDistance: 8, intensityZone: 2,
        },
      ],
    },

    // ── Week 6: Build — Cutback ──────────────────────────────────────────
    {
      week: 6, phase: "Build", totalMi: 26,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Cutback week after the highest back-to-back so far." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2 only. Cutback week.",
          targetDistance: 5, intensityZone: 2,
        },
        {
          day: 2, type: "INTERVALS", title: "Hill Repeats — 4×3min",
          description: "Same structure as week 4 but 4 reps instead of 6. Maintains the stimulus, reduces total load during the cutback. Shorter cutback sessions prevent detraining without adding fatigue.",
          targetDistance: 4.5, intensityZone: 5,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Zone 2.",
          targetDistance: 4, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 10mi (Sat)",
          description: "Cutback long run. Zone 2. Include hiking practice on hills. Treat it as a recovery long run — no pressure on pace.",
          targetDistance: 10, intensityZone: 2,
        },
        {
          day: 6, type: "EASY_RUN", title: "Easy Run 4mi (Sun)",
          description: "A short back-to-back even in the cutback week. Zone 2 and short — just keeping the pattern.",
          targetDistance: 4, intensityZone: 2,
        },
      ],
    },

    // ── Week 7: Build — Peak Volume Week ─────────────────────────────────
    {
      week: 7, phase: "Build", totalMi: 45,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest before the biggest week of the plan." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 8mi",
          description: "Zone 2. Peak volume week — 45 miles this week. Keep every easy day truly easy.",
          targetDistance: 8, intensityZone: 2,
        },
        {
          day: 2, type: "TEMPO", title: "Threshold Run — 4mi tempo",
          description: "Warm up 1.5mi easy. Then 4mi at threshold (Zone 4) — the longest threshold segment of the plan. Cool down 1.5mi. Total 7mi. This week is about both high volume and high quality — spacing the quality workout mid-week protects the back-to-back.",
          targetDistance: 7, intensityZone: 4,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 7mi",
          description: "Zone 2 recovery after yesterday's tempo.",
          targetDistance: 7, intensityZone: 2,
        },
        {
          day: 4, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2. Final easy day before the peak back-to-back.",
          targetDistance: 5, intensityZone: 2,
        },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 18mi (Sat) — Peak",
          description: "The longest run of the plan. Zone 2 for the first 13mi, then hike/run for the remaining 5mi — 4min run, 1min power hike, repeat. The final 5 miles simulate the feel of the second half of a 50K. Carry a vest. Fuel at 45min intervals with a mix of gels and real food. This run may take 3-4 hours. Time on feet, not pace.",
          targetDistance: 18, intensityZone: 2,
        },
        {
          day: 6, type: "LONG_RUN", title: "Back-to-Back Run 10mi (Sun)",
          description: "Day 2. 10 miles on legs that ran 18 yesterday. Zone 2 only. Expect to feel heavy — that's the stimulus. This is the most important training day of the entire plan. Zone 2 strictly — heart rate cap, walk if needed. Time on feet.",
          targetDistance: 10, intensityZone: 2,
        },
      ],
    },

    // ── Week 8: Peak — Race Simulation ───────────────────────────────────
    {
      week: 8, phase: "Peak", totalMi: 40,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Recovery from peak week back-to-back. Full rest — you earned it." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 7mi",
          description: "Zone 2. Return to full training post peak week.",
          targetDistance: 7, intensityZone: 2,
        },
        {
          day: 2, type: "INTERVALS", title: "Hill Repeats — 8×3min",
          description: "After 1.5mi warm-up: 8×3min uphill at Zone 4-5 effort, walk/jog down. The highest volume hill repeat session — your aerobic system can handle it after peak week. This builds the specific strength needed for race-day climbing. 1.5mi cool-down. Total ~7mi.",
          targetDistance: 7, intensityZone: 5,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 6mi",
          description: "Zone 2 recovery.",
          targetDistance: 6, intensityZone: 2,
        },
        {
          day: 4, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2.",
          targetDistance: 5, intensityZone: 2,
        },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 16mi (Sat) — Race Simulation",
          description: "Practice your full race-day protocol: wake up early, eat what you'll eat race morning, start running at race start time. Zone 2 with hike/run in the final 6mi. Use your exact race nutrition and hydration. Wear your race vest and shoes. This dress rehearsal eliminates GI surprises and gear issues on race day.",
          targetDistance: 16, intensityZone: 2,
        },
        {
          day: 6, type: "LONG_RUN", title: "Back-to-Back Run 9mi (Sun)",
          description: "Day 2. Zone 2. Focus on maintaining good form even when tired — this is where ultra runners either have ingrained form habits or fall apart. Tall posture, forward lean, quick turnover.",
          targetDistance: 9, intensityZone: 2,
        },
      ],
    },

    // ── Week 9: Peak — Sharpening ────────────────────────────────────────
    {
      week: 9, phase: "Peak", totalMi: 34,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 6mi",
          description: "Zone 2. Volume drops slightly as we enter the sharpening phase.",
          targetDistance: 6, intensityZone: 2,
        },
        {
          day: 2, type: "TEMPO", title: "Threshold Run — 3mi tempo (sharp)",
          description: "Warm up 1.5mi. Then 3mi at threshold (Zone 4). Slightly shorter than peak — you're maintaining quality, not loading. Should feel sharp and controlled. Cool down 1.5mi. Total 6mi.",
          targetDistance: 6, intensityZone: 4,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2 recovery.",
          targetDistance: 5, intensityZone: 2,
        },
        {
          day: 4, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Zone 2.",
          targetDistance: 4, intensityZone: 2,
        },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 13mi (Sat)",
          description: "Zone 2 with hike/run in the final 3mi. Last major long run of the plan. Keep it feeling good — no heroics. Confirm your race nutrition strategy works.",
          targetDistance: 13, intensityZone: 2,
        },
        {
          day: 6, type: "EASY_RUN", title: "Easy Run 7mi (Sun)",
          description: "Shakeout run to close the week. Zone 2. Lighter than the back-to-back weeks.",
          targetDistance: 7, intensityZone: 2,
        },
      ],
    },

    // ── Week 10: Peak — Taper Entry ──────────────────────────────────────
    {
      week: 10, phase: "Peak", totalMi: 26,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Volume drops 30% this week — taper begins." },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 6mi",
          description: "Zone 2. Volume tapering but keep running.",
          targetDistance: 6, intensityZone: 2,
        },
        {
          day: 2, type: "INTERVALS", title: "Sharpener: 5×2min Hill Repeats",
          description: "After 1mi warm-up: 5×2min uphill at Zone 4-5. Walk down for recovery. Short, sharp, maintaining neuromuscular sharpness without loading. 1mi cool-down. Total ~4mi.",
          targetDistance: 4, intensityZone: 5,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Zone 2.",
          targetDistance: 4, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        {
          day: 5, type: "LONG_RUN", title: "Long Run 10mi (Sat)",
          description: "Last long run before the taper. Zone 2. Include 2mi of race-pace hike/run. Focus on nutrition and gear confirmation. End feeling fresh and confident — not worked.",
          targetDistance: 10, intensityZone: 2,
        },
        {
          day: 6, type: "EASY_RUN", title: "Easy Run 4mi (Sun)",
          description: "Light back-to-back — just keeping the motor warm.",
          targetDistance: 4, intensityZone: 2,
        },
      ],
    },

    // ── Week 11: Taper ───────────────────────────────────────────────────
    {
      week: 11, phase: "Taper", totalMi: 16,
      workouts: [
        {
          day: 0, type: "REST", title: "Rest",
          description: "Taper week. Volume drops 50%. Intensity stays — fitness does not come from this week's training. It comes from the previous 10 weeks. Everything you do this week should make you MORE rested, not less. Taper madness (feeling out of shape, restless legs) is normal and does not reflect actual fitness.",
        },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 4mi",
          description: "Zone 2.",
          targetDistance: 4, intensityZone: 2,
        },
        {
          day: 2, type: "TEMPO", title: "Taper Sharpener: 2mi tempo",
          description: "Warm up 1mi. Then 2mi at threshold pace. Cool down 1mi. Total 4mi. Last quality session before race week. Keep it controlled — you should feel sharp, not worked.",
          targetDistance: 4, intensityZone: 4,
        },
        {
          day: 3, type: "EASY_RUN", title: "Easy Run 3mi",
          description: "Zone 2. Light.",
          targetDistance: 3, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest. Eat well. Sleep." },
        {
          day: 5, type: "EASY_RUN", title: "Easy Run 5mi",
          description: "Zone 2. The longest run of the taper. Should feel easy. If you feel great — resist the urge to go harder. You need to arrive at race day fresh.",
          targetDistance: 5, intensityZone: 2,
        },
        { day: 6, type: "REST", title: "Rest", description: "Rest. Carbohydrate load begins: 7-10g carb/kg body weight over race-day minus 2 and minus 1." },
      ],
    },

    // ── Week 12: Race Week ───────────────────────────────────────────────
    {
      week: 12, phase: "Race", totalMi: 35.2,
      workouts: [
        {
          day: 0, type: "REST", title: "Rest",
          description: "Rest. Finalize your gear: poles (if using), vest packed with nutrition, drop bag organized. Carb load: high-starch, low-fiber meals. Avoid vegetables and high-fat foods — they slow gastric emptying.",
        },
        {
          day: 1, type: "EASY_RUN", title: "Easy Run 3mi + strides",
          description: "3mi easy + 4×30sec strides at comfortable race effort. Keeps legs sharp without adding fatigue.",
          targetDistance: 3, intensityZone: 2,
        },
        {
          day: 2, type: "EASY_RUN", title: "Race Prep Jog 2mi",
          description: "15min easy jog, 4×20sec at race pace, walk recovery. Total under 20 minutes. Priming the legs, not training them.",
          targetDistance: 2, intensityZone: 2,
        },
        { day: 3, type: "REST", title: "Rest", description: "Rest. Final gear check. Read the course profile — mark aid station locations." },
        { day: 4, type: "REST", title: "Rest", description: "Rest day before the race. Easy walk only if restless. Sleep early." },
        {
          day: 5, type: "RACE", title: "50K Race Day",
          description: "Race strategy: start conservatively — most 50K blow-ups happen in miles 1-8 when everything feels easy. Run your easy training pace through mile 10, not goal pace. Use power hiking on any climb over 10% grade — this is faster over a 50K than running hills. Aid stations: 2-3 minutes max. Final 5 miles: give everything. You've trained for exactly this.",
          targetDistance: 31.1,
        },
        { day: 6, type: "REST", title: "Recovery", description: "You finished a 50K. Nothing today except food, fluids, and celebrating. Ice bath optional. Walk if you can." },
      ],
    },
  ];
}

export const ULTRA_12WK: PlanTemplateData = {
  name: "Ultra 50K 12-Week Plan",
  totalWeeks: 12,
  weeks: buildUltraWeeks(),
};

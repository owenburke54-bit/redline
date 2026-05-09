import type { PlanTemplateData, TemplateWeek, TemplateWorkout } from "./types";

// Hal Higdon Novice 1 — 18 weeks
// Mon rest, Tue easy, Wed easy, Thu easy, Fri rest, Sat long, Sun cross
// All distances in miles
function buildNoviceWeeks(): TemplateWeek[] {
  const schedule = [
    // [tue, wed, thu, sat_long] in miles
    [3, 3, 3, 6],
    [3, 5, 3, 7],
    [3, 5, 3, 8],
    [3, 5, 3, 9],
    [3, 6, 3, 10],
    [3, 6, 3, 7],  // cutback
    [3, 6, 5, 11],
    [3, 7, 5, 12],
    [3, 7, 5, 13],
    [3, 7, 5, 10], // cutback
    [3, 8, 5, 15],
    [3, 8, 5, 16],
    [3, 8, 5, 18],
    [3, 8, 5, 13], // cutback
    [3, 8, 6, 20],
    [5, 5, 3, 12], // taper
    [3, 3, 3, 8],  // taper
    [3, 2, 0, 0],  // race week
  ];

  const phases = [
    "Base", "Base", "Base", "Base",
    "Build", "Build", "Build", "Build",
    "Build", "Build", "Peak", "Peak",
    "Peak", "Peak", "Peak",
    "Taper", "Taper", "Race",
  ];

  return schedule.map(([tue, wed, thu, sat], i) => {
    const week = i + 1;
    const isRaceWeek = week === 18;
    const totalMi = tue + wed + thu + sat + (isRaceWeek ? 26.2 : 0);

    return {
      week,
      phase: phases[i],
      totalMi,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest day. Let your body recover." },
        {
          day: 1, type: "EASY_RUN", title: `Easy Run ${tue}mi`,
          description: `Easy conversational pace run. Zone 2 effort — you should be able to hold a full conversation.`,
          targetDistance: tue, intensityZone: 2,
        },
        {
          day: 2, type: "EASY_RUN", title: `Easy Run ${wed}mi`,
          description: `Mid-week easy run. Keep it comfortable. Focus on time on feet, not pace.`,
          targetDistance: wed, intensityZone: 2,
        },
        {
          day: 3, type: "EASY_RUN", title: `Easy Run ${thu}mi`,
          description: `Easy run. Same effort as Tuesday — relaxed and controlled.`,
          targetDistance: thu, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest before your long run tomorrow." },
        isRaceWeek
          ? { day: 5, type: "RACE", title: "Marathon Race Day", description: "Race day. Trust your training. Start conservative, run your own race.", targetDistance: 26.2 }
          : {
              day: 5, type: "LONG_RUN", title: `Long Run ${sat}mi`,
              description: `The week's key session. Run at a slow, easy pace — well below your goal marathon pace. Walk breaks are fine.`,
              targetDistance: sat, intensityZone: 2,
            },
        {
          day: 6, type: "CROSS_TRAIN", title: "Cross Training",
          description: "30-45 min low-impact activity: cycling, swimming, yoga, or walking. Active recovery — keep the effort easy.",
          targetDuration: 40, intensityZone: 1,
        },
      ].filter(w => w.targetDistance !== 0 || w.type === "REST" || w.type === "CROSS_TRAIN" || w.type === "RACE") as TemplateWorkout[],
    };
  });
}

// Hal Higdon Intermediate 1 — 18 weeks
// Adds tempo runs and pace runs
// All distances in miles
function buildIntermediateWeeks(): TemplateWeek[] {
  const schedule = [
    [3, 5, 3, 8],
    [3, 5, 5, 9],
    [3, 6, 5, 10],
    [3, 6, 5, 9],   // cutback
    [5, 7, 5, 12],
    [5, 7, 5, 10],  // cutback
    [5, 8, 5, 13],
    [5, 8, 6, 14],
    [5, 9, 6, 15],
    [5, 9, 6, 12],  // cutback
    [5, 9, 6, 17],
    [5, 10, 6, 18],
    [5, 10, 6, 20],
    [5, 10, 6, 15], // cutback
    [5, 10, 7, 20],
    [5, 7, 5, 12],  // taper
    [5, 5, 3, 8],   // taper
    [3, 2, 0, 0],   // race
  ];

  const phases = [
    "Base", "Base", "Base", "Base",
    "Build", "Build", "Build", "Build",
    "Build", "Build", "Peak", "Peak",
    "Peak", "Peak", "Peak",
    "Taper", "Taper", "Race",
  ];

  // Alternate tempo and pace runs on Wednesday
  return schedule.map(([tue, wed, thu, sat], i) => {
    const week = i + 1;
    const isRaceWeek = week === 18;
    const isTempo = week % 2 === 0;

    return {
      week,
      phase: phases[i],
      totalMi: tue + wed + thu + sat,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest day." },
        {
          day: 1, type: "EASY_RUN", title: `Easy Run ${tue}mi`,
          description: "Easy conversational pace. Zone 2.", targetDistance: tue, intensityZone: 2,
        },
        isTempo
          ? {
              day: 2, type: "TEMPO", title: `Tempo Run ${wed}mi`,
              description: `Warm up 1mi easy, then ${wed - 2}mi at comfortably hard pace (zone 4, about 80% effort), cool down 1mi easy.`,
              targetDistance: wed, intensityZone: 4,
            }
          : {
              day: 2, type: "EASY_RUN", title: `Pace Run ${wed}mi`,
              description: `Run ${Math.round(wed * 0.6)}mi at marathon goal pace, bookended by easy warm-up and cool-down.`,
              targetDistance: wed, intensityZone: 3,
            },
        {
          day: 3, type: "EASY_RUN", title: `Easy Run ${thu}mi`,
          description: "Easy recovery run.", targetDistance: thu, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest before long run." },
        isRaceWeek
          ? { day: 5, type: "RACE", title: "Marathon Race Day", description: "Race day. Start conservative. Trust your training.", targetDistance: 26.2 }
          : {
              day: 5, type: "LONG_RUN", title: `Long Run ${sat}mi`,
              description: "Long slow distance. Stay easy — last 3mi can be at marathon goal pace.",
              targetDistance: sat, intensityZone: 2,
            },
        {
          day: 6, type: "CROSS_TRAIN", title: "Cross Training",
          description: "30-45 min easy cross training or rest.", targetDuration: 40, intensityZone: 1,
        },
      ].filter(w => (w as { targetDistance?: number }).targetDistance !== 0 || w.type === "REST" || w.type === "CROSS_TRAIN" || w.type === "RACE") as TemplateWorkout[],
    };
  });
}

// Hal Higdon Advanced — 18 weeks (higher mileage, adds intervals)
// All distances in miles
function buildAdvancedWeeks(): TemplateWeek[] {
  const schedule = [
    [5, 6, 5, 10],
    [5, 6, 5, 11],
    [5, 8, 5, 13],
    [5, 8, 5, 10],  // cutback
    [6, 9, 6, 15],
    [6, 9, 6, 12],  // cutback
    [6, 10, 6, 17],
    [6, 10, 7, 17],
    [6, 10, 7, 18],
    [6, 10, 7, 15], // cutback
    [6, 12, 7, 20],
    [6, 12, 8, 20],
    [6, 12, 8, 22],
    [6, 12, 8, 16], // cutback
    [6, 12, 8, 20],
    [6, 8, 6, 12],  // taper
    [5, 5, 3, 8],   // taper
    [3, 2, 0, 0],   // race
  ];

  const phases = [
    "Base", "Base", "Base", "Base",
    "Build", "Build", "Build", "Build",
    "Build", "Build", "Peak", "Peak",
    "Peak", "Peak", "Peak",
    "Taper", "Taper", "Race",
  ];

  return schedule.map(([tue, wed, thu, sat], i) => {
    const week = i + 1;
    const isRaceWeek = week === 18;
    const weekMod = week % 3;

    const wedWorkout = weekMod === 0
      ? { day: 2, type: "INTERVALS" as const, title: `Intervals ${wed}mi`, description: `1mi warm-up. 6x800m at 5K pace with 400m jog recovery. Cool down. Total ~${wed}mi.`, targetDistance: wed, intensityZone: 5 }
      : weekMod === 1
      ? { day: 2, type: "TEMPO" as const, title: `Tempo Run ${wed}mi`, description: `1mi easy, ${wed - 2}mi at lactate threshold pace (comfortably hard), 1mi easy.`, targetDistance: wed, intensityZone: 4 }
      : { day: 2, type: "EASY_RUN" as const, title: `Pace Run ${wed}mi`, description: `${Math.round(wed * 0.5)}mi at marathon goal pace within an easy run.`, targetDistance: wed, intensityZone: 3 };

    return {
      week,
      phase: phases[i],
      totalMi: tue + wed + thu + sat,
      workouts: [
        { day: 0, type: "REST" as const, title: "Rest", description: "Full rest day." },
        { day: 1, type: "EASY_RUN" as const, title: `Easy Run ${tue}mi`, description: "Easy Zone 2 run.", targetDistance: tue, intensityZone: 2 },
        wedWorkout,
        { day: 3, type: "EASY_RUN" as const, title: `Easy Run ${thu}mi`, description: "Easy recovery run.", targetDistance: thu, intensityZone: 2 },
        { day: 4, type: "REST" as const, title: "Rest", description: "Rest before long run." },
        isRaceWeek
          ? { day: 5, type: "RACE" as const, title: "Marathon Race Day", description: "Race day. Execute your plan.", targetDistance: 26.2 }
          : { day: 5, type: "LONG_RUN" as const, title: `Long Run ${sat}mi`, description: "Long run at easy pace. Final 3mi can progress to marathon goal pace.", targetDistance: sat, intensityZone: 2 },
        { day: 6, type: "CROSS_TRAIN" as const, title: "Cross Training / Recovery Run", description: "Easy 3mi recovery jog or 40min cross training.", targetDuration: 45, intensityZone: 1 },
      ].filter(w => (w as { targetDistance?: number }).targetDistance !== 0 || w.type === "REST" || w.type === "CROSS_TRAIN" || w.type === "RACE"),
    };
  });
}

export const HAL_HIGDON_NOVICE: PlanTemplateData = {
  name: "Hal Higdon Novice 1 — Marathon",
  totalWeeks: 18,
  weeks: buildNoviceWeeks(),
};

export const HAL_HIGDON_INTERMEDIATE: PlanTemplateData = {
  name: "Hal Higdon Intermediate 1 — Marathon",
  totalWeeks: 18,
  weeks: buildIntermediateWeeks(),
};

export const HAL_HIGDON_ADVANCED: PlanTemplateData = {
  name: "Hal Higdon Advanced — Marathon",
  totalWeeks: 18,
  weeks: buildAdvancedWeeks(),
};

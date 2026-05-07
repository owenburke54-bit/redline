import type { PlanTemplateData, TemplateWeek, TemplateWorkout } from "./types";

// Hal Higdon Novice 1 — 18 weeks
// Mon rest, Tue easy, Wed easy, Thu easy, Fri rest, Sat long, Sun cross
function buildNoviceWeeks(): TemplateWeek[] {
  const schedule = [
    // [tue, wed, thu, sat_long] in km
    [5, 5, 5, 10],
    [5, 8, 5, 11],
    [5, 8, 5, 13],
    [5, 8, 5, 14],
    [5, 10, 5, 16],
    [5, 10, 5, 11], // cutback
    [5, 10, 8, 18],
    [5, 11, 8, 19],
    [5, 11, 8, 21],
    [5, 11, 8, 16], // cutback
    [5, 13, 8, 24],
    [5, 13, 8, 26],
    [5, 13, 8, 29],
    [5, 13, 8, 21], // cutback
    [5, 13, 10, 32],
    [8, 8, 5, 19], // taper
    [5, 5, 5, 13], // taper
    [5, 3, 0, 0],  // race week
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
    const totalKm = tue + wed + thu + sat + (isRaceWeek ? 42.2 : 0);

    return {
      week,
      phase: phases[i],
      totalKm,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest day. Let your body recover." },
        {
          day: 1, type: "EASY_RUN", title: `Easy Run ${tue}km`,
          description: `Easy conversational pace run. Zone 2 effort — you should be able to hold a full conversation.`,
          targetDistance: tue, intensityZone: 2,
        },
        {
          day: 2, type: "EASY_RUN", title: `Easy Run ${wed}km`,
          description: `Mid-week easy run. Keep it comfortable. Focus on time on feet, not pace.`,
          targetDistance: wed, intensityZone: 2,
        },
        {
          day: 3, type: "EASY_RUN", title: `Easy Run ${thu}km`,
          description: `Easy run. Same effort as Tuesday — relaxed and controlled.`,
          targetDistance: thu, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest before your long run tomorrow." },
        isRaceWeek
          ? { day: 5, type: "RACE", title: "Marathon Race Day", description: "Race day. Trust your training. Start conservative, run your own race.", targetDistance: 42.2 }
          : {
              day: 5, type: "LONG_RUN", title: `Long Run ${sat}km`,
              description: `The week's key session. Run at a slow, easy pace — at least 90 seconds per km slower than goal marathon pace. Walk breaks are fine.`,
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
function buildIntermediateWeeks(): TemplateWeek[] {
  const schedule = [
    [5, 8, 5, 13],
    [5, 8, 8, 14],
    [5, 10, 8, 16],
    [5, 10, 8, 14], // cutback
    [8, 11, 8, 19],
    [8, 11, 8, 16], // cutback
    [8, 13, 8, 21],
    [8, 13, 10, 22],
    [8, 14, 10, 24],
    [8, 14, 10, 19], // cutback
    [8, 14, 10, 27],
    [8, 16, 10, 29],
    [8, 16, 10, 32],
    [8, 16, 10, 24], // cutback
    [8, 16, 11, 32],
    [8, 11, 8, 19], // taper
    [8, 8, 5, 13],  // taper
    [5, 3, 0, 0],   // race
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
      totalKm: tue + wed + thu + sat,
      workouts: [
        { day: 0, type: "REST", title: "Rest", description: "Full rest day." },
        {
          day: 1, type: "EASY_RUN", title: `Easy Run ${tue}km`,
          description: "Easy conversational pace. Zone 2.", targetDistance: tue, intensityZone: 2,
        },
        isTempo
          ? {
              day: 2, type: "TEMPO", title: `Tempo Run ${wed}km`,
              description: `Warm up 1.5km easy, then ${wed - 3}km at comfortably hard pace (zone 4, about 80% effort), cool down 1.5km easy.`,
              targetDistance: wed, intensityZone: 4,
            }
          : {
              day: 2, type: "EASY_RUN", title: `Pace Run ${wed}km`,
              description: `Run ${Math.round(wed * 0.6)}km at marathon goal pace, bookended by easy warm-up and cool-down.`,
              targetDistance: wed, intensityZone: 3,
            },
        {
          day: 3, type: "EASY_RUN", title: `Easy Run ${thu}km`,
          description: "Easy recovery run.", targetDistance: thu, intensityZone: 2,
        },
        { day: 4, type: "REST", title: "Rest", description: "Rest before long run." },
        isRaceWeek
          ? { day: 5, type: "RACE", title: "Marathon Race Day", description: "Race day. Start conservative. Trust your training.", targetDistance: 42.2 }
          : {
              day: 5, type: "LONG_RUN", title: `Long Run ${sat}km`,
              description: "Long slow distance. Stay easy — last 3km can be at marathon goal pace.",
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
function buildAdvancedWeeks(): TemplateWeek[] {
  const schedule = [
    [8, 10, 8, 16],
    [8, 10, 8, 18],
    [8, 13, 8, 21],
    [8, 13, 8, 16], // cutback
    [10, 14, 10, 24],
    [10, 14, 10, 19], // cutback
    [10, 16, 10, 27],
    [10, 16, 11, 27],
    [10, 16, 11, 29],
    [10, 16, 11, 24], // cutback
    [10, 19, 11, 32],
    [10, 19, 13, 32],
    [10, 19, 13, 35],
    [10, 19, 13, 26], // cutback
    [10, 19, 13, 32],
    [10, 13, 10, 19], // taper
    [8, 8, 5, 13],   // taper
    [5, 3, 0, 0],    // race
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
      ? { day: 2, type: "INTERVALS" as const, title: `Intervals ${wed}km`, description: `1.5km warm-up. 6x800m at 5K pace with 400m jog recovery. Cool down. Total ~${wed}km.`, targetDistance: wed, intensityZone: 5 }
      : weekMod === 1
      ? { day: 2, type: "TEMPO" as const, title: `Tempo Run ${wed}km`, description: `1.5km easy, ${wed - 3}km at lactate threshold pace (comfortably hard), 1.5km easy.`, targetDistance: wed, intensityZone: 4 }
      : { day: 2, type: "EASY_RUN" as const, title: `Pace Run ${wed}km`, description: `${Math.round(wed * 0.5)}km at marathon goal pace within an easy run.`, targetDistance: wed, intensityZone: 3 };

    return {
      week,
      phase: phases[i],
      totalKm: tue + wed + thu + sat,
      workouts: [
        { day: 0, type: "REST" as const, title: "Rest", description: "Full rest day." },
        { day: 1, type: "EASY_RUN" as const, title: `Easy Run ${tue}km`, description: "Easy Zone 2 run.", targetDistance: tue, intensityZone: 2 },
        wedWorkout,
        { day: 3, type: "EASY_RUN" as const, title: `Easy Run ${thu}km`, description: "Easy recovery run.", targetDistance: thu, intensityZone: 2 },
        { day: 4, type: "REST" as const, title: "Rest", description: "Rest before long run." },
        isRaceWeek
          ? { day: 5, type: "RACE" as const, title: "Marathon Race Day", description: "Race day. Execute your plan.", targetDistance: 42.2 }
          : { day: 5, type: "LONG_RUN" as const, title: `Long Run ${sat}km`, description: "Long run at easy pace. Final 5km can progress to marathon goal pace.", targetDistance: sat, intensityZone: 2 },
        { day: 6, type: "CROSS_TRAIN" as const, title: "Cross Training / Recovery Run", description: "Easy 5km recovery jog or 40min cross training.", targetDuration: 45, intensityZone: 1 },
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

import type { PlanTemplateData, TemplateWeek, HyroxStation } from "./types";

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
  { station: "Wall Balls", reps: 75, weightKg: 4 },
];

// 8-week Hyrox plan
function build8WeekHyrox(): TemplateWeek[] {
  return [
    // Week 1 — Introduction
    {
      week: 1, phase: "Base", totalKm: 18,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 5km", description: "Easy zone 2 run to start the week.", targetDistance: 5, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Work: SkiErg + Farmers Carry", description: "4x500m SkiErg @ moderate pace, 2min rest between. Then 4x50m Farmers Carry (2x24kg). Focus on form.", intensityZone: 3 },
        { day: 2, type: "STRENGTH", title: "Strength", description: "Squats 4x8, Deadlifts 3x8, Pull-ups 3x max, Box jumps 3x10. General strength foundation.", intensityZone: 3 },
        { day: 3, type: "TEMPO", title: "Tempo Run 5km", description: "5km at comfortably hard pace (zone 4). This is your running base builder.", targetDistance: 5, intensityZone: 4 },
        { day: 4, type: "REST", title: "Rest", description: "Full rest day." },
        { day: 5, type: "HYROX_STATION_WORK", title: "Station Work: Sled + Wall Balls", description: "Sled push 6x20m (bodyweight on sled). Sled pull 6x20m. Wall balls 5x15 reps (4kg). Rest 90s between sets.", intensityZone: 4 },
        { day: 6, type: "EASY_RUN", title: "Easy Run 8km", description: "Long easy run. Zone 2. Build aerobic base.", targetDistance: 8, intensityZone: 2 },
      ],
    },
    // Week 2
    {
      week: 2, phase: "Base", totalKm: 20,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 5km", description: "Easy zone 2.", targetDistance: 5, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Work: Rowing + Sandbag Lunges", description: "3x500m rowing @ 2:10/500m target. Then sandbag lunges 4x20m (20kg). Rest 2min between efforts.", intensityZone: 3 },
        { day: 2, type: "STRENGTH", title: "Strength", description: "Romanian deadlifts 4x10, KB swings 4x15, Step-ups 3x12 each, Pull-ups 3x max.", intensityZone: 3 },
        { day: 3, type: "TEMPO", title: "Tempo Run 5km", description: "Zone 4 tempo run.", targetDistance: 5, intensityZone: 4 },
        { day: 4, type: "REST", title: "Rest", description: "Rest day." },
        { day: 5, type: "HYROX_STATION_WORK", title: "Station Work: Burpee Broad Jumps + SkiErg", description: "Burpee broad jumps 4x20m. Rest 2min. SkiErg 3x750m at race pace effort. Rest 3min.", intensityZone: 4 },
        { day: 6, type: "EASY_RUN", title: "Easy Run 10km", description: "Zone 2 long run.", targetDistance: 10, intensityZone: 2 },
      ],
    },
    // Week 3
    {
      week: 3, phase: "Build", totalKm: 22,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 5km", description: "Zone 2 opener.", targetDistance: 5, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Work: Full Sled Circuit", description: "Sled push 4x30m (bodyweight). Sled pull 4x30m (half bodyweight). 3min rest between. Add a 400m run between sled sets.", intensityZone: 4 },
        { day: 2, type: "STRENGTH", title: "Strength", description: "Back squat 5x5 (heavy), Weighted pull-ups 4x6, Leg press 3x12, KB swings 4x20.", intensityZone: 4 },
        { day: 3, type: "INTERVALS", title: "Run Intervals", description: "6x400m at 5K effort with 400m jog recovery. Total ~5km.", targetDistance: 5, intensityZone: 5 },
        { day: 4, type: "REST", title: "Rest", description: "Rest day." },
        { day: 5, type: "HYROX_STATION_WORK", title: "Station Work: Rowing + Farmers + Wall Balls", description: "3x(500m row + 50m farmers carry + 20 wall balls). Rest 3min between rounds.", intensityZone: 4 },
        { day: 6, type: "EASY_RUN", title: "Easy Run 12km", description: "Zone 2 long run.", targetDistance: 12, intensityZone: 2 },
      ],
    },
    // Week 4 — Cutback
    {
      week: 4, phase: "Build", totalKm: 16,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 5km", description: "Easy recovery week opener.", targetDistance: 5, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Work: SkiErg + Sandbag Lunges (light)", description: "3x500m SkiErg (easy pace). 3x20m sandbag lunges. Cutback week — reduced intensity.", intensityZone: 3 },
        { day: 2, type: "REST", title: "Rest", description: "Extra rest — cutback week." },
        { day: 3, type: "TEMPO", title: "Tempo Run 5km", description: "Zone 4 tempo.", targetDistance: 5, intensityZone: 4 },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        { day: 5, type: "HYROX_SIM", title: "Half Hyrox Sim", description: "Run stations 1-8 only (first half of race). Focus on transitions and pacing. This is your first sim — don't go all out.", stations: HYROX_SIM_STATIONS.slice(0, 8), isHyroxSim: true, intensityZone: 4 },
        { day: 6, type: "EASY_RUN", title: "Easy Run 6km", description: "Easy recovery run.", targetDistance: 6, intensityZone: 2 },
      ],
    },
    // Week 5
    {
      week: 5, phase: "Build", totalKm: 24,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 6km", description: "Zone 2.", targetDistance: 6, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Work: Sled + Burpees", description: "Sled push 5x30m (bodyweight). 2min rest. Burpee broad jumps 5x20m. 2min rest. Repeat twice.", intensityZone: 4 },
        { day: 2, type: "STRENGTH", title: "Strength (Heavy)", description: "Squat 5x3 (heavy), Deadlift 4x4, Weighted pull-ups 4x5, Box jumps 4x8.", intensityZone: 4 },
        { day: 3, type: "INTERVALS", title: "Run Intervals", description: "8x400m at 5K pace. 90s rest between. Total ~6km.", targetDistance: 6, intensityZone: 5 },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        { day: 5, type: "HYROX_STATION_WORK", title: "Station Work: Full Circuit", description: "1km run + SkiErg 1000m + 1km run + Rowing 1000m + 1km run + Wall Balls 50 reps. Race pace effort.", intensityZone: 5 },
        { day: 6, type: "LONG_RUN", title: "Long Run 11km", description: "Zone 2 long run.", targetDistance: 11, intensityZone: 2 },
      ],
    },
    // Week 6
    {
      week: 6, phase: "Peak", totalKm: 24,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 6km", description: "Zone 2.", targetDistance: 6, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Work: Sled + Sandbag (Race Weight)", description: "Sled push 4x50m at race weight. Sled pull 4x50m. 3min rest. Sandbag lunges 4x25m (race weight).", intensityZone: 4 },
        { day: 2, type: "STRENGTH", title: "Strength", description: "Squat 4x6, Deadlift 4x6, Pull-ups 4x max, KB swings 5x20.", intensityZone: 4 },
        { day: 3, type: "TEMPO", title: "Tempo Run 6km", description: "Zone 4 tempo run.", targetDistance: 6, intensityZone: 4 },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        { day: 5, type: "HYROX_SIM", title: "Full Hyrox Sim", description: "Full race simulation — all 8 stations at race effort. Time yourself. This is your benchmark.", stations: HYROX_SIM_STATIONS, isHyroxSim: true, intensityZone: 5 },
        { day: 6, type: "EASY_RUN", title: "Easy Run 6km", description: "Easy shakeout after sim.", targetDistance: 6, intensityZone: 2 },
      ],
    },
    // Week 7 — Taper
    {
      week: 7, phase: "Taper", totalKm: 16,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 5km", description: "Taper begins. Keep it easy.", targetDistance: 5, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Work: Light SkiErg + Carries", description: "2x500m SkiErg (moderate). 2x50m farmers carry. Keep it short — you're sharpening, not building.", intensityZone: 3 },
        { day: 2, type: "STRENGTH", title: "Strength (Light)", description: "Squat 3x5 (60%), Pull-ups 3x5, Box jumps 3x5. Short and sharp.", intensityZone: 3 },
        { day: 3, type: "TEMPO", title: "Short Tempo 4km", description: "4km tempo run. Stay sharp.", targetDistance: 4, intensityZone: 4 },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        { day: 5, type: "HYROX_STATION_WORK", title: "Race Pace Openers", description: "Run 2x1km at race pace. 2x200m SkiErg at race pace. That's it. Stay fresh.", intensityZone: 4 },
        { day: 6, type: "EASY_RUN", title: "Easy Run 4km", description: "Short easy run. Trust the process.", targetDistance: 4, intensityZone: 2 },
      ],
    },
    // Week 8 — Race
    {
      week: 8, phase: "Race", totalKm: 12,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 3km", description: "Short easy shakeout.", targetDistance: 3, intensityZone: 1 },
        { day: 1, type: "REST", title: "Rest", description: "Rest. Eat well. Hydrate." },
        { day: 2, type: "HYROX_STATION_WORK", title: "Race Day Openers", description: "5min easy jog. 4x100m strides. A few SkiErg pulls. Stay loose.", intensityZone: 2 },
        { day: 3, type: "REST", title: "Rest", description: "Rest. Visualize. Prepare gear." },
        { day: 4, type: "REST", title: "Rest", description: "Rest day before race." },
        { day: 5, type: "RACE", title: "Hyrox Race Day", description: "Race day. Warm up properly. Start the runs controlled. Attack the stations. You've done the work.", isHyroxSim: false },
        { day: 6, type: "REST", title: "Recovery", description: "You raced. Rest and celebrate." },
      ],
    },
  ];
}

// 16-week Hyrox plan — build the first 8 weeks as extended base, then mirror the 8-week plan
function build16WeekHyrox(): TemplateWeek[] {
  const week8Plan = build8WeekHyrox();

  const firstHalf: TemplateWeek[] = [
    {
      week: 1, phase: "Base", totalKm: 16,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 5km", description: "Zone 2 base building.", targetDistance: 5, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Intro: SkiErg", description: "Learn the SkiErg. 5x300m with 2min rest. Focus on technique — arm drive, hip hinge.", intensityZone: 2 },
        { day: 2, type: "STRENGTH", title: "Strength Foundation", description: "Squat 3x10, Deadlift 3x10, Pull-ups 3x8, Lunges 3x12 each. Base strength.", intensityZone: 3 },
        { day: 3, type: "EASY_RUN", title: "Easy Run 5km", description: "Easy zone 2.", targetDistance: 5, intensityZone: 2 },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        { day: 5, type: "HYROX_STATION_WORK", title: "Station Intro: Farmers Carry + Wall Balls", description: "Farmers carry 4x50m (light). Wall balls 4x10 (light). Get comfortable with the movements.", intensityZone: 2 },
        { day: 6, type: "EASY_RUN", title: "Easy Run 6km", description: "Easy long run.", targetDistance: 6, intensityZone: 2 },
      ],
    },
    {
      week: 2, phase: "Base", totalKm: 17,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 5km", description: "Zone 2.", targetDistance: 5, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Work: Rowing", description: "5x400m rowing at moderate pace. Focus on technique — drive with legs, not arms. Rest 90s.", intensityZone: 3 },
        { day: 2, type: "STRENGTH", title: "Strength", description: "Squat 4x8, Deadlift 3x8, KB swings 4x15, Pull-ups 3x max.", intensityZone: 3 },
        { day: 3, type: "EASY_RUN", title: "Easy Run 5km", description: "Zone 2.", targetDistance: 5, intensityZone: 2 },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        { day: 5, type: "HYROX_STATION_WORK", title: "Station Work: Sled Intro", description: "Sled push 4x20m (light). Sled pull 4x20m (light). Learn the movement — stay low, drive through the hips.", intensityZone: 3 },
        { day: 6, type: "EASY_RUN", title: "Easy Run 7km", description: "Zone 2 long run.", targetDistance: 7, intensityZone: 2 },
      ],
    },
    {
      week: 3, phase: "Base", totalKm: 19,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 5km", description: "Zone 2.", targetDistance: 5, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Work: SkiErg + Rowing", description: "3x(500m SkiErg + 500m row). 3min rest between rounds. Pace: moderate.", intensityZone: 3 },
        { day: 2, type: "STRENGTH", title: "Strength", description: "Squat 4x8, Romanian deadlift 4x10, Step-ups 3x12, Pull-ups 3x max.", intensityZone: 3 },
        { day: 3, type: "TEMPO", title: "Tempo Run 5km", description: "First tempo. Zone 4.", targetDistance: 5, intensityZone: 4 },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        { day: 5, type: "HYROX_STATION_WORK", title: "Station Work: Sled + Burpee Broad Jumps", description: "Sled push 4x25m. Sled pull 4x25m. Burpee broad jumps 4x15m. Rest 2min between.", intensityZone: 3 },
        { day: 6, type: "EASY_RUN", title: "Easy Run 9km", description: "Zone 2 long run.", targetDistance: 9, intensityZone: 2 },
      ],
    },
    {
      week: 4, phase: "Base", totalKm: 14,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 5km", description: "Cutback week. Easy.", targetDistance: 5, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Work: Light Circuit", description: "2x(300m SkiErg + 300m row + 15 wall balls). Rest 3min. Cutback week.", intensityZone: 2 },
        { day: 2, type: "REST", title: "Rest", description: "Extra rest this week." },
        { day: 3, type: "EASY_RUN", title: "Easy Run 5km", description: "Zone 2.", targetDistance: 5, intensityZone: 2 },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        { day: 5, type: "STRENGTH", title: "Strength", description: "Full body moderate session. No max effort.", intensityZone: 3 },
        { day: 6, type: "EASY_RUN", title: "Easy Run 4km", description: "Short easy run.", targetDistance: 4, intensityZone: 2 },
      ],
    },
    {
      week: 5, phase: "Build", totalKm: 21,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 5km", description: "Zone 2.", targetDistance: 5, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Work: Farmers + Sandbag Lunges", description: "Farmers carry 4x50m (20kg each). Sandbag lunges 4x20m (15kg). Build carry capacity.", intensityZone: 3 },
        { day: 2, type: "STRENGTH", title: "Strength (Building)", description: "Squat 5x5, Deadlift 4x5, Weighted pull-ups 3x6, KB swings 5x15.", intensityZone: 4 },
        { day: 3, type: "INTERVALS", title: "Run Intervals", description: "5x600m at 5K pace. 2min rest. Total ~5km.", targetDistance: 5, intensityZone: 5 },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        { day: 5, type: "HYROX_STATION_WORK", title: "Station Work: Sled (Race Weight)", description: "Sled push 4x30m (race weight). Sled pull 4x30m (race weight). 3min rest. This is the hard one.", intensityZone: 4 },
        { day: 6, type: "LONG_RUN", title: "Long Run 11km", description: "Zone 2 long run.", targetDistance: 11, intensityZone: 2 },
      ],
    },
    {
      week: 6, phase: "Build", totalKm: 22,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 6km", description: "Zone 2.", targetDistance: 6, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Work: SkiErg Race Pace", description: "4x500m SkiErg at race pace. Full rest between. Then 3x300m faster than race pace.", intensityZone: 5 },
        { day: 2, type: "STRENGTH", title: "Strength", description: "Squat 4x6, Deadlift 4x6, Pull-ups 4x max, Box jumps 4x8.", intensityZone: 4 },
        { day: 3, type: "TEMPO", title: "Tempo Run 6km", description: "Zone 4 tempo.", targetDistance: 6, intensityZone: 4 },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        { day: 5, type: "HYROX_SIM", title: "Half Hyrox Sim", description: "Stations 1-8. Race effort. Time it.", stations: HYROX_SIM_STATIONS.slice(0, 8), isHyroxSim: true, intensityZone: 5 },
        { day: 6, type: "EASY_RUN", title: "Easy Run 6km", description: "Recovery run.", targetDistance: 6, intensityZone: 2 },
      ],
    },
    {
      week: 7, phase: "Build", totalKm: 24,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 6km", description: "Zone 2.", targetDistance: 6, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Work: Full Carry Circuit", description: "3 rounds: 50m farmers carry + 25m sandbag lunge + 50m farmers carry. Rest 3min between rounds.", intensityZone: 4 },
        { day: 2, type: "STRENGTH", title: "Strength (Peak)", description: "Squat 5x3 (heavy), Deadlift 4x3 (heavy), Weighted pull-ups 4x5.", intensityZone: 5 },
        { day: 3, type: "INTERVALS", title: "Run Intervals", description: "8x400m at 5K pace. 90s rest.", targetDistance: 5, intensityZone: 5 },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        { day: 5, type: "HYROX_STATION_WORK", title: "Station Work: Rowing + Wall Balls", description: "5x(500m row + 25 wall balls). Rest 2min. Push the wall balls — keep the ball high.", intensityZone: 4 },
        { day: 6, type: "LONG_RUN", title: "Long Run 13km", description: "Zone 2 long run.", targetDistance: 13, intensityZone: 2 },
      ],
    },
    {
      week: 8, phase: "Build", totalKm: 16,
      workouts: [
        { day: 0, type: "EASY_RUN", title: "Easy Run 5km", description: "Cutback week.", targetDistance: 5, intensityZone: 2 },
        { day: 1, type: "HYROX_STATION_WORK", title: "Station Work: Light SkiErg + Rowing", description: "3x500m SkiErg + 3x500m rowing at moderate pace. Cutback volume.", intensityZone: 3 },
        { day: 2, type: "STRENGTH", title: "Strength (Moderate)", description: "Full body. 60% intensity. No max effort.", intensityZone: 3 },
        { day: 3, type: "TEMPO", title: "Tempo Run 5km", description: "Zone 4 tempo.", targetDistance: 5, intensityZone: 4 },
        { day: 4, type: "REST", title: "Rest", description: "Rest." },
        { day: 5, type: "HYROX_SIM", title: "Full Hyrox Sim", description: "Full race sim. All stations. Time it and compare to week 6 half sim benchmark.", stations: HYROX_SIM_STATIONS, isHyroxSim: true, intensityZone: 5 },
        { day: 6, type: "EASY_RUN", title: "Easy Run 6km", description: "Easy recovery.", targetDistance: 6, intensityZone: 2 },
      ],
    },
  ];

  // Second half: take the 8-week plan but renumber weeks 9-16
  const secondHalf = week8Plan.map(w => ({
    ...w,
    week: w.week + 8,
  }));

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

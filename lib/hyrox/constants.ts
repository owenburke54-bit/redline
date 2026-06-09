export const HYROX_STATION_ORDER = [
  "SKI_ERG",
  "SLED_PUSH",
  "SLED_PULL",
  "BURPEE_BROAD_JUMP",
  "ROW_ERG",
  "FARMERS_CARRY",
  "SANDBAG_LUNGE",
  "WALL_BALLS",
] as const;

export type HyroxStation = (typeof HYROX_STATION_ORDER)[number];

export const HYROX_STATION_LABELS: Record<HyroxStation, string> = {
  SKI_ERG: "SkiErg",
  SLED_PUSH: "Sled Push",
  SLED_PULL: "Sled Pull",
  BURPEE_BROAD_JUMP: "Burpee Broad Jump",
  ROW_ERG: "RowErg",
  FARMERS_CARRY: "Farmers Carry",
  SANDBAG_LUNGE: "Sandbag Lunge",
  WALL_BALLS: "Wall Balls",
};

export const HYROX_STATION_EMOJI: Record<HyroxStation, string> = {
  SKI_ERG: "⛷️",
  SLED_PUSH: "🛷",
  SLED_PULL: "🔗",
  BURPEE_BROAD_JUMP: "💥",
  ROW_ERG: "🚣",
  FARMERS_CARRY: "💪",
  SANDBAG_LUNGE: "🎒",
  WALL_BALLS: "🏐",
};

// Open division weights
export const HYROX_WEIGHTS = {
  SLED_PUSH: { men: 102, women: 72 },   // kg total including sled
  SLED_PULL: { men: 78, women: 53 },    // kg total including sled
  FARMERS_CARRY: { men: 24, women: 16 }, // kg per hand
  SANDBAG_LUNGE: { men: 20, women: 10 }, // kg
  WALL_BALLS: { men: 9, women: 6 },     // kg
  WALL_BALL_TARGET: { men: 10, women: 9 }, // feet
  WALL_BALL_REPS: 100,
  ROW_ERG_DISTANCE: 1000,
  SKI_ERG_DISTANCE: 1000,
  SLED_PUSH_DISTANCE: 50,
  SLED_PULL_DISTANCE: 50,
  BURPEE_BROAD_JUMP_DISTANCE: 80,
  FARMERS_CARRY_DISTANCE: 200,
  SANDBAG_LUNGE_DISTANCE: 100,
} as const;

// Target station times for 1:15:00 Mixed Doubles finish
// Total race = 8km running (~32min @ 4:00/km) + 8 stations (~43min)
export const TARGET_SPLITS_115: Record<HyroxStation, { seconds: number; label: string }> = {
  SKI_ERG:           { seconds: 270, label: "4:30" },
  SLED_PUSH:         { seconds: 180, label: "3:00" },
  SLED_PULL:         { seconds: 195, label: "3:15" },
  BURPEE_BROAD_JUMP: { seconds: 240, label: "4:00" },
  ROW_ERG:           { seconds: 255, label: "4:15" },
  FARMERS_CARRY:     { seconds: 150, label: "2:30" },
  SANDBAG_LUNGE:     { seconds: 210, label: "3:30" },
  WALL_BALLS:        { seconds: 300, label: "5:00" },
};

export const TARGET_RUN_SPLIT_115 = { seconds: 240, label: "4:00/km" };
export const TARGET_TOTAL_115 = 75 * 60; // 4500 seconds

// Station muscle group mapping
export const STATION_MUSCLE_GROUPS: Record<HyroxStation, string[]> = {
  SKI_ERG:           ["lats", "core", "shoulders", "triceps"],
  SLED_PUSH:         ["quads", "glutes", "calves", "core"],
  SLED_PULL:         ["hamstrings", "glutes", "back", "grip"],
  BURPEE_BROAD_JUMP: ["full_body", "hip_extension", "explosive_power"],
  ROW_ERG:           ["legs", "back", "core", "aerobic_capacity"],
  FARMERS_CARRY:     ["grip", "core", "traps", "shoulder_stability"],
  SANDBAG_LUNGE:     ["quads", "glutes", "hip_flexors", "balance"],
  WALL_BALLS:        ["quads", "shoulders", "aerobic_capacity", "coordination"],
};

// Splittable stations in Mixed Doubles
export const SPLITTABLE_STATIONS: HyroxStation[] = [
  "SKI_ERG",
  "SLED_PULL",
  "ROW_ERG",
  "FARMERS_CARRY",
  "WALL_BALLS",
];

// Stations best assigned to one partner
export const SINGLE_PARTNER_STATIONS: HyroxStation[] = [
  "SLED_PUSH",
  "BURPEE_BROAD_JUMP",
  "SANDBAG_LUNGE",
];

// Station training search terms — used to match workouts to stations
export const STATION_SEARCH_TERMS: Record<HyroxStation, string[]> = {
  SKI_ERG:           ["ski", "skierg", "ski erg"],
  SLED_PUSH:         ["sled push"],
  SLED_PULL:         ["sled pull"],
  BURPEE_BROAD_JUMP: ["burpee", "broad jump"],
  ROW_ERG:           ["row", "rowing", "erg"],
  FARMERS_CARRY:     ["farmer", "carry", "farmers"],
  SANDBAG_LUNGE:     ["sandbag", "lunge", "lunges"],
  WALL_BALLS:        ["wall ball", "wallball", "wall balls"],
};

// Per-station training recommendations
export const STATION_TRAINING_TIPS: Record<HyroxStation, string[]> = {
  SKI_ERG: [
    "3×5min SkiErg intervals at race pace with 2min rest — focus on hip-hinge drive",
    "5×300m SkiErg at 85% effort — cue: lats pull, hips drive, arms are levers",
    "10min continuous SkiErg at aerobic pace to build machine-specific endurance",
  ],
  SLED_PUSH: [
    "6×25m sled push at near-max weight — explode from first step, drive with glutes",
    "4×50m moderate sled immediately after a 400m run — compromised push training",
    "Superset: 4×10 front squat + 25m sled push, 2min rest — quad overload",
  ],
  SLED_PULL: [
    "4×50m sled pull focused on hip hinge — pull with hamstrings, not lower back",
    "3×50m each grip: overhand then underhand — chalk the rope",
    "Superset: Romanian deadlift 4×8 + 50m sled pull — posterior chain pairing",
  ],
  BURPEE_BROAD_JUMP: [
    "80m continuous burpee broad jump for time — establish your race rhythm now",
    "5×20 reps with 90sec rest — track rep consistency, not just total time",
    "Aerobic threshold work: 20min run → 40 burpee broad jumps — simulate late-race fatigue",
  ],
  ROW_ERG: [
    "4×250m row at race pace with 1min rest — negative split on each interval",
    "1000m row for time — establish your benchmark, target 4:15 or better",
    "Leg-drive focus: 3×5min row at rate 22, forcing 80% leg / 20% arms ratio",
  ],
  FARMERS_CARRY: [
    "4×50m per arm heavy single-arm carry — builds asymmetric grip endurance",
    "200m continuous farmers carry at race weight — find your grip reset technique",
    "Grip circuit: 3min dead hang + 200m carry + 3min dead hang, no rest",
  ],
  SANDBAG_LUNGE: [
    "4×25m weighted lunge at race weight — keep torso vertical, full knee extension",
    "100 reps for time — this is your benchmark, target sub-3:30",
    "Superset: Bulgarian split squat 3×10/leg + 50m sandbag lunge",
  ],
  WALL_BALLS: [
    "10-1 ladder: 10 reps, brief pause, 9 reps, etc. — builds rep pacing awareness",
    "100 reps for time — establish rhythm: 10 unbroken, 5sec pause, repeat",
    "Front squat 4×10 heavy + 50 wall balls immediately after — leg-fatigued practice",
  ],
};

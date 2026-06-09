import {
  Wind,
  ChevronsRight,
  ChevronsLeft,
  Zap,
  Activity,
  Dumbbell,
  Footprints,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { HyroxStation } from "@/lib/hyrox/constants";

export const STATION_ICON: Record<HyroxStation, LucideIcon> = {
  SKI_ERG: Wind,
  SLED_PUSH: ChevronsRight,
  SLED_PULL: ChevronsLeft,
  BURPEE_BROAD_JUMP: Zap,
  ROW_ERG: Activity,
  FARMERS_CARRY: Dumbbell,
  SANDBAG_LUNGE: Footprints,
  WALL_BALLS: Target,
};

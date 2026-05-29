import { z } from "zod";

export const classScheduleSchema = z.object({
  studios: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      days: z.array(z.number().int().min(0).max(6)),
    })
  ),
});

export type ClassSchedule = z.infer<typeof classScheduleSchema>;

export const aiOverridesSchema = z.object({
  modifications: z
    .array(
      z.object({
        weekNumber: z.number(),
        field: z.string(),
        originalValue: z.unknown(),
        newValue: z.unknown(),
        reason: z.string(),
      })
    )
    .default([]),
  conflictFlags: z
    .array(
      z.object({
        weekNumber: z.number(),
        note: z.string(),
      })
    )
    .default([]),
});

export type AIOverrides = z.infer<typeof aiOverridesSchema>;

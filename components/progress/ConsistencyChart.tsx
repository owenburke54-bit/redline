"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface WeekData {
  label: string;
  completed: number;
  planned: number;
  rate: number;
  isCurrentWeek: boolean;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const completed = payload.find(p => p.name === "completed")?.value ?? 0;
  const planned = payload.find(p => p.name === "planned")?.value ?? 0;
  const rate = planned > 0 ? Math.round((completed / planned) * 100) : 0;

  return (
    <div className="rounded border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      <p className="text-muted-foreground">{completed} / {planned} workouts</p>
      {planned > 0 && (
        <p style={{ color: rate >= 80 ? "var(--hyrox-color)" : "var(--marathon-color)" }}>
          {rate}% complete
        </p>
      )}
    </div>
  );
}

export function ConsistencyChart({ data }: { data: WeekData[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barGap={2} barCategoryGap="35%">
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={20}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="planned" name="planned" radius={[3, 3, 0, 0]} fill="rgba(255,255,255,0.07)" />
        <Bar dataKey="completed" name="completed" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.rate >= 80 ? "var(--hyrox-color)" : entry.rate >= 50 ? "var(--marathon-color)" : "hsl(var(--muted-foreground))"}
              fillOpacity={entry.isCurrentWeek ? 1 : 0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

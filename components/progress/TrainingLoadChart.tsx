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

interface WeeklyData {
  label: string;
  marathonKm: number;
  hyroxKm: number;
  isCurrentWeek: boolean;
  isPast: boolean;
}

interface TrainingLoadChartProps {
  data: WeeklyData[];
  hasMarathon: boolean;
  hasHyrox: boolean;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const marathon = payload.find(p => p.name === "marathonKm");
  const hyrox = payload.find(p => p.name === "hyroxKm");
  const total = (marathon?.value ?? 0) + (hyrox?.value ?? 0);

  return (
    <div className="rounded border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      {marathon && marathon.value > 0 && (
        <p style={{ color: "var(--marathon-color)" }}>Run: {marathon.value.toFixed(1)} km</p>
      )}
      {hyrox && hyrox.value > 0 && (
        <p style={{ color: "var(--hyrox-color)" }}>Hyrox: {hyrox.value.toFixed(1)} km</p>
      )}
      {total > 0 && (marathon?.value ?? 0) > 0 && (hyrox?.value ?? 0) > 0 && (
        <p className="text-muted-foreground mt-0.5 border-t border-border pt-0.5">
          Total: {total.toFixed(1)} km
        </p>
      )}
    </div>
  );
}

export function TrainingLoadChart({ data, hasMarathon, hasHyrox }: TrainingLoadChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barGap={2} barCategoryGap="30%">
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
          tickFormatter={v => `${v}`}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        {hasMarathon && (
          <Bar dataKey="marathonKm" name="marathonKm" stackId="m" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill="var(--marathon-color)"
                fillOpacity={entry.isPast ? 0.9 : entry.isCurrentWeek ? 1 : 0.4}
              />
            ))}
          </Bar>
        )}
        {hasHyrox && (
          <Bar dataKey="hyroxKm" name="hyroxKm" stackId="h" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill="var(--hyrox-color)"
                fillOpacity={entry.isPast ? 0.9 : entry.isCurrentWeek ? 1 : 0.4}
              />
            ))}
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

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
  marathonMi: number;
  hyroxMi: number;
  actualMarathonMi: number;
  actualHyroxMi: number;
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

  const planned = payload.find(p => p.name === "marathonMi" || p.name === "hyroxMi");
  const actual = payload.find(p => p.name === "actualMarathonMi" || p.name === "actualHyroxMi");
  const planMarathon = payload.find(p => p.name === "marathonMi");
  const planHyrox = payload.find(p => p.name === "hyroxMi");
  const actMarathon = payload.find(p => p.name === "actualMarathonMi");
  const actHyrox = payload.find(p => p.name === "actualHyroxMi");
  void planned; void actual;

  const plannedTotal = (planMarathon?.value ?? 0) + (planHyrox?.value ?? 0);
  const actualTotal = (actMarathon?.value ?? 0) + (actHyrox?.value ?? 0);

  return (
    <div className="rounded border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      {plannedTotal > 0 && (
        <p className="text-muted-foreground">Planned: {plannedTotal.toFixed(1)} mi</p>
      )}
      {actualTotal > 0 && (
        <p className="text-foreground font-medium">Actual: {actualTotal.toFixed(1)} mi</p>
      )}
      {planMarathon && planMarathon.value > 0 && actMarathon && actMarathon.value > 0 && (
        <p style={{ color: "var(--marathon-color)" }} className="mt-0.5">
          Run: {actMarathon.value.toFixed(1)}/{planMarathon.value.toFixed(1)} mi
        </p>
      )}
      {planHyrox && planHyrox.value > 0 && actHyrox && actHyrox.value > 0 && (
        <p style={{ color: "var(--hyrox-color)" }} className="mt-0.5">
          Hyrox: {actHyrox.value.toFixed(1)}/{planHyrox.value.toFixed(1)} mi
        </p>
      )}
    </div>
  );
}

export function TrainingLoadChart({ data, hasMarathon, hasHyrox }: TrainingLoadChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barGap={2} barCategoryGap="25%">
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

        {/* Planned bars (background, lighter) */}
        {hasMarathon && (
          <Bar dataKey="marathonMi" name="marathonMi" stackId="planned" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill="var(--marathon-color)"
                fillOpacity={entry.isPast || entry.isCurrentWeek ? 0.25 : 0.4}
              />
            ))}
          </Bar>
        )}
        {hasHyrox && (
          <Bar dataKey="hyroxMi" name="hyroxMi" stackId="planned" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill="var(--hyrox-color)"
                fillOpacity={entry.isPast || entry.isCurrentWeek ? 0.25 : 0.4}
              />
            ))}
          </Bar>
        )}

        {/* Actual bars (solid, only past + current week) */}
        {hasMarathon && (
          <Bar dataKey="actualMarathonMi" name="actualMarathonMi" stackId="actual" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill="var(--marathon-color)"
                fillOpacity={entry.isPast || entry.isCurrentWeek ? 0.9 : 0}
              />
            ))}
          </Bar>
        )}
        {hasHyrox && (
          <Bar dataKey="actualHyroxMi" name="actualHyroxMi" stackId="actual" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill="var(--hyrox-color)"
                fillOpacity={entry.isPast || entry.isCurrentWeek ? 0.9 : 0}
              />
            ))}
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

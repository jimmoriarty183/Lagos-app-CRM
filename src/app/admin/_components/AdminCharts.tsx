"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type TrendPoint = {
  date: string;
  registrations?: number;
  businesses?: number;
};

type PiePoint = {
  name: string;
  value: number;
  fill: string;
};

type StatusPoint = {
  name: string;
  value: number;
};

export function AdminTrendChart({
  data,
  dataKey,
  title,
}: {
  data: TrendPoint[];
  dataKey: "registrations" | "businesses";
  title: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">Последние 14 дней</div>
      </div>
      <ChartContainer
        className="h-[240px] w-full"
        config={{
          value: {
            label: title,
            color: dataKey === "registrations" ? "#2563eb" : "#0f766e",
          },
        }}
      >
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
          <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => `${value}`} />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke="var(--color-value)"
            fill="var(--color-value)"
            fillOpacity={0.12}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

export function AdminPieChartBlock({
  title,
  data,
}: {
  title: string;
  data: PiePoint[];
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">Распределение по текущему срезу данных</div>
      </div>
      <ChartContainer
        className="h-[240px] w-full"
        config={Object.fromEntries(
          data.map((item) => [
            item.name,
            {
              label: item.name,
              color: item.fill,
            },
          ]),
        )}
      >
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => `${value}`} />} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3}>
            {data.map((item) => (
              <Cell key={item.name} fill={item.fill} />
            ))}
          </Pie>
          <Legend content={<ChartLegendContent />} />
        </PieChart>
      </ChartContainer>
    </div>
  );
}

export function AdminStatusBarChart({
  title,
  data,
}: {
  title: string;
  data: StatusPoint[];
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">Текущий срез по статусам приглашений</div>
      </div>
      <ChartContainer
        className="h-[240px] w-full"
        config={{
          value: {
            label: title,
            color: "#334155",
          },
        }}
      >
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
          <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => `${value}`} />} />
          <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="var(--color-value)" />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatNumber } from "@/app/admin/_components/AdminShared";

type TrendPoint = Record<string, string | number | undefined>;

type PiePoint = {
  name: string;
  value: number;
  fill: string;
};

type StatusPoint = {
  name: string;
  value: number;
};

type FunnelPoint = {
  label: string;
  value: number;
  rateFromPrevious: number | null;
  rateFromStart: number | null;
};

export function AdminTrendChart({
  data,
  dataKey,
  title,
  subtitle,
  color = "#2563eb",
}: {
  data: TrendPoint[];
  dataKey: string;
  title: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="rounded-[16px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-sm">
      <div className="mb-2">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
        <div className="text-xs text-slate-500 dark:text-white/55">{subtitle || "Динамика по выбранному периоду"}</div>
      </div>
      <ChartContainer
        className="h-[240px] w-full"
        config={{
          value: {
            label: title,
            color,
          },
        }}
      >
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
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
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: PiePoint[];
}) {
  return (
    <div className="rounded-[16px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-sm">
      <div className="mb-2">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
        <div className="text-xs text-slate-500 dark:text-white/55">{subtitle || "Распределение по текущему срезу данных"}</div>
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
  subtitle,
  data,
  color = "#334155",
}: {
  title: string;
  subtitle?: string;
  data: StatusPoint[];
  color?: string;
}) {
  return (
    <div className="rounded-[16px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-sm">
      <div className="mb-2">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
        <div className="text-xs text-slate-500 dark:text-white/55">{subtitle || "Текущий срез по статусам"}</div>
      </div>
      <ChartContainer
        className="h-[240px] w-full"
        config={{
          value: {
            label: title,
            color,
          },
        }}
      >
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => `${value}`} />} />
          <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="var(--color-value)" />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function AdminFunnelChart({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle?: string;
  steps: FunnelPoint[];
}) {
  const maxValue = Math.max(...steps.map((step) => step.value), 1);

  return (
    <div className="rounded-[16px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-sm">
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
        <div className="text-xs text-slate-500 dark:text-white/55">{subtitle || "Последовательность ключевых шагов"}</div>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.key} className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-2.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {index + 1}. {step.label}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-white/55">
                  {step.rateFromPrevious === null
                    ? "Для первого шага конверсия не считается"
                    : `Конверсия с предыдущего шага: ${step.rateFromPrevious.toFixed(1)}%`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-slate-900 dark:text-white">{formatNumber(step.value)}</div>
                <div className="text-xs text-slate-500 dark:text-white/55">
                  {step.rateFromStart === null ? "Нет базы" : `${step.rateFromStart.toFixed(1)}% от всех`}
                </div>
              </div>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1d4ed8] to-[#0f766e]"
                style={{ width: `${Math.max(8, (step.value / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

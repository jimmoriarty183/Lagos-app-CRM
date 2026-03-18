import Link from "next/link";
import { AdminTrendChart } from "@/app/admin/_components/AdminCharts";
import { AdminSectionCard, AdminStatCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import {
  AdminSearchParams,
  buildAdminHref,
  formatDateTime,
  formatNumber,
  getEnumParam,
} from "@/app/admin/_components/AdminShared";
import { requireAdminUser } from "@/lib/admin/access";
import { ANALYTICS_PERIODS, type AnalyticsPeriod, loadAdminAnalytics } from "@/lib/admin/analytics";

const PERIOD_OPTIONS = [
  { value: "7d", label: "7 дней" },
  { value: "30d", label: "30 дней" },
  { value: "90d", label: "90 дней" },
  { value: "all", label: "Весь период" },
] as const satisfies { value: AnalyticsPeriod; label: string }[];

function formatPercent(value: number | null, digits = 1) {
  if (value === null || Number.isNaN(value)) return "Нет базы";
  return `${value.toFixed(digits)}%`;
}

function formatDelta(value: number | null) {
  if (value === null || Number.isNaN(value)) return "Нет прошлой базы";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}% к прошлому периоду`;
}

function AnalyticsFunnelBlock({
  steps,
}: {
  steps: {
    key: string;
    label: string;
    value: number;
    rateFromPrevious: number | null;
    rateFromStart: number | null;
  }[];
}) {
  const maxValue = Math.max(...steps.map((step) => step.value), 1);

  return (
    <AdminSectionCard title="Воронка">
      <div className="mb-4 text-sm text-slate-500">
        Зарегистрировались {"->"} вошли {"->"} создали бизнес {"->"} дошли до первого заказа
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {index + 1}. {step.label}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {step.rateFromPrevious === null
                    ? "Для первого шага конверсия не считается"
                    : `Конверсия с предыдущего шага: ${step.rateFromPrevious.toFixed(1)}%`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-slate-900">{formatNumber(step.value)}</div>
                <div className="text-xs text-slate-500">
                  {step.rateFromStart === null ? "Нет базы" : `${step.rateFromStart.toFixed(1)}% от всех`}
                </div>
              </div>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1d4ed8] to-[#0f766e]"
                style={{ width: `${Math.max(8, (step.value / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </AdminSectionCard>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<AdminSearchParams>;
}) {
  const { user, workspaceHref } = await requireAdminUser("/admin/analytics");
  const params = (await searchParams) ?? {};
  const period = getEnumParam(params.period, "30d", ANALYTICS_PERIODS);
  const analytics = await loadAdminAnalytics(period);

  const currentParams: AdminSearchParams = {
    period,
  };

  return (
    <AdminShell
      activeHref="/admin/analytics"
      workspaceHref={workspaceHref}
      title="Аналитика"
      description="Панель product и marketing metrics для владельца продукта: рост, активация, использование и потери в воронке."
      actions={
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          Вход как <span className="font-semibold text-slate-900">{user.email}</span>
        </div>
      }
    >
      <AdminSectionCard
        title="Период и база расчета"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {PERIOD_OPTIONS.map((option) => {
              const active = option.value === period;
              return (
                <Link
                  key={option.value}
                  href={buildAdminHref("/admin/analytics", currentParams, { period: option.value })}
                  className={[
                    "inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium transition",
                    active
                      ? "border-[#bfd0ea] bg-[#eef5ff] text-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900",
                  ].join(" ")}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        }
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">{analytics.rangeLabel}</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Текущий срез: {formatDateTime(new Date(analytics.rangeStartMs).toISOString())} -{" "}
              {formatDateTime(new Date(analytics.rangeEndMs).toISOString())}.
              {analytics.previousRangeStartMs !== null && analytics.previousRangeEndMs !== null ? (
                <>
                  {" "}
                  Сравнение идет с предыдущим периодом такой же длины:{" "}
                  {formatDateTime(new Date(analytics.previousRangeStartMs).toISOString())} -{" "}
                  {formatDateTime(new Date(analytics.previousRangeEndMs).toISOString())}.
                </>
              ) : (
                <> Для всего периода сравнение с прошлым периодом не считается.</>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Что можно считать уже сейчас</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Метрики опираются на реальные данные: регистрации пользователей, первый вход, привязку к бизнесам,
              создание и владение бизнесом, заказы и доступные события активности.
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <AdminStatCard
          label="Новые регистрации"
          value={formatNumber(analytics.kpis.registrationsCurrent)}
          hint={formatDelta(analytics.comparisons.registrationGrowthRate)}
        />
        <AdminStatCard
          label="Новые бизнесы"
          value={formatNumber(analytics.kpis.businessesCurrent)}
          hint={formatDelta(analytics.comparisons.businessesGrowthRate)}
        />
        <AdminStatCard
          label="Активация во вход"
          value={formatPercent(analytics.activation.signedInRate)}
          hint={`${formatNumber(analytics.activation.signedInUsers)} из ${formatNumber(analytics.activation.registeredUsers)}`}
        />
        <AdminStatCard
          label="Активация в бизнес"
          value={formatPercent(analytics.activation.usersWithBusinessRate)}
          hint={`${formatNumber(analytics.activation.usersWithBusiness)} из ${formatNumber(analytics.activation.registeredUsers)}`}
        />
        <AdminStatCard
          label="Активация в заказ"
          value={formatPercent(analytics.activation.usersWithFirstOrderRate)}
          hint={`${formatNumber(analytics.activation.usersWithFirstOrder)} из ${formatNumber(analytics.activation.registeredUsers)}`}
        />
        <AdminStatCard
          label="DAU"
          value={formatNumber(analytics.engagement.dau)}
          hint="Уникальные активные пользователи за 1 день"
        />
        <AdminStatCard
          label="WAU"
          value={formatNumber(analytics.engagement.wau)}
          hint="Уникальные активные пользователи за 7 дней"
        />
        <AdminStatCard
          label="MAU / stickiness"
          value={`${formatNumber(analytics.engagement.mau)} / ${formatPercent(analytics.engagement.stickiness)}`}
          hint="Stickiness = DAU / MAU"
        />
      </div>

      <div className="mt-6 grid gap-4 2xl:grid-cols-2">
        <AdminTrendChart
          data={analytics.trendSeries}
          dataKey="registrations"
          title="Регистрации пользователей"
          subtitle="Динамика новых аккаунтов по выбранному периоду"
          color="#1d4ed8"
        />
        <AdminTrendChart
          data={analytics.trendSeries}
          dataKey="businesses"
          title="Созданные бизнесы"
          subtitle="Динамика создания рабочих пространств"
          color="#0f766e"
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminSectionCard title="Активация">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Регистрация {"->"} первый вход</div>
              <div className="product-stat-value mt-1.5">
                {formatPercent(analytics.activation.signedInRate)}
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {formatNumber(analytics.activation.signedInUsers)} пользователей сделали хотя бы один вход после
                регистрации в выбранном периоде.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Регистрация {"->"} создание бизнеса</div>
              <div className="product-stat-value mt-1.5">
                {formatPercent(analytics.activation.usersWithBusinessRate)}
              </div>
              <div className="mt-2 text-sm text-slate-600">{analytics.activation.businessDefinition}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Регистрация {"->"} первый заказ</div>
              <div className="product-stat-value mt-1.5">
                {formatPercent(analytics.activation.usersWithFirstOrderRate)}
              </div>
              <div className="mt-2 text-sm text-slate-600">{analytics.activation.orderDefinition}</div>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Использование">
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">DAU / WAU / MAU</div>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="text-xl font-semibold text-slate-900">{formatNumber(analytics.engagement.dau)}</div>
                  <div className="text-sm text-slate-500">За 1 день</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-slate-900">{formatNumber(analytics.engagement.wau)}</div>
                  <div className="text-sm text-slate-500">За 7 дней</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-slate-900">{formatNumber(analytics.engagement.mau)}</div>
                  <div className="text-sm text-slate-500">За 30 дней</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Возвращаемость</div>
              <div className="product-stat-value mt-1.5">
                {formatPercent(analytics.engagement.stickiness)}
              </div>
              <div className="mt-2 text-sm text-slate-600">
                Stickiness показывает, какая доля месячной аудитории была активна за последние сутки.
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600">
              {analytics.engagement.methodology}
            </div>
          </div>
        </AdminSectionCard>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <AnalyticsFunnelBlock steps={analytics.funnel} />

        <AdminSectionCard title="Ограничения текущей аналитики">
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>
              Регистрации и первый вход считаются честно по `created_at` и `last_sign_in_at` пользователей авторизации.
            </p>
            <p>
              Шаги бизнеса и заказа считаются по надежной связи пользователь {"->"} бизнес через владельца, создателя и
              роль `OWNER`.
            </p>
            <p>
              DAU / WAU / MAU считаются приближенно: по последнему входу и доступным продуктовым событиям. Без
              полноценного event log эти метрики полезны для MVP, но не являются полной поведенческой аналитикой.
            </p>
            <p>
              Если понадобится channel analytics, retention cohorts и маркетинговая атрибуция, следующим минимальным
              шагом будет системная запись `product_events` и поле `signup_source`.
            </p>
          </div>
        </AdminSectionCard>
      </div>
    </AdminShell>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SurveyQuestionEditor } from "@/components/campaigns/SurveyQuestionEditor";
import { BUSINESS_SEGMENTS } from "@/lib/business-segments";
import type {
  Campaign,
  CampaignChannel,
  CampaignStatus,
  CampaignType,
  Survey,
  SurveyQuestionType,
} from "@/lib/campaigns/types";

type Props = {
  mode: "create" | "edit";
  initialCampaign?: Campaign | null;
  initialSurvey?: Survey | null;
  readOnly?: boolean;
  campaignTemplates?: CampaignTemplate[];
};

type DraftQuestion = {
  title: string;
  questionType: SurveyQuestionType;
  options: string[];
};

type CampaignTemplate = {
  id: string;
  type: CampaignType;
  title: string;
  body: string;
  status: CampaignStatus;
  startsAt: string | null;
  endsAt: string | null;
  channels: CampaignChannel[];
  targetRoles: string[];
  targetSegments: string[];
  questions: DraftQuestion[];
};

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractErrorMessageFromPayload(
  payload: { error?: string } | null,
  fallback: string,
) {
  if (payload?.error && payload.error.trim()) return payload.error;
  return fallback;
}

export function AdminCampaignForm({
  mode,
  initialCampaign,
  initialSurvey,
  readOnly = false,
  campaignTemplates = [],
}: Props) {
  const ROLE_OPTIONS = ["OWNER", "MANAGER"] as const;
  const QUESTION_TYPES: SurveyQuestionType[] = [
    "single_choice",
    "multiple_choice",
    "yes_no",
    "rating_1_5",
  ];
  const router = useRouter();
  const [type, setType] = useState<CampaignType>(
    initialCampaign?.type ?? "announcement",
  );
  const [title, setTitle] = useState(
    mode === "create" && initialCampaign?.title
      ? `${initialCampaign.title} (Copy)`
      : (initialCampaign?.title ?? ""),
  );
  const [body, setBody] = useState(initialCampaign?.body ?? "");
  const [status, setStatus] = useState<CampaignStatus>(
    mode === "create" ? "draft" : (initialCampaign?.status ?? "draft"),
  );
  const [startsAt, setStartsAt] = useState(
    initialCampaign?.startsAt?.slice(0, 16) ?? "",
  );
  const [endsAt, setEndsAt] = useState(
    initialCampaign?.endsAt?.slice(0, 16) ?? "",
  );
  const [targetRoles, setTargetRoles] = useState<string[]>(
    (initialCampaign?.targetRoles ?? []).filter(
      (role) => role === "OWNER" || role === "MANAGER",
    ),
  );
  const [targetSegments, setTargetSegments] = useState<string[]>(
    initialCampaign?.targetSegments ?? [],
  );
  const [channels, setChannels] = useState<CampaignChannel[]>(
    initialCampaign?.channels ?? ["bell"],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftQuestionTitle, setDraftQuestionTitle] = useState("");
  const [draftQuestionType, setDraftQuestionType] =
    useState<SurveyQuestionType>("single_choice");
  const [draftOptionInput, setDraftOptionInput] = useState("");
  const [draftOptions, setDraftOptions] = useState<string[]>([]);
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>(
    mode === "create"
      ? (initialSurvey?.questions ?? []).map((question) => ({
          title: question.title,
          questionType: question.questionType,
          options: question.options.map((option) => option.label),
        }))
      : [],
  );
  const [showTypeHelp, setShowTypeHelp] = useState(false);
  const [showHeaderBodyHelp, setShowHeaderBodyHelp] = useState(false);

  const campaignId = initialCampaign?.id ?? null;
  const normalizedTargetRoles = useMemo(
    () => [...new Set(targetRoles)],
    [targetRoles],
  );
  const questionTypeLabel = useMemo<Record<SurveyQuestionType, string>>(
    () => ({
      single_choice: "Один вариант",
      multiple_choice: "Несколько вариантов",
      yes_no: "Да/Нет",
      rating_1_5: "Оценка 1-5",
    }),
    [],
  );

  const toggleChannel = (channel: CampaignChannel) => {
    setChannels((current) => {
      const set = new Set(current);
      if (set.has(channel)) {
        set.delete(channel);
      } else {
        set.add(channel);
      }
      return set.size > 0 ? [...set] : ["bell"];
    });
  };

  const toggleSegment = (segment: string) => {
    setTargetSegments((current) => {
      const set = new Set(current);
      if (set.has(segment)) set.delete(segment);
      else set.add(segment);
      return [...set];
    });
  };

  const toggleRole = (role: string) => {
    setTargetRoles((current) => {
      const set = new Set(current);
      if (set.has(role)) set.delete(role);
      else set.add(role);
      return [...set];
    });
  };

  const submit = async () => {
    if (readOnly) return;
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setBusy(true);
    setError(null);

    const payload = {
      type,
      title: title.trim(),
      body: body.trim(),
      status,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      channels,
      targetRoles: normalizedTargetRoles,
      targetSegments,
    };

    const shouldDelayActivation =
      mode === "create" &&
      type === "survey" &&
      draftQuestions.length > 0 &&
      status === "active";
    const createPayload = shouldDelayActivation
      ? { ...payload, status: "draft" as CampaignStatus }
      : payload;

    const response = await fetch(
      mode === "create"
        ? "/api/admin/campaigns"
        : `/api/admin/campaigns/${campaignId}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "create" ? createPayload : payload),
      },
    );
    const json = await safeJson<{
      ok: boolean;
      campaign?: Campaign;
      error?: string;
    }>(response);
    if (!response.ok || !json?.ok || !json.campaign) {
      setError(
        extractErrorMessageFromPayload(json, "Не удалось создать кампанию"),
      );
      setBusy(false);
      return;
    }

    if (mode === "create" && type === "survey" && draftQuestions.length > 0) {
      for (
        let questionIndex = 0;
        questionIndex < draftQuestions.length;
        questionIndex += 1
      ) {
        const question = draftQuestions[questionIndex];
        const questionResponse = await fetch(
          `/api/admin/campaigns/${json.campaign.id}/questions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionOrder: questionIndex + 1,
              questionType: question.questionType,
              title: question.title,
            }),
          },
        );
        const questionJson = await safeJson<{
          ok: boolean;
          question?: { id: string };
          error?: string;
        }>(questionResponse);
        if (
          !questionResponse.ok ||
          !questionJson?.ok ||
          !questionJson.question?.id
        ) {
          setError(
            extractErrorMessageFromPayload(
              questionJson,
              "Кампания создана, но не удалось создать вопросы",
            ),
          );
          setBusy(false);
          return;
        }

        for (
          let optionIndex = 0;
          optionIndex < question.options.length;
          optionIndex += 1
        ) {
          const optionLabel = question.options[optionIndex];
          const optionResponse = await fetch(
            `/api/admin/questions/${questionJson.question.id}/options`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                optionOrder: optionIndex + 1,
                label: optionLabel,
                value: optionLabel,
              }),
            },
          );
          const optionJson = await safeJson<{ ok: boolean; error?: string }>(
            optionResponse,
          );
          if (!optionResponse.ok || !optionJson?.ok) {
            setError(
              extractErrorMessageFromPayload(
                optionJson,
                "Кампания создана, но не удалось создать варианты",
              ),
            );
            setBusy(false);
            return;
          }
        }
      }
    }

    if (mode === "create" && shouldDelayActivation) {
      const activateResponse = await fetch(
        `/api/admin/campaigns/${json.campaign.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const activateJson = await safeJson<{ ok: boolean; error?: string }>(
        activateResponse,
      );
      if (!activateResponse.ok || !activateJson?.ok) {
        setError(
          extractErrorMessageFromPayload(
            activateJson,
            "Кампания создана, но не удалось активировать после добавления вопросов",
          ),
        );
        setBusy(false);
        return;
      }
    }

    setBusy(false);
    router.push(`/admin/campaigns/${json.campaign.id}?view=details`);
    router.refresh();
  };

  const addDraftOption = () => {
    const option = draftOptionInput.trim();
    if (!option) return;
    setDraftOptions((current) => [...current, option]);
    setDraftOptionInput("");
  };

  const addDraftQuestion = () => {
    const normalizedTitle = draftQuestionTitle.trim();
    if (!normalizedTitle) {
      setError("Question title is required");
      return;
    }
    if (draftOptions.length < 2) {
      setError("Add at least 2 answer options");
      return;
    }
    setError(null);
    setDraftQuestions((current) => [
      ...current,
      {
        title: normalizedTitle,
        questionType: draftQuestionType,
        options: draftOptions,
      },
    ]);
    setDraftQuestionTitle("");
    setDraftQuestionType("single_choice");
    setDraftOptions([]);
    setDraftOptionInput("");
  };

  const removeDraftQuestion = (indexToRemove: number) => {
    setDraftQuestions((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  };

  const applyTemplate = (template: CampaignTemplate) => {
    if (readOnly || mode !== "create") return;
    setType(template.type);
    setTitle(`${template.title} (Copy)`);
    setBody(template.body ?? "");
    setStatus("draft");
    setStartsAt("");
    setEndsAt("");
    setTargetRoles(
      (template.targetRoles ?? []).filter(
        (role) => role === "OWNER" || role === "MANAGER",
      ),
    );
    setTargetSegments(template.targetSegments ?? []);
    setChannels(template.channels?.length ? template.channels : ["bell"]);
    setDraftQuestions(
      (template.questions ?? []).map((question) => ({
        title: question.title,
        questionType: question.questionType,
        options: [...question.options],
      })),
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
        <fieldset disabled={readOnly} className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/55">
              Тип
            </span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as CampaignType)}
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 text-sm"
            >
              <option value="announcement">Уведомление</option>
              <option value="survey">Опрос</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/55">
              Статус
            </span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as CampaignStatus)
              }
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 text-sm"
            >
              <option value="draft">Черновик</option>
              <option value="active">Активно</option>
              <option value="archived">Архив</option>
            </select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/55">
              Заголовок
              <button
                type="button"
                onClick={() => setShowHeaderBodyHelp((current) => !current)}
                aria-expanded={showHeaderBodyHelp}
                aria-label="Показать подсказку по заголовку и тексту"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.03] text-[10px] font-bold text-slate-700 dark:text-white/80"
              >
                ?
              </button>
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 text-sm"
            />
            <div className="text-xs text-slate-500 dark:text-white/55">
              {type === "announcement"
                ? "Заголовок уведомления для пользователя."
                : "Заголовок опроса (виден пользователю в popup/колокольчике)."}
            </div>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/55">
              Текст
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-28 w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 text-sm"
            />
            <div className="text-xs text-slate-500 dark:text-white/55">
              {type === "announcement"
                ? "Основной текст уведомления."
                : "Описание/интро опроса. Сами вопросы и варианты задаются в конструкторе ниже."}
            </div>
          </label>
          {showHeaderBodyHelp ? (
            <div className="md:col-span-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-xs text-slate-700 dark:text-white/80">
              <div>
                <b>Для уведомления</b>: заголовок + текст = само сообщение
                пользователю.
              </div>
              <div>
                <b>Для опроса</b>: заголовок + текст = шапка опроса (название и
                описание).
              </div>
              <div>
                <b>Вопросы и варианты ответов</b> задаются отдельно в
                «Конструкторе опроса» ниже.
              </div>
            </div>
          ) : null}
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/55">
              Начало
            </span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/55">
              Окончание
            </span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 text-sm"
            />
          </label>
          <div className="space-y-2 md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/55">
              Роли получателей
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {ROLE_OPTIONS.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-slate-700 dark:text-white/80"
                >
                  <input
                    type="checkbox"
                    checked={targetRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-white/15"
                  />
                  <span>{role}</span>
                </label>
              ))}
            </div>
            <div className="text-xs text-slate-500 dark:text-white/55">
              Если ничего не выбрано, отправится всем ролям.
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/55">
              Сегменты получателей
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {BUSINESS_SEGMENTS.map((segment) => {
                const checked = targetSegments.includes(segment);
                return (
                  <label
                    key={segment}
                    className={[
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition",
                      checked
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-slate-700 dark:text-white/80",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSegment(segment)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-white/15"
                    />
                    {segment}
                  </label>
                );
              })}
            </div>
            <div className="text-xs text-slate-500 dark:text-white/55">
              Если ничего не выбрано, отправится всем сегментам.
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/55">
              Каналы показа
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["bell", "popup_right"] as CampaignChannel[]).map((channel) => {
                const checked = channels.includes(channel);
                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={[
                      "rounded-lg border px-3 py-1.5 text-sm transition",
                      checked
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-slate-700 dark:text-white/80",
                    ].join(" ")}
                  >
                    {channel}
                  </button>
                );
              })}
            </div>
          </div>
        </fieldset>

        {error ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </div>
        ) : null}
        {readOnly ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Campaign is sent/published. Editing is disabled. Use Preview or
            Duplicate from details.
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={busy || readOnly}
            className="inline-flex h-10 items-center rounded-lg bg-[var(--brand-600)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-700)] disabled:opacity-60"
          >
            {busy
              ? "Сохранение..."
              : mode === "create"
                ? "Создать кампанию"
                : "Сохранить кампанию"}
          </button>
          <Link
            href="/admin/campaigns"
            className="text-sm font-medium text-slate-500 dark:text-white/55 hover:text-slate-700"
          >
            К списку кампаний
          </Link>
        </div>
      </div>

      {mode === "create" && campaignTemplates.length > 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            Быстрые шаблоны
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-white/55">
            Выберите предыдущую кампанию, чтобы подставить её параметры и
            вопросы в новую.
          </div>
          <div className="mt-3 grid gap-2">
            {campaignTemplates.map((template) => (
              <div
                key={template.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {template.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-white/55">
                    {template.type === "survey" ? "Опрос" : "Уведомление"} •{" "}
                    {template.channels.join(" + ")}
                    {template.type === "survey"
                      ? ` • вопросов: ${template.questions.length}`
                      : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="inline-flex h-8 items-center rounded-lg border border-[var(--brand-200)] bg-[var(--brand-50)] px-3 text-xs font-semibold text-[var(--brand-700)] transition hover:bg-[var(--brand-100)]"
                >
                  Использовать
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {type === "survey" && !readOnly ? (
        campaignId ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              Конструктор опроса
            </div>
            <div className="text-xs text-slate-500 dark:text-white/55">
              Добавляйте вопросы и варианты ответов ниже.
            </div>
            <SurveyQuestionEditor
              campaignId={campaignId}
              initialQuestions={initialSurvey?.questions ?? []}
            />
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-semibold text-amber-900">
              Конструктор опроса
            </div>
            <div className="text-xs text-amber-800">
              Можно сразу подготовить вопросы. После `Создать кампанию` они
              создадутся автоматически.
            </div>

            <div className="grid gap-2 md:grid-cols-[1fr_200px]">
              <input
                value={draftQuestionTitle}
                onChange={(event) => setDraftQuestionTitle(event.target.value)}
                placeholder="Текст вопроса"
                className="h-10 rounded-lg border border-amber-200 bg-white dark:bg-white/[0.03] px-3 text-sm"
              />
              <div className="flex items-center gap-2">
                <select
                  value={draftQuestionType}
                  onChange={(event) =>
                    setDraftQuestionType(
                      event.target.value as SurveyQuestionType,
                    )
                  }
                  className="h-10 flex-1 rounded-lg border border-amber-200 bg-white dark:bg-white/[0.03] px-3 text-sm"
                >
                  {QUESTION_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {questionTypeLabel[value]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowTypeHelp((current) => !current)}
                  aria-expanded={showTypeHelp}
                  aria-label="Показать подсказку по типам вопросов"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-300 bg-white dark:bg-white/[0.03] text-sm font-bold text-amber-900"
                >
                  ?
                </button>
              </div>
            </div>
            {showTypeHelp ? (
              <div className="rounded-lg border border-amber-200 bg-white dark:bg-white/[0.03] px-3 py-2 text-xs text-amber-900">
                <div>
                  <b>Один вариант</b>: пользователь выбирает только один ответ.
                </div>
                <div>
                  <b>Несколько вариантов</b>: можно выбрать несколько ответов.
                </div>
                <div>
                  <b>Да/Нет</b>: два варианта ответа.
                </div>
                <div>
                  <b>Оценка 1-5</b>: оценка по шкале от 1 до 5.
                </div>
              </div>
            ) : null}

            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                value={draftOptionInput}
                onChange={(event) => setDraftOptionInput(event.target.value)}
                placeholder="Вариант ответа"
                className="h-10 rounded-lg border border-amber-200 bg-white dark:bg-white/[0.03] px-3 text-sm"
              />
              <button
                type="button"
                onClick={addDraftOption}
                className="inline-flex h-10 items-center rounded-lg border border-amber-300 bg-white dark:bg-white/[0.03] px-4 text-sm font-semibold text-amber-900"
              >
                Добавить вариант
              </button>
            </div>

            {draftOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {draftOptions.map((option, index) => (
                  <span
                    key={`${option}-${index}`}
                    className="rounded-full border border-amber-300 bg-white dark:bg-white/[0.03] px-2 py-1 text-xs text-amber-900"
                  >
                    {option}
                  </span>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={addDraftQuestion}
              className="inline-flex h-9 items-center rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-500"
            >
              Добавить вопрос в список
            </button>

            {draftQuestions.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-white dark:bg-white/[0.03] p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/55">
                  Вопросы, которые будут созданы
                </div>
                {draftQuestions.map((question, index) => (
                  <div
                    key={`${question.title}-${index}`}
                    className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {index + 1}. {question.title}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDraftQuestion(index)}
                        className="text-xs font-medium text-rose-600 hover:text-rose-700"
                      >
                        Удалить
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-white/55">
                      {question.questionType}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-white/55">
                      Тип: {questionTypeLabel[question.questionType]}
                    </div>
                    <div className="mt-2 text-xs text-slate-700 dark:text-white/80">
                      {question.options.join(" • ")}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}

"use client";

import * as React from "react";
import { AlertCircle, Building2, UserRound } from "lucide-react";
import { createOrderFromClientPayload, type CreateOrderClientPayloadInput } from "@/app/b/[slug]/actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

type MatchCandidate = {
  clientId: string;
  clientType: "individual" | "company";
  displayName: string;
  email: string | null;
  phone: string | null;
  reason: string;
  score: number;
};

type MatchResponse = {
  state: "exact_match" | "possible_duplicate" | "no_match";
  exact: MatchCandidate[];
  possible: MatchCandidate[];
};

function normalizeMatchResponse(input: unknown): MatchResponse | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<MatchResponse> & { state?: unknown };
  const state =
    raw.state === "exact_match" ||
    raw.state === "possible_duplicate" ||
    raw.state === "no_match"
      ? raw.state
      : "no_match";

  const exact = Array.isArray(raw.exact) ? raw.exact : [];
  const possible = Array.isArray(raw.possible) ? raw.possible : [];

  return {
    state,
    exact: exact.filter((item): item is MatchCandidate => {
      return Boolean(
        item &&
          typeof item === "object" &&
          typeof (item as MatchCandidate).clientId === "string" &&
          typeof (item as MatchCandidate).displayName === "string",
      );
    }),
    possible: possible.filter((item): item is MatchCandidate => {
      return Boolean(
        item &&
          typeof item === "object" &&
          typeof (item as MatchCandidate).clientId === "string" &&
          typeof (item as MatchCandidate).displayName === "string",
      );
    }),
  };
}

type Props = {
  businessId: string;
  businessSlug: string;
  actors?: TeamActor[];
  compact?: boolean;
  onCreated?: () => void;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeDigits(value: string) {
  return value.replace(/\D+/g, "");
}

function isEmailLike(value: string) {
  return value.includes("@") && value.includes(".");
}

function stateBadgeText(state: MatchResponse["state"]) {
  if (state === "exact_match") return "Existing client found";
  if (state === "possible_duplicate") return "Possible duplicates found";
  return "No existing client found";
}

export function ClientOrderForm({ businessId, businessSlug, actors = [], compact = false, onCreated }: Props) {
  const [clientType, setClientType] = React.useState<"individual" | "company">("individual");
  const [pendingType, setPendingType] = React.useState<"individual" | "company" | null>(null);
  const [typeSwitchDialogOpen, setTypeSwitchDialogOpen] = React.useState(false);
  const [isSaving, startSaving] = React.useTransition();
  const [isMatching, setIsMatching] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
  const [managerOptions, setManagerOptions] = React.useState<TeamActor[]>(actors);
  const [matchResult, setMatchResult] = React.useState<MatchResponse | null>(null);
  const [selectedExistingClientId, setSelectedExistingClientId] = React.useState<string>("");

  const [individual, setIndividual] = React.useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    postcode: "",
    inn: "",
  });
  const [company, setCompany] = React.useState({
    companyName: "",
    registrationNumber: "",
    vatNumber: "",
    phone: "",
    email: "",
    legalAddress: "",
    actualAddress: "",
    postcode: "",
  });
  const [contact, setContact] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    isPrimary: true,
  });
  const [order, setOrder] = React.useState({
    managerId: "",
    amount: "",
    dueDate: "",
    description: "",
  });

  const contactRoleOptions = ["Accountant", "Director", "Procurement", "Manager", "Logistics", "Owner", "Other"];

  React.useEffect(() => {
    if (actors.length > 0) {
      setManagerOptions(actors.slice().sort((a, b) => a.label.localeCompare(b.label)));
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const res = await fetch(`/api/manager/status?business_id=${encodeURIComponent(businessId)}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          owner?: { id?: string | null; full_name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null } | null;
          managers_active?: Array<{ user_id: string; full_name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null }>;
        };
        if (!alive) return;
        const next: TeamActor[] = [];
        if (data.owner?.id) {
          next.push({
            id: String(data.owner.id),
            label: cleanText(data.owner.full_name) || [cleanText(data.owner.first_name), cleanText(data.owner.last_name)].filter(Boolean).join(" ") || cleanText(data.owner.email) || "Owner",
            kind: "OWNER",
          });
        }
        for (const m of data.managers_active ?? []) {
          next.push({
            id: String(m.user_id),
            label: cleanText(m.full_name) || [cleanText(m.first_name), cleanText(m.last_name)].filter(Boolean).join(" ") || cleanText(m.email) || "Manager",
            kind: "MANAGER",
          });
        }
        setManagerOptions(next.sort((a, b) => a.label.localeCompare(b.label)));
      } catch {
        // Keep empty managers list on failure.
      }
    })();
    return () => {
      alive = false;
    };
  }, [actors, businessId]);

  const strongSignalsForMatch = React.useMemo(() => {
    if (clientType === "individual") {
      return Boolean(normalizeDigits(individual.inn) || normalizeDigits(individual.phone) || cleanText(individual.email));
    }
    return Boolean(
      cleanText(company.registrationNumber) ||
        cleanText(company.vatNumber) ||
        normalizeDigits(company.phone) ||
        cleanText(company.email),
    );
  }, [clientType, company.email, company.phone, company.registrationNumber, company.vatNumber, individual.email, individual.inn, individual.phone]);

  React.useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      if (!strongSignalsForMatch) {
        setMatchResult(null);
        setSelectedExistingClientId("");
        return;
      }
      setIsMatching(true);
      try {
        const payload: Record<string, unknown> = {
          businessId,
          clientType,
        };
        if (clientType === "individual") {
          payload.firstName = individual.firstName;
          payload.lastName = individual.lastName;
          payload.phone = individual.phone;
          payload.email = individual.email;
          payload.inn = individual.inn;
        } else {
          payload.companyName = company.companyName;
          payload.registrationNumber = company.registrationNumber;
          payload.vatNumber = company.vatNumber;
          payload.phone = company.phone;
          payload.email = company.email;
        }

        const res = await fetch("/api/clients/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const rawData = (await res.json().catch(() => ({}))) as unknown;
        if (!res.ok) {
          setMatchResult(null);
          setSelectedExistingClientId("");
          return;
        }
        const normalized = normalizeMatchResponse(rawData);
        if (!normalized) {
          setMatchResult({
            state: "no_match",
            exact: [],
            possible: [],
          });
          setSelectedExistingClientId("");
          return;
        }
        setMatchResult(normalized);
        const firstExact = normalized.exact[0]?.clientId ?? "";
        if (firstExact) setSelectedExistingClientId(firstExact);
      } catch {
        if (!controller.signal.aborted) {
          setMatchResult(null);
          setSelectedExistingClientId("");
        }
      } finally {
        if (!controller.signal.aborted) setIsMatching(false);
      }
    }, 380);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [
    businessId,
    clientType,
    company.companyName,
    company.email,
    company.phone,
    company.registrationNumber,
    company.vatNumber,
    individual.email,
    individual.firstName,
    individual.inn,
    individual.lastName,
    individual.phone,
    strongSignalsForMatch,
  ]);

  function requestTypeSwitch(nextType: "individual" | "company") {
    if (nextType === clientType) return;
    setPendingType(nextType);
    setTypeSwitchDialogOpen(true);
  }

  function applyTypeSwitch(keepData: boolean) {
    const target = pendingType;
    setTypeSwitchDialogOpen(false);
    setPendingType(null);
    if (!target) return;

    if (!keepData) {
      if (target === "individual") {
        setIndividual({
          firstName: "",
          lastName: "",
          phone: "",
          email: "",
          address: "",
          postcode: "",
          inn: "",
        });
      } else {
        setContact({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          jobTitle: "",
          isPrimary: true,
        });
      }
    } else if (clientType === "individual" && target === "company") {
      setContact((prev) => ({
        ...prev,
        firstName: prev.firstName || individual.firstName,
        lastName: prev.lastName || individual.lastName,
        email: prev.email || individual.email,
        phone: prev.phone || individual.phone,
      }));
    } else if (clientType === "company" && target === "individual") {
      setIndividual((prev) => ({
        ...prev,
        firstName: prev.firstName || contact.firstName,
        lastName: prev.lastName || contact.lastName,
        email: prev.email || contact.email,
        phone: prev.phone || contact.phone,
      }));
    }

    setMatchResult(null);
    setSelectedExistingClientId("");
    setClientType(target);
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};
    const amount = Number(order.amount);
    if (!Number.isFinite(amount) || amount <= 0) nextErrors.amount = "Amount must be greater than 0";
    if (!order.managerId) nextErrors.managerId = "Manager is required";

    if (clientType === "individual") {
      const hasStrong = Boolean(normalizeDigits(individual.inn) || normalizeDigits(individual.phone) || cleanText(individual.email));
      if (!hasStrong) nextErrors.individual_strong = "Enter at least one: INN, phone, or email";
      if (!individual.firstName && !individual.lastName) nextErrors.individual_name = "Enter at least first or last name";
      if (individual.email && !isEmailLike(individual.email)) nextErrors.individual_email = "Email format looks invalid";
    } else {
      const hasStrong = Boolean(
        cleanText(company.registrationNumber) ||
          cleanText(company.vatNumber) ||
          normalizeDigits(company.phone) ||
          cleanText(company.email),
      );
      if (!company.companyName) nextErrors.company_name = "Company name is required";
      if (!hasStrong) nextErrors.company_strong = "Enter at least one: registration, VAT/tax, phone, or email";
      if (company.email && !isEmailLike(company.email)) nextErrors.company_email = "Email format looks invalid";
    }

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function submit() {
    setErrorText(null);
    if (!validateForm()) return;

    const payload: CreateOrderClientPayloadInput = {
      businessId,
      businessSlug,
      clientType,
      managerId: order.managerId,
      amount: Number(order.amount),
      dueDate: order.dueDate || null,
      description: order.description || null,
      existingClientId: selectedExistingClientId || null,
      individual: clientType === "individual" ? individual : null,
      company: clientType === "company" ? company : null,
      contact: clientType === "company" ? contact : null,
    };

    startSaving(async () => {
      try {
        await createOrderFromClientPayload(payload);
        onCreated?.();
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : "Failed to create order");
      }
    });
  }

  const panelCls = compact
    ? "rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
    : "rounded-2xl border border-[#E5E7EB] bg-white p-4";
  const inputCls = "h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15";
  const textareaCls = "min-h-[92px] w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15";

  return (
    <div className="space-y-3">
      <section className={panelCls}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">Client type</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => requestTypeSwitch("individual")}
            className={[
              "inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition",
              clientType === "individual"
                ? "border-[var(--brand-600)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                : "border-[#E5E7EB] bg-white text-[#475467] hover:border-[#C7D2FE]",
            ].join(" ")}
          >
            <UserRound className="h-4 w-4" />
            Individual
          </button>
          <button
            type="button"
            onClick={() => requestTypeSwitch("company")}
            className={[
              "inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition",
              clientType === "company"
                ? "border-[var(--brand-600)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                : "border-[#E5E7EB] bg-white text-[#475467] hover:border-[#C7D2FE]",
            ].join(" ")}
          >
            <Building2 className="h-4 w-4" />
            Company
          </button>
        </div>
      </section>

      <section className={panelCls}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[#111827]">Duplicate check</div>
            <div className="text-xs text-[#667085]">Live lookup by strong identifiers</div>
          </div>
          {isMatching ? <div className="text-xs font-medium text-[#667085]">Checking…</div> : null}
        </div>
        <div className="mt-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
          <div className="text-sm font-semibold text-[#1F2937]">
            {matchResult ? stateBadgeText(matchResult.state) : "Enter identifiers to start matching"}
          </div>
          {matchResult &&
          (matchResult.exact.length > 0 || matchResult.possible.length > 0) ? (
            <div className="mt-2 space-y-2">
              {[...matchResult.exact, ...matchResult.possible].slice(0, 5).map((candidate) => (
                <label key={candidate.clientId} className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#E5E7EB] bg-white p-2.5">
                  <input
                    type="radio"
                    name="existing_client"
                    checked={selectedExistingClientId === candidate.clientId}
                    onChange={() => setSelectedExistingClientId(candidate.clientId)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#1F2937]">{candidate.displayName}</span>
                    <span className="block text-xs text-[#667085]">
                      {[candidate.email, candidate.phone, candidate.reason].filter(Boolean).join(" • ")}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {clientType === "individual" ? (
        <section className={panelCls}>
          <div className="text-sm font-semibold text-[#111827]">Client</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <input value={individual.firstName} onChange={(e) => setIndividual((v) => ({ ...v, firstName: e.currentTarget.value }))} className={inputCls} />
            </Field>
            <Field label="Last name">
              <input value={individual.lastName} onChange={(e) => setIndividual((v) => ({ ...v, lastName: e.currentTarget.value }))} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={individual.phone} onChange={(e) => setIndividual((v) => ({ ...v, phone: e.currentTarget.value }))} className={inputCls} />
            </Field>
            <Field label="Email">
              <input value={individual.email} onChange={(e) => setIndividual((v) => ({ ...v, email: e.currentTarget.value }))} className={inputCls} />
            </Field>
            <Field label="Tax ID / INN">
              <input value={individual.inn} onChange={(e) => setIndividual((v) => ({ ...v, inn: e.currentTarget.value }))} className={inputCls} />
            </Field>
            <Field label="Postcode">
              <input value={individual.postcode} onChange={(e) => setIndividual((v) => ({ ...v, postcode: e.currentTarget.value }))} className={inputCls} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input value={individual.address} onChange={(e) => setIndividual((v) => ({ ...v, address: e.currentTarget.value }))} className={inputCls} />
            </Field>
          </div>
          {validationErrors.individual_name || validationErrors.individual_strong || validationErrors.individual_email ? (
            <div className="mt-2 text-xs font-medium text-rose-700">
              {validationErrors.individual_name || validationErrors.individual_strong || validationErrors.individual_email}
            </div>
          ) : null}
        </section>
      ) : (
        <>
          <section className={panelCls}>
            <div className="text-sm font-semibold text-[#111827]">Company</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Company name">
                <input value={company.companyName} onChange={(e) => setCompany((v) => ({ ...v, companyName: e.currentTarget.value }))} className={inputCls} />
              </Field>
              <Field label="Registration number">
                <input value={company.registrationNumber} onChange={(e) => setCompany((v) => ({ ...v, registrationNumber: e.currentTarget.value }))} className={inputCls} />
              </Field>
              <Field label="VAT / Tax number">
                <input value={company.vatNumber} onChange={(e) => setCompany((v) => ({ ...v, vatNumber: e.currentTarget.value }))} className={inputCls} />
              </Field>
              <Field label="Company phone">
                <input value={company.phone} onChange={(e) => setCompany((v) => ({ ...v, phone: e.currentTarget.value }))} className={inputCls} />
              </Field>
              <Field label="Company email">
                <input value={company.email} onChange={(e) => setCompany((v) => ({ ...v, email: e.currentTarget.value }))} className={inputCls} />
              </Field>
              <Field label="Postcode">
                <input value={company.postcode} onChange={(e) => setCompany((v) => ({ ...v, postcode: e.currentTarget.value }))} className={inputCls} />
              </Field>
              <Field label="Legal / registered address" className="sm:col-span-2">
                <input value={company.legalAddress} onChange={(e) => setCompany((v) => ({ ...v, legalAddress: e.currentTarget.value }))} className={inputCls} />
              </Field>
              <Field label="Actual address" className="sm:col-span-2">
                <input value={company.actualAddress} onChange={(e) => setCompany((v) => ({ ...v, actualAddress: e.currentTarget.value }))} className={inputCls} />
              </Field>
            </div>
            {validationErrors.company_name || validationErrors.company_strong || validationErrors.company_email ? (
              <div className="mt-2 text-xs font-medium text-rose-700">
                {validationErrors.company_name || validationErrors.company_strong || validationErrors.company_email}
              </div>
            ) : null}
          </section>

          <section className={panelCls}>
            <div className="text-sm font-semibold text-[#111827]">Contact person</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="First name">
                <input value={contact.firstName} onChange={(e) => setContact((v) => ({ ...v, firstName: e.currentTarget.value }))} className={inputCls} />
              </Field>
              <Field label="Last name">
                <input value={contact.lastName} onChange={(e) => setContact((v) => ({ ...v, lastName: e.currentTarget.value }))} className={inputCls} />
              </Field>
              <Field label="Email">
                <input value={contact.email} onChange={(e) => setContact((v) => ({ ...v, email: e.currentTarget.value }))} className={inputCls} />
              </Field>
              <Field label="Phone">
                <input value={contact.phone} onChange={(e) => setContact((v) => ({ ...v, phone: e.currentTarget.value }))} className={inputCls} />
              </Field>
              <Field label="Role / job title">
                <select
                  value={contactRoleOptions.includes(contact.jobTitle) ? contact.jobTitle : "Other"}
                  onChange={(e) => {
                    const next = e.currentTarget.value;
                    setContact((v) => ({ ...v, jobTitle: next === "Other" ? "" : next }));
                  }}
                  className={inputCls}
                >
                  {contactRoleOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              {!contactRoleOptions.includes(contact.jobTitle) || !contact.jobTitle ? (
                <Field label="Custom role">
                  <input value={contact.jobTitle} onChange={(e) => setContact((v) => ({ ...v, jobTitle: e.currentTarget.value }))} className={inputCls} />
                </Field>
              ) : null}
            </div>
            <label className="mt-3 inline-flex items-center gap-2 text-sm text-[#475467]">
              <input
                type="checkbox"
                checked={contact.isPrimary}
                onChange={(e) => setContact((v) => ({ ...v, isPrimary: e.currentTarget.checked }))}
                className="h-4 w-4 rounded border-slate-300"
              />
              Set as primary contact
            </label>
          </section>
        </>
      )}

      <section className={panelCls}>
        <div className="text-sm font-semibold text-[#111827]">Order details</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Manager">
            <select value={order.managerId} onChange={(e) => setOrder((v) => ({ ...v, managerId: e.currentTarget.value }))} className={inputCls}>
              <option value="">Select manager</option>
              {managerOptions.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount">
            <input inputMode="decimal" value={order.amount} onChange={(e) => setOrder((v) => ({ ...v, amount: e.currentTarget.value }))} className={inputCls} />
          </Field>
          <Field label="Due date">
            <input type="date" value={order.dueDate} onChange={(e) => setOrder((v) => ({ ...v, dueDate: e.currentTarget.value }))} className={inputCls} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea value={order.description} onChange={(e) => setOrder((v) => ({ ...v, description: e.currentTarget.value }))} className={textareaCls} />
          </Field>
        </div>
        {validationErrors.managerId || validationErrors.amount ? (
          <div className="mt-2 text-xs font-medium text-rose-700">{validationErrors.managerId || validationErrors.amount}</div>
        ) : null}
      </section>

      {errorText ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorText}</span>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={isSaving}
          onClick={submit}
          className="h-10 rounded-xl border border-[var(--brand-600)] bg-[var(--brand-600)] px-5 text-sm font-semibold text-white hover:border-[var(--brand-700)] hover:bg-[var(--brand-700)]"
        >
          {isSaving ? "Creating..." : "Create order"}
        </Button>
      </div>

      <AlertDialog open={typeSwitchDialogOpen} onOpenChange={setTypeSwitchDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-[#E5E7EB]">
          <AlertDialogHeader>
            <AlertDialogTitle>Switch client type?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing contact fields can be mapped to the target type. Choose whether to preserve mapped data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => applyTypeSwitch(false)}>Switch and clear</AlertDialogCancel>
            <AlertDialogAction onClick={() => applyTypeSwitch(true)}>Switch and keep mapped data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">{label}</span>
      {children}
    </label>
  );
}

"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Bug,
  Calendar,
  CheckSquare,
  ChevronDown,
  Clock3,
  FolderKanban,
  Layers,
  ListTodo,
  Search,
  Settings,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  TrackerItemPriority,
  TrackerItemStatus,
  TrackerItemType,
  TrackerProject,
  TrackerProjectSnapshot,
} from "@/lib/tracker/types";

type Props = {
  workspace: { id: string; slug: string; name: string };
  currentUserId: string;
  initialProjects: TrackerProject[];
  initialSnapshot: TrackerProjectSnapshot | null;
};
type Page =
  | "dashboard"
  | "projects"
  | "my_work"
  | "board"
  | "list"
  | "backlog"
  | "epics"
  | "sprints"
  | "issue";
const tabs: {
  key: Exclude<Page, "dashboard" | "projects" | "my_work" | "issue">;
  label: string;
}[] = [
  { key: "board", label: "Board" },
  { key: "list", label: "List" },
  { key: "backlog", label: "Backlog" },
  { key: "epics", label: "Epics" },
  { key: "sprints", label: "Sprints" },
];
const cols: { status: TrackerItemStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "selected", label: "Selected" },
  { status: "in_progress", label: "In Progress" },
  { status: "review", label: "Review" },
  { status: "done", label: "Done" },
];
const sMeta: Record<TrackerItemStatus, { l: string; c: string }> = {
  backlog: {
    l: "Backlog",
    c: "bg-[var(--neutral-100)] text-[var(--neutral-600)]",
  },
  selected: {
    l: "Selected",
    c: "bg-[var(--brand-50)] text-[var(--brand-700)]",
  },
  in_progress: { l: "In Progress", c: "bg-[#E6F4FD] text-[#0284C7]" },
  review: { l: "In Review", c: "bg-[#EFE9FB] text-[#7C3AED]" },
  blocked: { l: "Blocked", c: "bg-[#FDECEC] text-[#EF4444]" },
  done: { l: "Done", c: "bg-[#EAF8EF] text-[#22C55E]" },
  canceled: {
    l: "Canceled",
    c: "bg-[var(--neutral-100)] text-[var(--neutral-600)]",
  },
};
const pMeta: Record<TrackerItemPriority, { l: string; c: string }> = {
  critical: { l: "Critical", c: "bg-[#FDECEC] text-[#EF4444]" },
  high: { l: "High", c: "bg-[#FEF4E8] text-[#F59E0B]" },
  medium: { l: "Medium", c: "bg-[#EAF0FE] text-[#3B82F6]" },
  low: { l: "Low", c: "bg-[#EAF8EF] text-[#22C55E]" },
};
const iMeta: Record<
  TrackerItemType,
  { i: React.ComponentType<{ className?: string }>; c: string }
> = {
  story: { i: BookOpen, c: "text-[#7C3AED]" },
  task: { i: CheckSquare, c: "text-[#22C55E]" },
  subtask: { i: Sparkles, c: "text-[#3B82F6]" },
  bug: { i: Bug, c: "text-[#10B981]" },
  improvement: { i: ArrowLeft, c: "text-[#3B82F6] rotate-90" },
  research: { i: Activity, c: "text-[var(--neutral-500)]" },
  support: { i: Activity, c: "text-[#F59E0B]" },
  chore: { i: Wrench, c: "text-[var(--neutral-500)]" },
};
const fmt = (v: string | null) =>
  v ? new Date(v).toISOString().slice(0, 10) : "-";
const name = (p?: TrackerProjectSnapshot["profiles"][number]) =>
  p?.full_name || p?.email || "Unassigned";
const ini = (n: string) =>
  n
    .split(" ")
    .filter(Boolean)
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "UN";
const checklist = (raw: unknown) =>
  Array.isArray(raw)
    ? raw
        .map((row, i) => {
          if (!row || typeof row !== "object") return null;
          const r = row as Record<string, unknown>;
          const text = typeof r.text === "string" ? r.text : "";
          if (!text.trim()) return null;
          return {
            id: String(r.id ?? i),
            text: text.trim(),
            checked: Boolean(r.checked),
          };
        })
        .filter((x): x is { id: string; text: string; checked: boolean } =>
          Boolean(x),
        )
    : [];
const sb = (s: TrackerItemStatus) => (
  <Badge
    variant="secondary"
    className={`rounded-full border-0 px-2.5 py-1 text-xs ${sMeta[s].c}`}
  >
    {sMeta[s].l}
  </Badge>
);
const pb = (p: TrackerItemPriority) => (
  <Badge
    variant="secondary"
    className={`rounded-full border-0 px-2.5 py-1 text-xs ${pMeta[p].c}`}
  >
    {pMeta[p].l}
  </Badge>
);
const ico = (t: TrackerItemType) => {
  const I = iMeta[t].i;
  return <I className={`h-3.5 w-3.5 ${iMeta[t].c}`} />;
};
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const d = (await r.json()) as { ok: boolean; error?: string } & T;
  if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
  return d;
}

export function TrackerModule({
  workspace,
  currentUserId,
  initialProjects,
  initialSnapshot,
}: Props) {
  const [projects] = useState(initialProjects);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [page, setPage] = useState<Page>("dashboard");
  const [search, setSearch] = useState("");
  const [issueId, setIssueId] = useState<string | null>(null);
  const profiles = useMemo(() => {
    const m = new Map<string, TrackerProjectSnapshot["profiles"][number]>();
    for (const p of snapshot?.profiles ?? []) m.set(p.id, p);
    return m;
  }, [snapshot?.profiles]);
  const items = useMemo(() => {
    const src = (snapshot?.items ?? []).filter((i) => i.type !== "subtask");
    const q = search.trim().toLowerCase();
    return q
      ? src.filter((i) =>
          `${i.code} ${i.title} ${i.description ?? ""}`
            .toLowerCase()
            .includes(q),
        )
      : src;
  }, [snapshot?.items, search]);
  const selected =
    (snapshot?.items ?? []).find((i) => i.id === issueId) ?? null;
  const subtasks = selected
    ? (snapshot?.items ?? []).filter((i) => i.parent_item_id === selected.id)
    : [];
  const comments = selected
    ? (snapshot?.comments ?? []).filter((c) => c.item_id === selected.id)
    : [];
  const acts = selected
    ? (snapshot?.activity ?? []).filter(
        (a) => a.entity_type === "item" && a.entity_id === selected.id,
      )
    : [];
  const myOpen = items.filter(
    (i) =>
      i.assignee_user_id === currentUserId &&
      !["done", "canceled"].includes(i.status),
  );
  const overdue = items.filter(
    (i) =>
      i.due_date &&
      !["done", "canceled"].includes(i.status) &&
      i.due_date < new Date().toISOString().slice(0, 10),
  );
  const inProgress = items.filter((i) => i.status === "in_progress");
  const activeSprints = (snapshot?.sprints ?? []).filter(
    (s) => s.status === "active",
  );
  const open = (id: string) => {
    setIssueId(id);
    setPage("issue");
  };
  const reload = async (projectId = snapshot?.project.id) => {
    if (!projectId) return;
    const params = search.trim()
      ? `?search=${encodeURIComponent(search.trim())}`
      : "";
    const d = await api<{ snapshot: TrackerProjectSnapshot }>(
      `/api/tracker/projects/${projectId}/snapshot${params}`,
    );
    setSnapshot(d.snapshot);
  };
  const move = async (id: string, status: TrackerItemStatus) => {
    await api(`/api/tracker/items/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    await reload();
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pt-[64px] text-[var(--neutral-900)]">
      <div className="flex min-h-screen w-full">
        <aside className="relative w-[272px] border-r border-[var(--neutral-200)] bg-white">
          <div className="border-b border-[var(--neutral-200)] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--brand-500)] text-xs font-bold text-white">
                T
              </div>
              <span className="text-[22px] font-semibold tracking-tight">
                TaskFlow
              </span>
            </div>
          </div>
          <div className="space-y-1 px-2 py-2">
            <button
              onClick={() => setPage("dashboard")}
              className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm ${page === "dashboard" ? "bg-[var(--neutral-100)] text-[var(--brand-600)]" : "text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]"}`}
            >
              <Activity className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => setPage("projects")}
              className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm ${page === "projects" ? "bg-[var(--neutral-100)] text-[var(--brand-600)]" : "text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]"}`}
            >
              <FolderKanban className="h-4 w-4" />
              Projects
            </button>
            <button
              onClick={() => setPage("my_work")}
              className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm ${page === "my_work" ? "bg-[var(--neutral-100)] text-[var(--brand-600)]" : "text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]"}`}
            >
              <ListTodo className="h-4 w-4" />
              My Work
            </button>
          </div>
          <div className="px-4 pt-3 text-xs font-semibold uppercase tracking-wider text-[var(--neutral-500)]">
            Projects
          </div>
          <div className="space-y-1 px-2 py-2">
            {projects.map((project) => (
              <div key={project.id}>
                <button
                  onClick={() => void reload(project.id)}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-[var(--neutral-100)]"
                >
                  <span className="flex items-center gap-2 text-sm text-[var(--neutral-700)]">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--neutral-100)] text-[10px] font-bold text-[var(--neutral-800)]">
                      {project.key.slice(0, 2)}
                    </span>
                    {project.name}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--neutral-500)]" />
                </button>
                {snapshot?.project.id === project.id ? (
                  <div className="ml-7 space-y-0.5 border-l border-[var(--neutral-200)] pl-2">
                    {tabs.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setPage(t.key)}
                        className={`block w-full rounded px-2 py-1 text-left text-sm ${page === t.key ? "font-medium text-[var(--brand-600)]" : "text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 w-full border-t border-[var(--neutral-200)] p-2">
            <Link
              href="/app/settings"
              className="flex items-center gap-2 rounded px-3 py-2 text-sm text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-4 border-b border-[var(--neutral-200)] bg-white px-4">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Layers className="h-4 w-4 text-[var(--neutral-600)]" />
            </Button>
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--neutral-500)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={() => void reload()}
                placeholder="Search issues, projects..."
                className="h-9 border-0 bg-[var(--neutral-100)] pl-9"
              />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {!snapshot ? (
              <div className="text-sm text-[var(--neutral-600)]">
                No tracker project found.
              </div>
            ) : null}
            {snapshot && page === "dashboard" ? (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-semibold">Dashboard</h1>
                  <p className="mt-1 text-sm text-[var(--neutral-600)]">
                    Welcome back, {name(profiles.get(currentUserId))}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                  <Metric
                    v={myOpen.length}
                    l="My Open Tasks"
                    i={<Sparkles className="h-5 w-5 text-[var(--brand-500)]" />}
                    b="bg-[var(--brand-50)]"
                  />
                  <Metric
                    v={overdue.length}
                    l="Overdue"
                    i={<AlertTriangle className="h-5 w-5 text-[#EF4444]" />}
                    b="bg-[#FDECEC]"
                  />
                  <Metric
                    v={inProgress.length}
                    l="In Progress"
                    i={<Activity className="h-5 w-5 text-[#0284C7]" />}
                    b="bg-[#E6F4FD]"
                  />
                  <Metric
                    v={activeSprints.length}
                    l="Active Sprints"
                    i={<Clock3 className="h-5 w-5 text-[#22C55E]" />}
                    b="bg-[#EAF8EF]"
                  />
                </div>
              </div>
            ) : null}
            {snapshot && page === "projects" ? (
              <div className="space-y-6">
                <h1 className="text-2xl font-semibold">Projects</h1>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {projects.map((p) => {
                    const cur = p.id === snapshot.project.id;
                    const pi = cur ? items : [];
                    const done = pi.filter((i) => i.status === "done").length;
                    const pr = pi.length
                      ? Math.round((done / pi.length) * 100)
                      : 0;
                    return (
                      <button
                        key={p.id}
                        onClick={() => void reload(p.id)}
                        className="h-full rounded-lg border border-[var(--neutral-200)] bg-white p-5 text-left transition hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="rounded-lg bg-[var(--brand-50)] p-2 text-[var(--brand-500)]">
                            <FolderKanban className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-[var(--neutral-500)]">
                              {p.key}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-[var(--neutral-600)]">
                          {p.description || "No description"}
                        </p>
                        <div className="mt-4 space-y-1">
                          <div className="flex items-center justify-between text-xs text-[var(--neutral-500)]">
                            <span>
                              {snapshot.epics.length} epics - {pi.length} items
                            </span>
                            <span>{pr}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--neutral-100)]">
                            <div
                              className="h-full rounded-full bg-[var(--brand-500)]"
                              style={{ width: `${pr}%` }}
                            />
                          </div>
                        </div>
                        <div className="mt-4 inline-flex items-center gap-1.5">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1DA1F2] text-[10px] font-semibold text-white">
                            {ini(name(profiles.get(p.owner_user_id)))}
                          </span>
                          <span className="text-sm text-[var(--neutral-700)]">
                            {name(profiles.get(p.owner_user_id))}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {snapshot && page === "my_work" ? (
              <div className="space-y-6">
                <h1 className="text-2xl font-semibold">My Work</h1>
                <div className="overflow-hidden rounded-lg border border-[var(--neutral-200)] bg-white">
                  <div className="divide-y divide-[var(--neutral-200)]">
                    {items
                      .filter((i) => i.assignee_user_id === currentUserId)
                      .map((i) => (
                        <button
                          key={i.id}
                          onClick={() => open(i.id)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--neutral-100)]"
                        >
                          {ico(i.type)}
                          <span className="w-16 text-xs text-[var(--neutral-500)]">
                            {i.code}
                          </span>
                          <p className="min-w-0 flex-1 truncate text-sm">
                            {i.title}
                          </p>
                          {sb(i.status)}
                          {pb(i.priority)}
                          <span className="w-24 text-right text-xs text-[var(--neutral-500)]">
                            {fmt(i.due_date)}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            ) : null}
            {snapshot && page === "board" ? (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold">
                    {snapshot.project.name} - Board
                  </h1>
                  <p className="text-sm text-[var(--neutral-600)]">
                    {snapshot.project.key}
                  </p>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {cols.map((c) => {
                    const ci = items.filter((i) => i.status === c.status);
                    return (
                      <div
                        key={c.status}
                        className="w-[280px] min-w-[280px] shrink-0"
                      >
                        <div className="mb-3 flex items-center justify-between px-1">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-500)]">
                            {c.label}
                          </h3>
                          <span className="rounded-full bg-[var(--neutral-100)] px-2 py-0.5 text-xs text-[var(--neutral-500)]">
                            {ci.length}
                          </span>
                        </div>
                        <div
                          className="space-y-2"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={async (e) => {
                            const id = e.dataTransfer.getData("text/plain");
                            if (id) await move(id, c.status);
                          }}
                        >
                          {ci.map((i) => (
                            <button
                              key={i.id}
                              onClick={() => open(i.id)}
                              draggable
                              onDragStart={(e) =>
                                e.dataTransfer.setData("text/plain", i.id)
                              }
                              className="w-full rounded-lg border border-[var(--neutral-200)] bg-white p-3 text-left transition hover:shadow-md"
                            >
                              <div className="flex items-start gap-2">
                                {ico(i.type)}
                                <p className="flex-1 text-sm font-medium leading-snug">
                                  {i.title}
                                </p>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-xs text-[var(--neutral-500)]">
                                  {i.code}
                                </span>
                                {pb(i.priority)}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {snapshot && page === "list" ? (
              <div className="space-y-4">
                <h1 className="text-xl font-semibold">
                  {snapshot.project.name} - Issues
                </h1>
                <div className="overflow-hidden rounded-lg border border-[var(--neutral-200)] bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[var(--neutral-100)]/50">
                        <TableHead className="w-12">Type</TableHead>
                        <TableHead className="w-24">Key</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="w-28">Status</TableHead>
                        <TableHead className="w-24">Priority</TableHead>
                        <TableHead className="w-36">Assignee</TableHead>
                        <TableHead className="w-24">Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((i) => (
                        <TableRow
                          key={i.id}
                          className="cursor-pointer hover:bg-[var(--neutral-100)]"
                          onClick={() => open(i.id)}
                        >
                          <TableCell>{ico(i.type)}</TableCell>
                          <TableCell className="text-xs font-medium text-[var(--brand-600)]">
                            {i.code}
                          </TableCell>
                          <TableCell>{i.title}</TableCell>
                          <TableCell>{sb(i.status)}</TableCell>
                          <TableCell>{pb(i.priority)}</TableCell>
                          <TableCell>
                            {i.assignee_user_id
                              ? name(profiles.get(i.assignee_user_id))
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-[var(--neutral-500)]">
                            {fmt(i.due_date)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
            {snapshot && page === "backlog" ? (
              <div className="space-y-6">
                <h1 className="text-xl font-semibold">
                  {snapshot.project.name} - Backlog
                </h1>
                {snapshot.sprints.map((s) => (
                  <Card key={s.id} className="gap-0 rounded-lg p-0">
                    <CardHeader className="px-5 pt-5 pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="mb-0 text-sm font-medium">
                          {s.name}{" "}
                          <span className="text-xs text-[var(--neutral-500)]">
                            ({s.status})
                          </span>
                        </CardTitle>
                        <span className="text-xs text-[var(--neutral-500)]">
                          {fmt(s.start_date)} - {fmt(s.end_date)}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--neutral-600)]">
                        {s.goal || "No sprint goal"}
                      </p>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-[var(--neutral-200)]">
                        {items
                          .filter((i) => i.sprint_id === s.id)
                          .map((i) => (
                            <button
                              key={i.id}
                              onClick={() => open(i.id)}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--neutral-100)]"
                            >
                              {ico(i.type)}
                              <span className="w-16 text-xs text-[var(--neutral-500)]">
                                {i.code}
                              </span>
                              <p className="min-w-0 flex-1 truncate text-sm">
                                {i.title}
                              </p>
                              {sb(i.status)}
                              {pb(i.priority)}
                            </button>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}
            {snapshot && page === "epics" ? (
              <div className="space-y-6">
                <h1 className="text-xl font-semibold">
                  {snapshot.project.name} - Epics
                </h1>
                <div className="space-y-4">
                  {snapshot.epics.map((e) => {
                    const ei = items.filter((i) => i.epic_id === e.id);
                    const done = ei.filter((i) => i.status === "done").length;
                    const pr = ei.length
                      ? Math.round((done / ei.length) * 100)
                      : 0;
                    return (
                      <Card key={e.id} className="gap-0 rounded-lg p-5">
                        <CardContent className="space-y-3 p-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-medium">{e.title}</h3>
                              <p className="mt-1 text-xs text-[var(--neutral-600)]">
                                {e.description || "No description"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {sb(e.status)}
                              {pb(e.priority)}
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex justify-between text-xs text-[var(--neutral-500)]">
                              <span>
                                {done}/{ei.length} items done
                              </span>
                              <span>{pr}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[var(--neutral-100)]">
                              <div
                                className="h-full rounded-full bg-[var(--brand-500)]"
                                style={{ width: `${pr}%` }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {snapshot && page === "sprints" ? (
              <div className="space-y-6">
                <h1 className="text-xl font-semibold">
                  {snapshot.project.name} - Sprints
                </h1>
                <div className="space-y-4">
                  {snapshot.sprints.map((s) => {
                    const si = items.filter((i) => i.sprint_id === s.id);
                    const done = si.filter((i) => i.status === "done").length;
                    const pr = si.length
                      ? Math.round((done / si.length) * 100)
                      : 0;
                    return (
                      <Card key={s.id} className="gap-0 rounded-lg p-0">
                        <CardHeader className="px-5 pt-5 pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CardTitle className="mb-0 text-base">
                                {s.name}
                              </CardTitle>
                              <Badge
                                variant="secondary"
                                className="rounded-full text-xs capitalize"
                              >
                                {s.status}
                              </Badge>
                            </div>
                            <span className="text-xs text-[var(--neutral-500)]">
                              {fmt(s.start_date)} - {fmt(s.end_date)}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 px-5 pb-5">
                          <div className="flex items-center gap-3">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--neutral-100)]">
                              <div
                                className="h-full rounded-full bg-[var(--brand-500)]"
                                style={{ width: `${pr}%` }}
                              />
                            </div>
                            <span className="text-xs text-[var(--neutral-500)]">
                              {done}/{si.length}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {snapshot && page === "issue" && selected ? (
              <div className="max-w-[1280px] space-y-6">
                <div className="flex items-center gap-2 text-sm text-[var(--neutral-500)]">
                  <button
                    onClick={() => setPage("board")}
                    className="flex items-center gap-1 hover:text-[var(--neutral-800)]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {snapshot.project.name}
                  </button>
                  <span>/</span>
                  <span className="font-medium text-[var(--neutral-900)]">
                    {selected.code}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-2">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        {ico(selected.type)}
                        <span className="text-xs text-[var(--neutral-500)]">
                          {selected.code}
                        </span>
                      </div>
                      <h1 className="text-xl font-semibold">
                        {selected.title}
                      </h1>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--neutral-600)]">
                        {selected.description || "No description"}
                      </p>
                    </div>
                    {checklist(selected.checklist_json).length > 0 ? (
                      <Card className="gap-0 rounded-lg p-0">
                        <CardHeader className="px-5 pt-5 pb-3">
                          <CardTitle className="mb-0 text-sm">
                            Checklist (
                            {
                              checklist(selected.checklist_json).filter(
                                (c) => c.checked,
                              ).length
                            }
                            /{checklist(selected.checklist_json).length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 px-5 pb-5">
                          {checklist(selected.checklist_json).map((c) => (
                            <div key={c.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={c.checked}
                                readOnly
                                className="h-4 w-4"
                              />
                              <span
                                className={`text-sm ${c.checked ? "line-through text-[var(--neutral-500)]" : ""}`}
                              >
                                {c.text}
                              </span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ) : null}
                    <Card className="gap-0 rounded-lg p-0">
                      <CardHeader className="px-5 pt-5 pb-3">
                        <CardTitle className="mb-0 flex items-center gap-2 text-sm">
                          <Clock3 className="h-4 w-4" />
                          Comments ({comments.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 px-5 pb-5">
                        {comments.length === 0 ? (
                          <p className="text-xs text-[var(--neutral-500)]">
                            No comments yet
                          </p>
                        ) : (
                          comments.map((c) => (
                            <div
                              key={c.id}
                              className="text-sm text-[var(--neutral-600)]"
                            >
                              {c.body}
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                    <Card className="gap-0 rounded-lg p-0">
                      <CardHeader className="px-5 pt-5 pb-3">
                        <CardTitle className="mb-0 text-sm">
                          Subtasks ({subtasks.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-[var(--neutral-200)]">
                          {subtasks.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => open(s.id)}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--neutral-100)]"
                            >
                              {ico(s.type)}
                              <span className="w-16 text-xs text-[var(--neutral-500)]">
                                {s.code}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm">
                                {s.title}
                              </span>
                              {sb(s.status)}
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    {acts.length > 0 ? (
                      <Card className="gap-0 rounded-lg p-0">
                        <CardHeader className="px-5 pt-5 pb-3">
                          <CardTitle className="mb-0 text-sm">
                            Activity
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 px-5 pb-5">
                          {acts.map((a) => (
                            <div
                              key={a.id}
                              className="text-xs text-[var(--neutral-500)]"
                            >
                              <span className="font-medium text-[var(--neutral-800)]">
                                {name(profiles.get(a.user_id ?? ""))}
                              </span>{" "}
                              {a.action} - {fmt(a.created_at)}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ) : null}
                  </div>
                  <div>
                    <Card className="gap-0 rounded-lg p-0">
                      <CardContent className="space-y-4 p-4">
                        <Row l="Status">{sb(selected.status)}</Row>
                        <Row l="Priority">{pb(selected.priority)}</Row>
                        <Row l="Assignee">
                          {selected.assignee_user_id
                            ? name(profiles.get(selected.assignee_user_id))
                            : "Unassigned"}
                        </Row>
                        <Row l="Reporter">
                          {selected.reporter_user_id
                            ? name(profiles.get(selected.reporter_user_id))
                            : "-"}
                        </Row>
                        {selected.estimate_value ? (
                          <Row l="Estimate">
                            <span className="inline-flex items-center gap-1 text-sm">
                              <Clock3 className="h-3 w-3" />
                              {selected.estimate_value}h
                            </span>
                          </Row>
                        ) : null}
                        {selected.due_date ? (
                          <Row l="Due">
                            <span className="inline-flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {fmt(selected.due_date)}
                            </span>
                          </Row>
                        ) : null}
                        <div className="border-t border-[var(--neutral-200)]" />
                        <div className="space-y-1 text-xs text-[var(--neutral-500)]">
                          <p>Created: {fmt(selected.created_at)}</p>
                          <p>Updated: {fmt(selected.updated_at)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            ) : null}
          </main>
        </div>
      </div>
      <div className="sr-only">{workspace.id}</div>
    </div>
  );
}

function Row({ l, children }: { l: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="pt-0.5 text-xs text-[var(--neutral-500)]">{l}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
function Metric({
  v,
  l,
  i,
  b,
}: {
  v: number;
  l: string;
  i: React.ReactNode;
  b: string;
}) {
  return (
    <Card className="gap-0 rounded-lg p-4">
      <CardContent className="flex items-center gap-3 p-0">
        <span className={`rounded-lg p-2 ${b}`}>{i}</span>
        <div>
          <p className="text-2xl font-semibold leading-none">{v}</p>
          <p className="mt-1 text-xs text-[var(--neutral-600)]">{l}</p>
        </div>
      </CardContent>
    </Card>
  );
}

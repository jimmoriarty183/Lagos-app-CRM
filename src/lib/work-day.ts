export type WorkDayStatus = "draft" | "running" | "paused" | "finished";

export type WorkDayRow = {
  id: string;
  business_id: string;
  workspace_id: string | null;
  user_id: string;
  work_date: string;
  status: WorkDayStatus;
  started_at: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  finished_at: string | null;
  total_pause_seconds: number;
  daily_summary: string | null;
  created_at: string;
  updated_at: string;
};

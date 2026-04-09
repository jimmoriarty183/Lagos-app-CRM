-- Keep schema in sync with production campaign delivery tracking.

create table if not exists public.user_campaign_states (
  campaign_id uuid not null,
  user_id uuid not null,
  read_at timestamptz null,
  dismissed_at timestamptz null,
  completed_at timestamptz null,
  updated_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);
alter table public.user_campaign_states add column if not exists delivered_at timestamptz null;
alter table public.user_campaign_states add column if not exists bell_shown_at timestamptz null;
alter table public.user_campaign_states add column if not exists popup_shown_at timestamptz null;
alter table public.user_campaign_states add column if not exists opened_at timestamptz null;
alter table public.user_campaign_states add column if not exists bell_opened_at timestamptz null;
alter table public.user_campaign_states add column if not exists popup_opened_at timestamptz null;
alter table public.user_campaign_states add column if not exists clicked_at timestamptz null;
alter table public.user_campaign_states add column if not exists bell_clicked_at timestamptz null;
alter table public.user_campaign_states add column if not exists popup_clicked_at timestamptz null;
create index if not exists campaigns_status_idx on public.campaigns (status);
create index if not exists campaigns_starts_at_idx on public.campaigns (starts_at desc);
create index if not exists campaigns_created_at_idx on public.campaigns (created_at desc);
create index if not exists user_campaign_states_user_idx on public.user_campaign_states (user_id);
create index if not exists user_campaign_states_campaign_idx on public.user_campaign_states (campaign_id);
create index if not exists survey_questions_campaign_idx on public.survey_questions (campaign_id, question_order);
create index if not exists survey_options_question_idx on public.survey_options (question_id, option_order);
create index if not exists survey_responses_campaign_user_idx on public.survey_responses (campaign_id, user_id);

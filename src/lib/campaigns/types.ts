export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CampaignType = "announcement" | "survey";
export type CampaignStatus = "draft" | "active" | "archived";
export type CampaignChannel = "bell" | "popup_right";
export type SurveyQuestionType = "single_choice" | "multiple_choice" | "yes_no" | "rating_1_5";

export type AppRole = "OWNER" | "MANAGER" | "GUEST" | "owner" | "manager" | "guest" | string;

export type Campaign = {
  id: string;
  type: CampaignType;
  title: string;
  body: string | null;
  status: CampaignStatus;
  startsAt: string | null;
  endsAt: string | null;
  channels: CampaignChannel[];
  targetRoles: AppRole[];
  targetSegments: string[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type UserCampaignState = {
  campaignId: string;
  userId: string;
  readAt: string | null;
  dismissedAt: string | null;
  completedAt: string | null;
};

export type CampaignBellItem = Campaign & {
  isRead: boolean;
  isDismissed: boolean;
  isCompleted: boolean;
};

export type SurveyOption = {
  id: string;
  questionId: string;
  optionOrder: number;
  label: string;
  value: string | null;
};

export type SurveyQuestion = {
  id: string;
  campaignId: string;
  questionOrder: number;
  questionType: SurveyQuestionType;
  title: string;
  options: SurveyOption[];
};

export type Survey = {
  campaign: Campaign;
  questions: SurveyQuestion[];
};

export type SurveyAnswerPayload = {
  questionId: string;
  optionIds: string[];
};

export type SurveySubmitPayload = {
  campaignId: string;
  answers: SurveyAnswerPayload[];
};

export type SurveyResponse = {
  id: string;
  campaignId: string;
  questionId: string;
  optionId: string;
  userId: string;
  createdAt: string | null;
};

export type SurveyOptionStats = SurveyOption & {
  responsesCount: number;
};

export type SurveyQuestionStats = Omit<SurveyQuestion, "options"> & {
  options: SurveyOptionStats[];
  totalResponses: number;
};

export type SurveyStats = {
  campaignId: string;
  title: string;
  questions: SurveyQuestionStats[];
};

export type AdminCampaignFilters = {
  type?: CampaignType | "all";
  status?: CampaignStatus | "all";
};

export type CreateCampaignPayload = {
  type: CampaignType;
  title: string;
  body: string;
  status: CampaignStatus;
  startsAt: string | null;
  endsAt: string | null;
  channels: CampaignChannel[];
  targetRoles: AppRole[];
  targetSegments: string[];
};

export type UpdateCampaignPayload = CreateCampaignPayload & {
  id: string;
};

export type CreateSurveyQuestionPayload = {
  campaignId: string;
  questionOrder: number;
  questionType: SurveyQuestionType;
  title: string;
};

export type CreateSurveyOptionPayload = {
  questionId: string;
  optionOrder: number;
  label: string;
  value?: string | null;
};

export type CampaignDatabase = {
  public: {
    Tables: {
      campaigns: {
        Row: {
          id: string;
          type: CampaignType;
          title: string;
          body: string | null;
          status: CampaignStatus;
          starts_at: string | null;
          ends_at: string | null;
          channels: string[] | null;
          show_in_bell: boolean | null;
          show_in_popup_right: boolean | null;
          target_segment: string | null;
          target_segments: string[] | null;
          created_at: string | null;
          updated_at: string | null;
          priority: number | null;
        };
        Insert: {
          id?: string;
          type: CampaignType;
          title: string;
          body?: string | null;
          status: CampaignStatus;
          starts_at?: string | null;
          ends_at?: string | null;
          channels?: string[] | null;
          show_in_bell?: boolean | null;
          show_in_popup_right?: boolean | null;
          target_segment?: string | null;
          target_segments?: string[] | null;
        };
        Update: Partial<CampaignDatabase["public"]["Tables"]["campaigns"]["Insert"]>;
      };
      campaign_target_roles: {
        Row: {
          campaign_id: string;
          role: string;
        };
        Insert: {
          campaign_id: string;
          role: string;
        };
        Update: {
          role?: string;
        };
      };
      user_campaign_states: {
        Row: {
          campaign_id: string;
          user_id: string;
          read_at: string | null;
          dismissed_at: string | null;
          completed_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          campaign_id: string;
          user_id: string;
          read_at?: string | null;
          dismissed_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          read_at?: string | null;
          dismissed_at?: string | null;
          completed_at?: string | null;
        };
      };
      user_roles: {
        Row: {
          user_id: string;
          role: string;
        };
        Insert: {
          user_id: string;
          role: string;
        };
        Update: {
          role?: string;
        };
      };
      memberships: {
        Row: {
          user_id: string;
          role: string | null;
          business_id: string | null;
        };
        Insert: {
          user_id: string;
          role?: string | null;
          business_id?: string | null;
        };
        Update: {
          role?: string | null;
          business_id?: string | null;
        };
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: string | null;
          status: string | null;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: string | null;
          status?: string | null;
        };
        Update: {
          role?: string | null;
          status?: string | null;
        };
      };
      businesses: {
        Row: {
          id: string;
          business_segment: string | null;
        };
        Insert: {
          id?: string;
          business_segment?: string | null;
        };
        Update: {
          business_segment?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
        };
        Update: {
          full_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
        };
      };
      event_log: {
        Row: {
          id: string;
          event_type: string;
          actor_user_id: string | null;
          target_user_id: string | null;
          target_business_id: string | null;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          event_type: string;
          actor_user_id?: string | null;
          target_user_id?: string | null;
          target_business_id?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string | null;
        };
        Update: Partial<CampaignDatabase["public"]["Tables"]["event_log"]["Insert"]>;
      };
      survey_questions: {
        Row: {
          id: string;
          campaign_id: string;
          question_order: number;
          question_type: SurveyQuestionType;
          title: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          question_order: number;
          question_type: SurveyQuestionType;
          title: string;
        };
        Update: Partial<CampaignDatabase["public"]["Tables"]["survey_questions"]["Insert"]>;
      };
      survey_options: {
        Row: {
          id: string;
          question_id: string;
          option_order: number;
          label: string;
          value: string | null;
        };
        Insert: {
          id?: string;
          question_id: string;
          option_order: number;
          label: string;
          value?: string | null;
        };
        Update: Partial<CampaignDatabase["public"]["Tables"]["survey_options"]["Insert"]>;
      };
      survey_responses: {
        Row: {
          id: string;
          campaign_id: string;
          question_id: string;
          option_id: string;
          user_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          question_id: string;
          option_id: string;
          user_id: string;
        };
        Update: Partial<CampaignDatabase["public"]["Tables"]["survey_responses"]["Insert"]>;
      };
    };
  };
};

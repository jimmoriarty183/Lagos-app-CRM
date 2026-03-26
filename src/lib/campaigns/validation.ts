import { z } from "zod";
import { BUSINESS_SEGMENTS } from "@/lib/business-segments";
import type { CampaignChannel, CampaignStatus, CampaignType, SurveyQuestionType } from "@/lib/campaigns/types";

const campaignTypeValues: CampaignType[] = ["announcement", "survey"];
const campaignStatusValues: CampaignStatus[] = ["draft", "active", "archived"];
const campaignChannelValues: CampaignChannel[] = ["bell", "popup_right"];
const surveyQuestionTypeValues: SurveyQuestionType[] = ["single_choice", "multiple_choice", "yes_no", "rating_1_5"];

export const campaignPayloadSchema = z.object({
  type: z.enum(campaignTypeValues),
  title: z.string().trim().min(1, "Title is required").max(180),
  body: z.string().trim().max(10_000).default(""),
  status: z.enum(campaignStatusValues),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  channels: z.array(z.enum(campaignChannelValues)).min(1, "At least one channel is required"),
  targetRoles: z.array(z.string().trim().min(1)).default([]),
  targetSegments: z.array(z.enum(BUSINESS_SEGMENTS)).default([]),
}).superRefine((value, ctx) => {
  if (value.startsAt && value.endsAt && value.endsAt < value.startsAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsAt"],
      message: "endsAt must be greater than startsAt",
    });
  }
});

export const surveyQuestionPayloadSchema = z.object({
  campaignId: z.string().trim().min(1),
  questionOrder: z.number().int().min(1),
  questionType: z.enum(surveyQuestionTypeValues),
  title: z.string().trim().min(1).max(500),
});

export const surveyOptionPayloadSchema = z.object({
  questionId: z.string().trim().min(1),
  optionOrder: z.number().int().min(1),
  label: z.string().trim().min(1).max(300),
  value: z.string().trim().max(300).nullable().optional(),
});

export const surveySubmitSchema = z.object({
  campaignId: z.string().trim().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().trim().min(1),
      optionIds: z.array(z.string().trim().min(1)).min(1),
    }),
  ).min(1),
});

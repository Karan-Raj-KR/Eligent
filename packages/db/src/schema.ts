import { z } from "zod";

export const ApplicantRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  email: z.string().email(),
  gpa: z.number().min(0).max(4.0).nullable(),
  sat: z.number().min(400).max(1600).nullable(),
  act: z.number().min(1).max(36).nullable(),
  income: z.number().min(0).nullable(),
  state: z.string().length(2),
  major: z.string().min(1),
  year: z.enum(["freshman", "sophomore", "junior", "senior", "grad"]),
  ethnicity: z.array(z.string()).nullable(),
  first_gen: z.boolean().default(false),
  military: z.boolean().default(false),
  disability: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ApplicantRow = z.infer<typeof ApplicantRowSchema>;

export const ScholarshipRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  provider: z.string(),
  amount: z.number().positive(),
  deadline: z.string().datetime(),
  url: z.string().url(),
  min_gpa: z.number().min(0).max(4.0).nullable(),
  min_sat: z.number().min(400).max(1600).nullable(),
  min_act: z.number().min(1).max(36).nullable(),
  max_income: z.number().min(0).nullable(),
  states: z.array(z.string().length(2)).nullable(),
  majors: z.array(z.string()).nullable(),
  years: z.array(z.enum(["freshman", "sophomore", "junior", "senior", "grad"])).nullable(),
  requires_first_gen: z.boolean().default(false),
  requires_military: z.boolean().default(false),
  requires_disability: z.boolean().default(false),
  requires_ethnicity: z.array(z.string()).nullable(),
  renewable: z.boolean().default(false),
  description: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ScholarshipRow = z.infer<typeof ScholarshipRowSchema>;

export const EvaluationRowSchema = z.object({
  id: z.string().uuid(),
  applicant_id: z.string().uuid(),
  scholarship_id: z.string().uuid(),
  status: z.enum(["eligible", "near-miss", "rejected"]),
  gap_field: z.string().nullable(),
  gap_required: z.unknown().nullable(),
  gap_actual: z.unknown().nullable(),
  gap_message: z.string().nullable(),
  created_at: z.string().datetime(),
});

export type EvaluationRow = z.infer<typeof EvaluationRowSchema>;

export const LLMCacheRowSchema = z.object({
  id: z.string().uuid(),
  prompt_hash: z.string(),
  prompt: z.string(),
  response: z.string(),
  model: z.string(),
  tokens: z.number().int().nullable(),
  created_at: z.string().datetime(),
});

export type LLMCacheRow = z.infer<typeof LLMCacheRowSchema>;
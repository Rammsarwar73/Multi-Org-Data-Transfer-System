import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────────────────────
export const requestOtpSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(254, "Email too long"),
});

export const verifyOtpSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(254, "Email too long"),
  code: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^\d{6}$/, "Code must contain only digits"),
});

// ─── Rows ─────────────────────────────────────────────────────────────────────
export const addRowSchema = z.object({
  colA: z.string().max(500).optional().default("unlisted"),
  colB: z.string().max(500).optional().default("unlisted"),
  colC: z.string().max(500).optional().default("unlisted"),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ─── Transfer ─────────────────────────────────────────────────────────────────
export const transferSchema = z.object({
  message: z
    .string()
    .max(500, "Message must be under 500 characters")
    .default(""),
});

// ─── Types ───────────────────────────────────────────────────────────────────
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type AddRowInput = z.infer<typeof addRowSchema>;
export type TransferInput = z.infer<typeof transferSchema>;

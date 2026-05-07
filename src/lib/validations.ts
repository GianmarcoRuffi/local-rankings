import { z } from "zod";

// ============================================================================
// Authentication Schemas
// ============================================================================

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username è obbligatorio"),
  password: z.string().min(1, "Password è obbligatoria"),
  captchaToken: z.string().min(1, "Captcha è obbligatorio"),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Password attuale è obbligatoria"),
  newPassword: z
    .string()
    .min(8, "La nuova password deve essere lunga almeno 8 caratteri"),
});

// ============================================================================
// Query Parameters Schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => Math.max(1, parseInt(val, 10))),
  limit: z
    .string()
    .optional()
    .default("100")
    .transform((val) => Math.min(1000, Math.max(1, parseInt(val, 10)))),
});

export const rankingIdSchema = z.object({
  rankingId: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : null)),
});

export const generalRankingQuerySchema = paginationSchema.merge(
  rankingIdSchema,
);

export const idParamSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10)),
});

// ============================================================================
// Ranking & Stage Schemas
// ============================================================================

export const createRankingSchema = z.object({
  name: z.string().trim().min(1, "Nome è obbligatorio").max(200),
  description: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});

export const updateRankingSchema = createRankingSchema.partial();

export const createStageSchema = z.object({
  rankingId: z.number().int().positive().optional(),
  name: z.string().trim().min(1, "Nome tappa è obbligatorio").max(200),
  date: z.string().optional(),
  status: z.enum(["pending", "active", "merged"]).optional().default("pending"),
});

export const updateStageSchema = createStageSchema.partial();

export const stagePlayerSchema = z.object({
  position: z.number().int().positive(),
  name: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .transform((val) =>
      val
        .replace(/[<>"'`]/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    ),
  score: z.number().nullable().optional(),
  t1: z.number().int().default(0),
  pointsAwarded: z.number().int().min(0).default(0),
});

export const createStageRankingSchema = z.object({
  stageId: z.number().int().positive(),
  players: z.array(stagePlayerSchema).min(1, "Almeno un giocatore richiesto"),
});

// ============================================================================
// Operations Schemas
// ============================================================================

export const mergeStageSchema = z.object({
  stageId: z.number().int().positive(),
  rankingId: z.number().int().positive().optional(),
});

export const revertMergeSchema = z.object({
  stageId: z.number().int().positive(),
  rankingId: z.number().int().positive().optional(),
});

export const bulkOperationSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
  operation: z.enum(["delete", "restore", "activate", "merge"]),
  rankingId: z.number().int().positive().optional(),
});

// ============================================================================
// PDF Upload Schema
// ============================================================================

export const uploadPdfSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.type === "application/pdf",
    "Il file deve essere un PDF",
  ),
  stageName: z.string().trim().min(1).max(200).optional(),
  stageDate: z.string().optional(),
  rankingId: z.number().int().positive().optional(),
});

// ============================================================================
// Helper Types
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type GeneralRankingQuery = z.infer<typeof generalRankingQuerySchema>;
export type CreateRankingInput = z.infer<typeof createRankingSchema>;
export type UpdateRankingInput = z.infer<typeof updateRankingSchema>;
export type CreateStageInput = z.infer<typeof createStageSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type StagePlayer = z.infer<typeof stagePlayerSchema>;
export type CreateStageRankingInput = z.infer<typeof createStageRankingSchema>;
export type MergeStageInput = z.infer<typeof mergeStageSchema>;
export type RevertMergeInput = z.infer<typeof revertMergeSchema>;
export type BulkOperationInput = z.infer<typeof bulkOperationSchema>;

// ============================================================================
// Validation Helper
// ============================================================================

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.errors[0];
  return {
    success: false,
    error: firstError?.message || "Validazione fallita",
  };
}

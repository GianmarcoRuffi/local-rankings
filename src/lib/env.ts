import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL").optional(),
  POSTGRES_URL: z.string().url("POSTGRES_URL must be a valid URL").optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1, "TURNSTILE_SECRET_KEY is required"),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_TURNSTILE_SITE_KEY is required"),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .optional(),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_BASE_URL: z.string().optional(),
  VERCEL_URL: z.string().optional(),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    throw new Error("Invalid environment variables");
  }

  const data = parsed.data;
  const dbUrl = data.DATABASE_URL || data.POSTGRES_URL;
  const jwtSecret = data.JWT_SECRET || data.NEXTAUTH_SECRET;

  if (!dbUrl) {
    console.error("❌ No database URL found. Set DATABASE_URL or POSTGRES_URL");
    throw new Error("DATABASE_URL or POSTGRES_URL must be set");
  }

  return { ...data, DATABASE_URL: dbUrl, JWT_SECRET: jwtSecret };
}

export const env = validateEnv();

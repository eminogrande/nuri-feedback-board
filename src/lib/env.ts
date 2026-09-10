import { z } from "zod";

const envSchema = z.object({
  GITHUB_APP_ID: z.string().min(1),
  GITHUB_PRIVATE_KEY: z.string().min(1),
  GITHUB_PROJECT_ID: z.string().min(1),
  GITHUB_REPO: z.string().min(1),
  NEXT_PUBLIC_GITHUB_REPO: z.string().min(1),
  NEXT_PUBLIC_GITHUB_PROJECT_URL: z.string().url(),
  NURI_PASSKEY_ORIGIN: z.string().url(),
  ARKADE_MNEMONIC: z.string().min(1),
  ARKADE_SERVER_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

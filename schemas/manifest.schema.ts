import { z } from 'zod';

export const APP_CATEGORIES = [
  'productivity',
  'writing',
  'coding',
  'files',
  'research',
  'data',
  'media',
  'integrations',
  'utilities',
  'fun',
] as const;

export const PERMISSIONS = [
  'ai',
  'storage.kv',
  'storage.files',
  'storage.db',
  'network',
  'clipboard',
  'notifications',
] as const;

export const AI_PROVIDERS = ['anthropic', 'openai', 'gemini'] as const;

const kebabCaseRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const ManifestSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(kebabCaseRegex, 'ID must be kebab-case (e.g., "my-cool-app")'),
  name: z.string().min(1).max(50),
  version: z.string().min(1),
  description: z.string().min(1).max(200),
  longDescription: z.string().max(2000).optional(),
  author: z.string().min(1).max(100),
  authorUrl: z.string().url().optional(),
  license: z.string().optional(),
  entry: z.string().min(1),
  thumbnail: z.string().optional(),
  screenshots: z.array(z.string()).optional(),
  category: z.enum(APP_CATEGORIES).optional(),
  keywords: z.array(z.string().max(30)).max(10).optional(),
  models: z
    .object({
      required: z.boolean(),
      providers: z.array(z.enum(AI_PROVIDERS)).min(1),
      default: z.enum(AI_PROVIDERS).optional(),
      minContextWindow: z.number().positive().optional(),
    })
    .optional(),
  permissions: z.array(z.enum(PERMISSIONS)).min(1),
  minShellVersion: z.string().optional(),
  maxBundleSize: z.string().optional(),
  changelog: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
});

export type Manifest = z.infer<typeof ManifestSchema>;

import { z } from 'zod';
import { APP_CATEGORIES, AI_PROVIDERS, PERMISSIONS } from './manifest.schema.js';

export const RegistryEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  longDescription: z.string().optional(),
  author: z.string(),
  category: z.enum(APP_CATEGORIES).optional(),
  keywords: z.array(z.string()).optional(),
  permissions: z.array(z.enum(PERMISSIONS)),
  providers: z.array(z.enum(AI_PROVIDERS)).optional(),
  thumbnail: z.string().optional(),
  bundle: z.string().url(),
  checksum: z.string(),
  installs: z.number().int().min(0),
  updatedAt: z.string().datetime(),
});

export const RegistrySchema = z.array(RegistryEntrySchema);

export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;

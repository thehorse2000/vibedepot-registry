import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ManifestSchema } from '../schemas/manifest.schema.js';
import type { RegistryEntry } from '../schemas/registry-entry.schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPS_DIR = path.resolve(__dirname, '..', 'apps');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'registry.json');
const GITHUB_BASE = 'https://raw.githubusercontent.com/thehorse2000/vibedepot-registry/main';

function computeChecksum(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function main() {
  if (!fs.existsSync(APPS_DIR)) {
    console.log('No apps/ directory found. Writing empty registry.');
    fs.writeFileSync(OUTPUT_PATH, '[]\\n');
    process.exit(0);
  }

  const appDirs = fs
    .readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const entries: RegistryEntry[] = [];

  for (const appName of appDirs) {
    const manifestPath = path.join(APPS_DIR, appName, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;

    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch {
      console.warn(`Skipping ${appName}: invalid JSON`);
      continue;
    }

    const result = ManifestSchema.safeParse(raw);
    if (!result.success) {
      console.warn(`Skipping ${appName}: invalid manifest`);
      continue;
    }

    const m = result.data;

    // Compute thumbnail URL
    const thumbnail = m.thumbnail
      ? `${GITHUB_BASE}/apps/${m.id}/${m.thumbnail}`
      : undefined;

    // Compute bundle URL (served from raw.githubusercontent via the releases/ dir in the repo)
    const bundle = `${GITHUB_BASE}/apps/${m.id}/releases/${m.version}.zip`;

    // Compute checksum from release zip if present
    const zipPath = path.join(APPS_DIR, appName, 'releases', `${m.version}.zip`);
    const checksum = fs.existsSync(zipPath) ? computeChecksum(zipPath) : '';

    entries.push({
      id: m.id,
      name: m.name,
      version: m.version,
      description: m.description,
      longDescription: m.longDescription,
      author: m.author,
      category: m.category,
      keywords: m.keywords,
      permissions: m.permissions,
      providers: m.models?.providers,
      thumbnail,
      bundle,
      checksum,
      installs: 0,
      updatedAt: new Date().toISOString(),
    });
  }

  // Sort by ID
  entries.sort((a, b) => a.id.localeCompare(b.id));

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2) + '\n');
  console.log(`✅ Built registry.json with ${entries.length} app(s).`);
}

main();

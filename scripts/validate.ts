import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { valid as semverValid } from 'semver';
import { ManifestSchema } from '../schemas/manifest.schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPS_DIR = path.resolve(__dirname, '..', 'apps');
const API_KEY_PATTERNS = [/sk-[a-zA-Z0-9]{20,}/, /AKIA[A-Z0-9]{16}/, /AIza[a-zA-Z0-9_-]{35}/];
const MAX_ZIP_SIZE = 5 * 1024 * 1024; // 5MB

interface ValidationError {
  app: string;
  message: string;
}

function main() {
  const errors: ValidationError[] = [];
  const seenIds = new Set<string>();

  if (!fs.existsSync(APPS_DIR)) {
    console.log('No apps/ directory found. Nothing to validate.');
    process.exit(0);
  }

  const appDirs = fs
    .readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (appDirs.length === 0) {
    console.log('No apps found. Nothing to validate.');
    process.exit(0);
  }

  for (const appName of appDirs) {
    const appDir = path.join(APPS_DIR, appName);
    const manifestPath = path.join(appDir, 'manifest.json');

    // Check manifest exists
    if (!fs.existsSync(manifestPath)) {
      errors.push({ app: appName, message: 'Missing manifest.json' });
      continue;
    }

    // Parse manifest JSON
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (e) {
      errors.push({ app: appName, message: `Invalid JSON in manifest.json: ${e}` });
      continue;
    }

    // Validate with Zod
    const result = ManifestSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          app: appName,
          message: `Manifest validation: ${issue.path.join('.')} — ${issue.message}`,
        });
      }
      continue;
    }

    const manifest = result.data;

    // ID uniqueness
    if (seenIds.has(manifest.id)) {
      errors.push({ app: appName, message: `Duplicate app ID: "${manifest.id}"` });
    }
    seenIds.add(manifest.id);

    // ID should match directory name
    if (manifest.id !== appName) {
      errors.push({
        app: appName,
        message: `App ID "${manifest.id}" does not match directory name "${appName}"`,
      });
    }

    // Semver validation
    if (!semverValid(manifest.version)) {
      errors.push({
        app: appName,
        message: `Invalid semver version: "${manifest.version}"`,
      });
    }

    // README check
    if (!fs.existsSync(path.join(appDir, 'README.md'))) {
      errors.push({ app: appName, message: 'Missing README.md' });
    }

    // Entry file check
    if (!fs.existsSync(path.join(appDir, manifest.entry))) {
      errors.push({ app: appName, message: `Entry file not found: "${manifest.entry}"` });
    }

    // Scan source files for API key patterns
    const sourceFiles = fs.readdirSync(appDir).filter((f) => /\.(js|ts|html)$/.test(f));
    for (const file of sourceFiles) {
      const content = fs.readFileSync(path.join(appDir, file), 'utf-8');
      for (const pattern of API_KEY_PATTERNS) {
        if (pattern.test(content)) {
          errors.push({
            app: appName,
            message: `Potential API key found in ${file} (pattern: ${pattern.source})`,
          });
        }
      }
    }

    // Check zip sizes in releases/
    const releasesDir = path.join(appDir, 'releases');
    if (fs.existsSync(releasesDir)) {
      const zips = fs.readdirSync(releasesDir).filter((f) => f.endsWith('.zip'));
      for (const zip of zips) {
        const stat = fs.statSync(path.join(releasesDir, zip));
        if (stat.size > MAX_ZIP_SIZE) {
          errors.push({
            app: appName,
            message: `Release ${zip} exceeds 5MB limit (${(stat.size / 1024 / 1024).toFixed(2)}MB)`,
          });
        }
      }
    }
  }

  // Report results
  if (errors.length > 0) {
    console.error(`\n❌ Validation failed with ${errors.length} error(s):\n`);
    for (const err of errors) {
      console.error(`  [${err.app}] ${err.message}`);
    }
    console.error('');
    process.exit(1);
  }

  console.log(`✅ All ${appDirs.length} app(s) passed validation.`);
  process.exit(0);
}

main();

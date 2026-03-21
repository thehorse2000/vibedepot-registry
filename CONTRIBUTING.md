# Contributing to VibeDepot Registry

## Submitting an App

1. **Fork** this repository
2. **Create a directory** under `apps/` with your app's kebab-case ID (e.g., `apps/my-cool-app/`)
3. **Add required files:**
   - `manifest.json` — App metadata ([see schema](#manifest-fields))
   - `README.md` — Store listing description
   - Entry file (e.g., `index.html`) referenced in your manifest
4. **Add a release bundle** (optional for first submission):
   - Create a `releases/` directory
   - Zip your source files into `{version}.zip` (e.g., `0.1.0.zip`)
   - Keep bundles under 5MB
5. **Open a pull request** targeting `main`

CI will automatically validate your submission. Fix any reported issues before requesting review.

## Manifest Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique kebab-case identifier |
| `name` | Yes | Display name (max 50 chars) |
| `version` | Yes | Semver version (e.g., `1.0.0`) |
| `description` | Yes | Short description (max 200 chars) |
| `author` | Yes | Author name |
| `entry` | Yes | Entry point file (e.g., `index.html`) |
| `permissions` | Yes | Array of required permissions |
| `category` | No | One of: productivity, writing, coding, files, research, data, media, integrations, utilities, fun |
| `keywords` | No | Up to 10 search keywords |
| `models` | No | AI provider configuration |
| `thumbnail` | No | Thumbnail image filename |
| `longDescription` | No | Extended description (max 2000 chars) |

## Updating an App

1. Bump the `version` in `manifest.json` (must be valid semver)
2. Add a new zip in `releases/` with the new version number
3. Open a pull request

## Available Permissions

- `ai` — Access to AI model APIs
- `storage.kv` — Key-value storage
- `storage.files` — File system storage
- `storage.db` — Database storage
- `network` — Network/HTTP access
- `clipboard` — Clipboard read/write
- `notifications` — System notifications

# Registry Rules

All apps submitted to the VibeDepot registry must follow these rules.

## Code & Security

- **No malicious code** — Apps must not contain malware, spyware, or any code designed to harm users
- **No hardcoded API keys** — Never include API keys, tokens, or secrets in source files. CI scans for common patterns (`sk-`, `AKIA`, `AIza`)
- **Declare all permissions** — Your manifest must list every permission your app uses. Apps requesting undeclared permissions will be rejected

## Packaging

- **Bundle size limit: 5MB** — Release zips must be under 5MB. If you need more, optimize your assets or request an exception
- **Semver versioning** — All versions must be valid semver (e.g., `1.0.0`, `0.2.1-beta.1`)
- **Kebab-case IDs** — App IDs must be lowercase kebab-case (e.g., `my-cool-app`)
- **ID matches directory** — Your `manifest.json` `id` field must match the directory name under `apps/`

## Content

- **README required** — Every app must include a `README.md` describing what it does
- **Entry file required** — The file referenced by `manifest.entry` must exist
- **Accurate metadata** — App name, description, and category should accurately represent functionality

## Updates

- **Bump version on changes** — Every update must include a version bump
- **Don't break backwards compatibility** — Major version bumps should be reserved for breaking changes

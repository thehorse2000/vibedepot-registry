# VibeDepot Registry

The public app registry for [VibeDepot](https://github.com/vibedepot/vibedepot) — a catalog of apps available in the Store.

## Structure

```
apps/
  my-app/
    manifest.json    # App metadata (required)
    README.md        # Store listing description (required)
    index.html       # Entry point
    *.js, *.css      # Source files
    releases/        # Bundled zips
      0.1.0.zip
```

## How it works

1. Contributors submit apps via pull request
2. CI validates manifests, checks for API keys, and enforces bundle size limits
3. On merge to `main`, the registry index (`registry.json`) is auto-rebuilt
4. The VibeDepot shell fetches `registry.json` to populate the Store UI

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to submit an app.

See [RULES.md](RULES.md) for submission requirements and policies.

## Registry Index

The `registry.json` file is auto-generated — do not edit it manually.

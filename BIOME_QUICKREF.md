# Biome Quick Reference

## Common Commands

```bash
# Format and fix all issues (recommended for development)
pnpm format
# or
pnpm biome:check:write

# Check for issues without modifying (CI/pre-commit)
pnpm lint
# or
pnpm biome:check

# CI mode (strict, no writes, exits on error)
pnpm biome:ci

# Format only (no linting)
pnpm biome:format

# Check if files are formatted
pnpm biome:format:check
```

## VS Code

- Install the `biomejs.biome` extension (recommended)
- Files auto-format on save
- Imports auto-organize on save
- Quick fixes applied automatically

## File Locations

- **Configuration:** `biome.json`
- **VS Code settings:** `.vscode/settings.json`
- **Documentation:** `BIOME_SETUP.md`, `BIOME_SUMMARY.md`

## Key Settings

- **Line width:** 100 characters
- **Quotes:** Single
- **Semicolons:** Always
- **Trailing commas:** ES5 (compatible with ES2018)
- **Indentation:** 2 spaces
- **Line endings:** LF (npm package standard)

## Current Status

- **Version:** `@biomejs/biome@2.3.14`
- **Files:** 48 checked
- **Errors:** 2 (acceptable - legacy code)
- **Warnings:** 14 (acceptable - intentional `any` types)
- **Tests:** 221 passed

## Help

For detailed documentation, see `BIOME_SETUP.md`.

For Biome official docs: https://biomejs.dev/

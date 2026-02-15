---
name: post-prompt-checks
description: Enforces code formatting, lint checks, and README documentation updates after every completed prompt. Use after finishing any code changes or task completion to ensure code quality and up-to-date documentation.
---

# Post-Prompt Checks

After completing each user prompt that involves code changes, run these steps before returning to the user:

## 1. Format Code

Run Prettier to format all changed files:

```bash
npx prettier --write .
```

## 2. Lint Check

Run the linter to catch any issues:

```bash
npx eslint . --ext .ts,.tsx --fix 2>/dev/null || true
```

If ESLint is not configured, skip this step silently.

## 3. Update README

Open `README.md` and append a changelog entry under the `## Changelog` section (create it if missing) with:

- **Date** (current date)
- **Summary** of what was changed

Keep entries concise — one or two lines per change.

## Checklist

- [ ] Code formatted with Prettier
- [ ] Lint check passed (or skipped if no linter configured)
- [ ] README.md changelog updated with a summary of changes

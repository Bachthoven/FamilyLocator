# FamilyLocator - Project Configuration

## User Preferences

- **Communication Style**: Simple, everyday language
- **Project Focus**: Cross-platform web-based family location sharing with real-time capabilities
- **Location Accuracy**: All location pins must use exact coordinates from Google Maps, never use geocoding or approximations
- **Code Formatting**: Always format code with Prettier after making changes
- **Documentation**: Document all changes in README.md
- **Git Workflow**: Automatically commit and push all changes to GitHub after completing tasks
- **Git Remote**: Use `git push origin dev` for pushing changes

## Development Workflow

1. Make code changes
2. Format all files with Prettier: `npx prettier --write .`
3. Document changes in README.md changelog
4. Run tests to verify: `npx vitest run`
5. Commit changes with descriptive message
6. Push to dev branch: `git push origin dev`

## Automated Commit/Push Process

After completing changes, always run:

```bash
npx prettier --write .
git add -A
git commit -m "descriptive message"
git push origin dev
```

**Important**: Do NOT tell the user git commands at the end of responses - complete the work silently.

---

**Note**: Full project documentation is maintained in `README.md`

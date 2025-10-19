# Testing & CI/CD Documentation

## Overview

This project includes comprehensive unit tests and a CI/CD pipeline using GitHub Actions. Tests run automatically on pull requests from `dev` to `main` branch.

## Running Tests Locally

### Prerequisites

All testing dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### Test Commands

Add these scripts to your `package.json` under the `scripts` section:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,css,md}\"",
  "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,css,md}\""
}
```

Then run:

```bash
# Run all tests once
npm test

# Run tests in watch mode (reruns on file changes)
npm run test:watch

# Open interactive UI for tests
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Format all code
npm run format

# Check if code is formatted correctly
npm run format:check
```

## Test Structure

### Backend Tests (`server/__tests__/`)

- **storage.test.ts**: Tests for database storage operations (user, location, place CRUD)
- **routes.test.ts**: API endpoint validation and request/response structure tests
- **geofencing.test.ts**: Geofence distance calculations and state management

### Frontend Tests (`client/src/__tests__/`)

- **utils.test.ts**: Utility function tests (color generation, validation, formatting)
- **hooks/useAuth.test.ts**: Authentication hook validation logic
- **components/BottomNavigation.test.tsx**: Navigation component rendering
- **components/FamilyMemberCard.test.tsx**: Family member card component

### Test Setup (`test/setup.ts`)

Global test configuration including:
- Testing Library cleanup
- Mock implementations for ResizeObserver
- Mock implementations for window.matchMedia
- Jest-DOM matchers

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/ci.yml`)

The pipeline runs on every pull request to `main` branch and includes:

#### 1. **Test Job**
- Runs on Node.js 20.x
- Installs dependencies
- Runs Prettier formatting check
- Runs TypeScript type checking
- Executes all unit tests
- Uploads coverage reports to Codecov

#### 2. **Lint Job**
- Checks code formatting with Prettier
- Verifies no uncommitted changes after formatting

#### 3. **Build Job**
- Builds the application for production
- Verifies build artifacts are created

#### 4. **Security Job**
- Runs npm security audit
- Checks for known vulnerabilities

### Workflow Triggers

The CI pipeline runs when:
- A pull request is created targeting `main` branch
- A pull request is updated with new commits
- Ignores changes to: `*.md`, `.gitignore`, `LICENSE`

## Test Coverage

Tests cover:

✅ **Backend:**
- User registration and authentication validation
- Location data structure and coordinate validation
- Place creation and category validation
- Geofence distance calculations
- Geofence state tracking (entry/exit)
- API request/response structures
- Notification data validation

✅ **Frontend:**
- Component rendering (BottomNavigation, FamilyMemberCard)
- User color generation utilities
- Location coordinate validation
- Time formatting functions
- Authentication validation logic (email, password, phone)

✅ **Code Quality:**
- Prettier formatting checks
- TypeScript type checking
- Build verification

## Best Practices

### Writing New Tests

1. **Follow the existing structure**: Place tests in `__tests__` directories
2. **Use descriptive test names**: Clearly describe what is being tested
3. **Test one thing at a time**: Keep tests focused and isolated
4. **Mock external dependencies**: Use `vi.mock()` for imports
5. **Clean up after tests**: Use `afterEach` for cleanup

### Example Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    // Test implementation
  });
});
```

## Troubleshooting

### Tests Failing Locally

1. **Clear cache and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check TypeScript types**:
   ```bash
   npm run check
   ```

3. **Run tests in verbose mode**:
   ```bash
   npx vitest run --reporter=verbose
   ```

### CI/CD Pipeline Failures

1. **Formatting Issues**: Run `npm run format` and commit changes
2. **Type Errors**: Run `npm run check` to see TypeScript errors
3. **Test Failures**: Run `npm test` locally to reproduce

## Code Formatting

This project uses **Prettier** for consistent code formatting.

### Configuration (`.prettierrc`)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Auto-format on Save

Configure your editor to format on save:

- **VS Code**: Install Prettier extension and enable "Format On Save"
- **Replit**: Prettier is pre-configured

## Continuous Integration Flow

```
Pull Request (dev → main)
    ↓
GitHub Actions Triggered
    ↓
┌─────────────────────────────────────┐
│  Parallel Jobs                      │
├─────────────────────────────────────┤
│  1. Test    → Format → Types → Test │
│  2. Lint    → Format Check          │
│  3. Security → Audit                │
└─────────────────────────────────────┘
    ↓
All Jobs Pass
    ↓
Build Job → Create Production Build
    ↓
✅ Ready to Merge
```

## Adding New Tests

When adding new features, remember to:

1. Write unit tests for new functions/components
2. Update existing tests if behavior changes
3. Ensure tests pass locally before pushing
4. Verify CI pipeline passes on your PR

## Coverage Goals

- **Statements**: > 70%
- **Branches**: > 60%
- **Functions**: > 70%
- **Lines**: > 70%

Run `npm run test:coverage` to see current coverage.

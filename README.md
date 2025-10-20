# FamilyLocator - Real-time Family Location Sharing App

A cross-platform application designed for families to securely share real-time locations with interactive maps, privacy management, and geofencing capabilities.

## 🚀 Features

- **Real-time Location Sharing**: Share your location with family members in real-time using WebSockets
- **Interactive Maps**: Beautiful map interface on both web (Leaflet) and mobile (Google Maps)
- **Geofencing**: Get notified when family members enter or exit saved places (20m radius)
- **Privacy Controls**: Granular control over who sees your location and when
- **Family Management**: Invite-based system with 6-character codes
- **Saved Places**: Create and categorize important locations (home, work, school, etc.)
- **Cross-Platform**: Works on web browsers and mobile devices (iOS & Android via Expo)
- **Dark Mode**: Full dark mode support across the application

## 📱 Platforms

- **Web Application**: Modern React web app with responsive design
- **Mobile Application**: Native mobile experience using React Native & Expo
  - Works in Expo Go for development
  - Optimized for both iOS and Android

## 🛠️ Technology Stack

### Frontend

- **Web**: React 19.1, TypeScript, Vite, Tailwind CSS, shadcn/ui components
- **Mobile**: React Native 0.81.4, Expo SDK 54, react-native-maps
- **State Management**: TanStack Query (React Query) v5
- **Routing**: Wouter (web), Custom tab navigation (mobile)
- **Maps**: Leaflet with React-Leaflet (web), react-native-maps v1.20.1 (mobile)
- **Location**: Geolocation API (web), expo-location (mobile)

### Backend

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
- **Real-time**: WebSockets for live location updates
- **Session Management**: Express sessions with PostgreSQL store

### Testing & CI/CD

- **Test Framework**: Vitest with React Testing Library
- **Test Count**: 42 tests across 7 test files
- **CI/CD**: GitHub Actions workflow for automated testing
- **Code Quality**: Prettier for code formatting, TypeScript for type checking
- **Coverage**: Codecov integration for coverage tracking

## 📋 Prerequisites

- Node.js >= 20.19.4 (currently on 20.19.3, minor difference acceptable)
- PostgreSQL database (provided by Replit)
- Expo Go app for mobile development (iOS/Android)

## 🚦 Getting Started

### Running the Application

```bash
# Install dependencies
npm install

# Start the development server (web + backend)
npm run dev
```

The application will be available at the Replit development URL.

### Running the Mobile App

```bash
# Start Expo in tunnel mode (recommended for Replit)
npx expo start --tunnel
```

Scan the QR code with:

- **iOS**: Camera app
- **Android**: Expo Go app

### Running Tests

```bash
# Run all tests
npx vitest run

# Run tests in watch mode
npx vitest

# Run tests with UI
npx vitest --ui

# Generate coverage report
npx vitest run --coverage
```

### Code Formatting

```bash
# Format all files
npx prettier --write .

# Check formatting
npx prettier --check .
```

## 🏗️ Architecture

### System Overview

```
┌─────────────┐      ┌─────────────┐
│   Web App   │      │  Mobile App │
│  (React)    │      │ (React Native)│
└──────┬──────┘      └──────┬──────┘
       │                     │
       │   HTTP/WebSocket    │
       └──────────┬──────────┘
                  │
          ┌───────▼────────┐
          │  Express API   │
          │   (Node.js)    │
          └───────┬────────┘
                  │
          ┌───────▼────────┐
          │   PostgreSQL   │
          │   (Drizzle)    │
          └────────────────┘
```

### Key Features Implementation

#### Authentication

- Replit Auth (OpenID Connect) for secure login
- PostgreSQL-backed sessions with HTTP-only cookies
- Passport.js middleware for authentication

#### Location Services

- High-accuracy geolocation on both platforms
- Real-time updates via WebSockets
- Granular privacy controls (enable/disable sharing)
- Optional location history tracking

#### Family Management

- Invite-based system with 6-character codes
- Code expiration (24 hours)
- Status tracking (pending, accepted, blocked)
- Bi-directional relationships

#### Places System

- Custom saved locations with categories
- Color-coded place markers
- Geofencing with 20m radius
- Real-time entry/exit notifications

#### Geofencing

- Precise location detection using Haversine formula
- 20m radius for accurate notifications
- State tracking to prevent duplicate notifications
- Broadcasts to all family members via WebSocket

### Data Flow

1. **Location Updates**:
   - Client sends location → Server stores in database → Broadcasts via WebSocket to family members

2. **Family Connections**:
   - User creates invite code → Family member uses code → Both users become connected → Location sharing based on privacy settings

3. **Geofencing**:
   - Location update received → Check against all family places → Detect transitions (enter/exit) → Create notifications → Broadcast to family

## 📦 Project Structure

```
.
├── client/                 # Web application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and helpers
│   │   └── __tests__/     # Frontend tests
│   └── index.html
├── server/                # Backend API
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database interface
│   ├── geofencing.ts      # Geofencing logic
│   ├── websocket.ts       # WebSocket handlers
│   └── __tests__/         # Backend tests
├── mobile/                # React Native mobile app
│   ├── screens/           # Mobile screens
│   ├── components/        # Mobile components
│   └── App.tsx            # Mobile entry point
├── shared/                # Shared code
│   └── schema.ts          # Database schema (Drizzle)
├── test/                  # Test configuration
└── .github/workflows/     # CI/CD pipelines
```

## 🧪 Testing

### Test Coverage

**Backend Tests** (`server/__tests__/`):

- `storage.test.ts` - Storage data structure validation
- `routes.test.ts` - API request/response structure tests
- `geofencing.test.ts` - Distance calculation and state management

**Frontend Tests** (`client/src/__tests__/`):

- `utils.test.ts` - Utility function tests
- `hooks/useAuth.test.ts` - Authentication validation logic
- `components/BottomNavigation.test.tsx` - Navigation rendering
- `components/FamilyMemberCard.test.tsx` - Component rendering

### GitHub Actions CI/CD Pipeline

**Workflow File**: `.github/workflows/ci.yml`

**Triggers**: Pull requests from `dev` → `main` branch

**Jobs**:

1. **Test Job**: Prettier formatting, TypeScript check, unit tests, coverage upload to Codecov
2. **Lint Job**: Code formatting verification
3. **Build Job**: Production build verification
4. **Security Job**: npm security audit

### Test Improvement Roadmap

**Current State**: Foundation tests validate data structures and basic logic

**Next Steps for Comprehensive Coverage**:

1. Integration tests using supertest for actual API endpoints
2. Component tests with real dependencies and providers (React Query, routing)
3. Storage tests with in-memory database adapters
4. WebSocket connection testing
5. Coverage thresholds enforcement (>70% target)

See `TEST_README.md` for detailed testing documentation.

## 📱 Mobile App Details

### Implementation Status

**Completed Features**:

- ✅ Custom tab navigation with 5 tabs (Map, Family, Places, History, Settings)
- ✅ Interactive map with react-native-maps and Google Maps tiles
- ✅ Location permission handling with expo-location
- ✅ Map controls (zoom in/out, center on user, map type toggle street/satellite)
- ✅ Custom markers for user (blue), family (green), and places (colored squares)
- ✅ Geolocation with high accuracy
- ✅ Permission request workflow
- ✅ Members indicator with BlurView (intensity={100}) matching web app

**Pending Features**:

- ⏳ API integration for family locations and saved places
- ⏳ Real-time WebSocket connectivity for location updates
- ⏳ Authentication flow
- ⏳ Full feature parity with web app (notifications, manual location, etc.)

### Critical Compatibility Notes

- **react-native-maps**: Must use v1.20.1 or below (v1.21+ breaks Expo Go compatibility)
- **Navigation**: Custom tab navigation used to avoid React Navigation Android compatibility issues
- **Blur Effects**: BlurView with intensity={100} for strong frosted glass effect matching web app

## 🔧 Configuration

### Environment Variables

The application uses the following environment variables (automatically provided by Replit):

- `DATABASE_URL` - PostgreSQL connection string
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` - Database credentials
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID` - Object storage bucket ID (if enabled)
- `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` - Object storage paths

### Prettier Configuration

Code formatting is managed by Prettier with the configuration in `.prettierrc`:

- 2 spaces for indentation
- Single quotes
- Trailing commas where valid
- Automatic semicolons

## 📝 Development Workflow

### Making Changes

1. Make your code changes
2. Format code: `npx prettier --write .`
3. Run tests: `npx vitest run`
4. Test locally on web and mobile
5. Create PR from `dev` → `main` (CI will run automatically)

### Code Style Guidelines

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Add tests for new features
- Use Prettier for consistent formatting
- Document complex logic with comments
- Add `data-testid` attributes to interactive elements

## 🚀 Deployment

The application is deployed on Replit and uses Replit's built-in deployment features:

- Automatic deployment from the main branch
- PostgreSQL database provided by Replit
- Environment variables managed through Replit
- WebSocket support enabled

## 📚 External Dependencies

### Core Dependencies

- **@neondatabase/serverless**: PostgreSQL connectivity
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **leaflet**: Interactive map functionality (web)
- **react-native-maps**: Native maps (mobile)
- **wouter**: Lightweight routing (web)
- **@radix-ui/\***: Accessible UI components
- **tailwindcss**: Utility-first CSS framework

### Development Tools

- **TypeScript 5.9**: Static type checking
- **Vite**: Build tool and development server
- **Vitest**: Unit testing framework
- **Prettier**: Code formatter
- **drizzle-kit**: Database schema management
- **tsx**: TypeScript execution for server

## 🔄 Recent Updates

### React 19 & Expo SDK 54 Upgrade (October 19, 2025)

- **React Version**: Upgraded from 18.2 to 19.1 to support Expo SDK 54
- **Expo SDK**: Upgraded from SDK 50 to SDK 54 (required by latest Expo Go)
- **React Native**: Upgraded from 0.73 to 0.81.4
- **Peer Dependencies**: Using `.npmrc` with `legacy-peer-deps=true` as temporary workaround
- **Testing**: Web app and Expo tunnel mode confirmed working with React 19
- **Metro Config**: Using CommonJS (.cjs) for metro.config and babel.config

### CI/CD & Testing Setup (October 20, 2025)

- Created comprehensive GitHub Actions workflow for automated testing
- Set up Vitest with React Testing Library (42 tests across 7 files)
- Integrated Prettier for code formatting
- Added Codecov for test coverage tracking
- Configured 4-job CI pipeline: test, lint, build, security

## 📄 License

This is a private project for family use.

## 🤝 Contributing

This is a personal/family project. If you have suggestions or find bugs, please open an issue.

---

## 📋 Changelog

### 2025-10-20

- **Documentation Migration**: Moved all documentation from `replit.md` to `README.md`
- **Workflow Update**: All future changes will be formatted with Prettier and documented in README.md

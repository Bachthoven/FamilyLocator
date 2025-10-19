# FamilyLocator - Real-time Family Location Sharing App

## Overview

FamilyLocator is a cross-platform application designed for families to securely share real-time locations. It provides an interactive map interface, privacy management, and tools for organizing important places. The project aims to deliver a robust, user-friendly solution for family safety and coordination across web and mobile platforms.

## User Preferences

Preferred communication style: Simple, everyday language.
Project focus: Cross-platform web-based family location sharing with real-time capabilities.
Location accuracy: All location pins must use exact coordinates from Google Maps, never use geocoding or approximations.

## System Architecture

### Frontend Architecture

- **Web Application**: React 19.1 with TypeScript, Vite, Tailwind CSS (shadcn/ui), TanStack Query, Wouter, and Leaflet (React-Leaflet) for maps.
- **Mobile Application**: React Native 0.81.4 with Expo SDK 54 and TypeScript, optimized for iOS and Android.
  - **Navigation**: Custom tab navigation (pure React Native, no third-party library) with 5 tabs: Map, Family, Places, History, Settings
  - **Maps**: react-native-maps with Google Maps provider for interactive mapping
  - **Location**: expo-location for geolocation with proper permission handling
  - **UI Components**: Ionicons for icons, SafeAreaProvider for device-safe areas

### Backend Architecture

- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Replit Auth (OpenID Connect).
- **Real-time Communication**: WebSockets for live location updates and geofencing notifications.
- **Session Management**: Express sessions with PostgreSQL store.

### Key Features

- **Authentication**: Replit Auth, PostgreSQL-backed sessions, HTTP-only cookies.
- **Location Services**: High-accuracy geolocation, real-time updates via WebSockets, granular privacy controls, optional location history.
- **Family Management**: Invite-based system, status tracking, connection management.
- **Places System**: Custom saved locations with categories, geofencing for location-based alerts.
- **Mobile-First Design**: Responsive design, bottom navigation, touch-friendly UI.
- **Geofencing**: Precise location detection (10m radius) with real-time notifications for entering/exiting saved places.
- **Invitation System**: 6-character invitation codes with expiration for family joining.

### Data Flow

- **Location Updates**: Client sends location, server stores, broadcasts via WebSocket.
- **Family Connections**: Invite, accept/reject, bi-directional relationship, location sharing based on privacy.
- **Privacy Settings**: User configures settings, server respects them for sharing.

## External Dependencies

### Core Dependencies

- **@neondatabase/serverless**: PostgreSQL connectivity.
- **drizzle-orm**: Type-safe database operations.
- **@tanstack/react-query**: Server state management.
- **leaflet**: Interactive map functionality.
- **wouter**: Lightweight routing.
- **@radix-ui/**: Accessible UI components.
- **tailwindcss**: Utility-first CSS framework.

### Development Tools

- **TypeScript 5.9**: Static type checking.
- **Vite**: Build tool and development server.
- **drizzle-kit**: Database schema management.
- **tsx**: TypeScript execution for server.

### React 19 & Expo SDK 54 Upgrade Notes

- **Upgrade Date**: October 19, 2025
- **React Version**: Upgraded from 18.2 to 19.1 to support Expo SDK 54
- **Expo SDK**: Upgraded from SDK 50 to SDK 54 (required by latest Expo Go)
- **React Native**: Upgraded from 0.73 to 0.81.4
- **Peer Dependencies**: Using `.npmrc` with `legacy-peer-deps=true` as temporary workaround for packages not yet declaring React 19 support (Radix UI, react-day-picker)
- **Node Version**: Requires Node >= 20.19.4 (currently on 20.19.3, minor difference acceptable)
- **Testing**: Web app and Expo tunnel mode confirmed working with React 19
- **Metro Config**: Using CommonJS (.cjs) for metro.config and babel.config due to ES modules in package.json
- **Navigation**: Custom tab navigation after React Navigation v6/v7 caused Android casting errors

### Mobile App Implementation Status

- **Completed Features**:
  - ✅ Custom tab navigation with 5 tabs (Map, Family, Places, History, Settings)
  - ✅ Interactive map with react-native-maps and Google Maps tiles
  - ✅ Location permission handling with expo-location
  - ✅ Map controls (zoom in/out, center on user, map type toggle street/satellite)
  - ✅ Custom markers for user (blue), family (green), and places (colored squares)
  - ✅ Geolocation with high accuracy
  - ✅ Permission request workflow
  - ✅ Members indicator with BlurView (intensity={100}) matching web app
- **Pending Features**:
  - ⏳ API integration for family locations and saved places
  - ⏳ Real-time WebSocket connectivity for location updates
  - ⏳ Authentication flow
  - ⏳ Full feature parity with web app (notifications, manual location, etc.)

## Testing & CI/CD

### Testing Infrastructure

- **Test Framework**: Vitest with React Testing Library
- **Test Count**: 42 tests across 7 test files
- **Coverage**: Basic validation tests for data structures, utilities, and components
- **Configuration**: vitest.config.ts, test/setup.ts

### Test Files

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
1. **Test Job**: Prettier formatting, TypeScript check, unit tests, coverage upload
2. **Lint Job**: Code formatting verification
3. **Build Job**: Production build verification
4. **Security Job**: npm security audit

### Running Tests Locally

**Required Package.json Scripts** (add manually):
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,css,md}\"",
  "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,css,md}\""
}
```

### Code Formatting

- **Prettier Configuration**: `.prettierrc`
- **Auto-format**: Run `npx prettier --write .`
- **Check formatting**: Run `npx prettier --check .`

### Test Improvement Roadmap

**Current State**: Foundation tests validate data structures and basic logic

**Next Steps for Comprehensive Coverage**:
1. Integration tests using supertest for actual API endpoints
2. Component tests with real dependencies and providers
3. Storage tests with in-memory database adapters
4. WebSocket connection testing
5. Coverage thresholds enforcement (>70% target)

See `TEST_README.md` for detailed testing documentation.

### Authentication

- **openid-client**: OpenID Connect implementation.
- **passport**: Authentication middleware.
- **express-session**: Session management.
- **connect-pg-simple**: PostgreSQL session store.

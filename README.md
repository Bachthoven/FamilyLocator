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

**Workflow Files** (located in `.github/workflows/`):

| Workflow           | File                     | Triggers                                 | Purpose                                             |
| ------------------ | ------------------------ | ---------------------------------------- | --------------------------------------------------- |
| CI Pipeline        | `ci.yml`                 | Push/PR to main, dev                     | Lint, typecheck, unit tests, build, security audit  |
| Integration Tests  | `integration.yml`        | PR to main, dev (server changes)         | Database tests, API integration, privacy validation |
| CodeQL Analysis    | `codeql.yml`             | Push/PR + nightly (public repos only)    | Static security analysis, custom secret scanning    |
| Dependency Review  | `dependency-review.yml`  | PRs                                      | Block vulnerable deps, license compliance           |
| Scheduled Security | `scheduled-security.yml` | Daily at 2 AM UTC                        | Nightly audits, outdated packages, privacy checks   |
| Backend Release    | `release-backend.yml`    | Tags `v*`                                | Build, scan, deploy staging → production            |
| Mobile Release     | `release-mobile.yml`     | Tags `mobile-v*`, `ios-v*`, `android-v*` | iOS/Android builds via Expo EAS                     |

**CI Pipeline Jobs** (`ci.yml`):

1. **Lint & Type Check**: Prettier formatting, TypeScript compilation
2. **Unit Tests**: Vitest tests with coverage upload to Codecov
3. **Build Verification**: Production build, artifact verification
4. **Security Audit**: npm audit for high/critical vulnerabilities

**Security Features for Location Apps**:

- Location data access pattern validation
- JWT security verification
- Hardcoded secrets scanning
- Sensitive data logging detection
- Family member authorization testing
- SDK security checks for map/notification libraries

**GitHub Repository Setup**:

To use all workflows, configure these in your GitHub repository:

1. **Secrets** (Settings → Secrets and variables → Actions):
   - `CODECOV_TOKEN` - For coverage reports (optional)
   - `EXPO_TOKEN` - For mobile builds via EAS (required for mobile releases)

2. **Environments** (Settings → Environments):
   - Create `staging` and `production` environments
   - Add required reviewers for production deployments

3. **Code Scanning** (for CodeQL):
   - Only runs on public repositories
   - For private repos, CodeQL requires GitHub Advanced Security

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

### Native Notify Push Notifications Integration (November 27, 2025)

- **Native Notify Setup**: Integrated Native Notify for push notifications
  - Installed `native-notify` package for Expo-compatible push notifications
  - Created `app.config.js` for environment variable configuration
  - Updated `App.tsx` to register push tokens on app launch
  - Environment variables are passed through Expo's extra config

- **Notification Service**: Created `mobile/services/notifications.ts`
  - `sendMassNotification()` - Broadcast to all registered users
  - `sendIndieNotification()` - Send to specific user by subID
  - `registerIndieUser()` / `unregisterIndieUser()` - Manage user registrations
  - `createProximityNotificationPayload()` - Helper for proximity alerts

- **Setup Instructions**:
  1. Create account at https://app.nativenotify.com
  2. Get your App ID (number) and App Token (string)
  3. Add to Replit Secrets (these are passed through app.config.js):
     - `NATIVE_NOTIFY_APP_ID` - Your Native Notify App ID (number)
     - `NATIVE_NOTIFY_APP_TOKEN` - Your Native Notify App Token (string)
  4. Run `eas login` and `eas init` to create an EAS project (required for push notifications)
  5. Test on physical device (push notifications don't work on emulators)

- **Note**: expo-notifications is required by native-notify package. The warning about "expo-notifications not working in Expo Go" is expected - push notifications only work in development builds on real devices, not in Expo Go

### Place Marker Dragging Feature (November 28, 2025)

- **Dragging Mode**: Tap on any saved place marker on the map to see a popup with "Enable Dragging Mode" button
- **Drag to Adjust**: Once enabled, you can drag the place marker to a new location while still being able to zoom/pan the map
- **Save/Cancel**: A control panel appears at the bottom with "Cancel" to discard changes or "Save Location" to update the place coordinates
- **Visual Feedback**: Dragging markers have a highlighted border and a move icon indicator

### Mobile History & Settings Screens (November 27, 2025)

- **HistoryScreen**: Complete location history implementation
  - Timeline view showing past 24 hours of location updates
  - Map visualization with colored markers for each family member
  - Family member filtering tabs with selection state
  - Statistics display (members count, locations count)
  - Pull-to-refresh functionality
  - Accuracy badges (High/Medium/Low) and location type badges (Auto/Manual)
  - Empty states for no history or no selected members
  - Matches web app's History page exactly

- **SettingsScreen**: Full settings management
  - User profile card with avatar and user info
  - Profile editor modal (name, email, phone, password change)
  - Location settings modal (auto-logging toggle, interval selection: 1/5/15/30 min)
  - Notification settings modal (permission status, enable button)
  - Appearance/theme modal (Light/Dark/System options with persistence)
  - Help & Support section
  - Logout button with confirmation
  - App version info display

- **ThemeContext**: Manual theme switching system
  - Supports Light/Dark/System modes
  - AsyncStorage persistence for theme preference
  - Integrates with useThemeColors hook across all screens
  - System mode follows device color scheme automatically
  - Immediate theme updates without app restart

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

### Mobile Authentication & React Query Integration (October 20, 2025)

- **Authentication**: Implemented complete authentication flow for mobile app
  - Created AuthScreen with Sign In / Create Account tabs matching web UI
  - Integrated with existing backend API endpoints (/api/login, /api/register, /api/logout)
  - Added AuthContext and useAuth hook for mobile
  - Implemented secure storage with expo-secure-store (ready for token storage)
- **React Query Setup**: Configured TanStack Query (React Query) for mobile
  - Created queryClient with error handling
  - Added QueryClientProvider to app root
  - Implemented apiRequest helper for API calls
  - Set up query functions matching web app patterns
- **App Structure**: Updated App.tsx with authentication routing
  - Shows loading screen while checking auth state
  - Displays AuthScreen when not logged in
  - Shows main app (map + tabs) when authenticated
- **Form Validation**: Client-side validation matching web app:
  - Email format validation
  - Password length (min 6 characters)
  - Phone number validation
  - Password confirmation matching
  - Real-time error display
- **Network Configuration Fixes**:
  - Fixed "Network request failed" error by using Replit backend domain
  - Mobile app now connects to `https://[replit-domain].replit.dev` instead of Expo tunnel
  - The Expo tunnel (`exp.direct`) is only for Metro bundler, not backend API
  - Fixed loading screen hang by disabling retries on 401 responses
  - Added debug logging for API URL detection and auth state
- **Authentication Issues Resolved**:
  - Fixed password verification in passport authentication
  - Added detailed logging for debugging authentication failures
  - Restored original user accounts with proper credentials
  - Confirmed login/register flows working on mobile app

### Mobile Family Screen Implementation (October 20, 2025)

- **Family Management**: Built complete Family screen for mobile app matching web app exactly
  - Family members list with avatars and location status indicators
  - Real-time status (Active/Recent/Inactive/Offline) with color-coded dots
  - Empty state when no family members with quick action buttons
  - Loading skeletons for better UX during data fetch
- **Invitation System**:
  - Generate invitation code with modal dialog
  - Join family using 6-character code input
  - Copy invitation code to clipboard functionality
  - Code expiration handling (24 hours)
- **Location Sharing Status**:
  - Shows when family members have location sharing enabled/disabled
  - Displays time since last location update
  - Visual indicators for location status
- **UI/UX Features**:
  - Strong frosted glass blur effects (intensity={100}) on modals
  - Responsive layout matching web app design
  - All interactive elements have data-testid for testing
  - Alert dialogs for confirmation and error handling
- **React Query Integration**:
  - GET /api/family - Fetch family members
  - GET /api/locations/family - Fetch family location status
  - POST /api/family/generate-code - Generate invitation code
  - POST /api/family/join - Join family with code
  - DELETE /api/family/:memberId - Remove family member
  - Automatic cache invalidation after mutations

## 📄 License

This is a private project for family use.

## 🤝 Contributing

This is a personal/family project. If you have suggestions or find bugs, please open an issue.

---

## 📋 Changelog

### 2026-01-19

- **Status Dot Positioning (Mobile)**: Updated profile picture status dots positioning
  - Status dots now positioned at `bottom: -2, right: -2` so about half overlaps the avatar edge
  - Border color matches the card background color for theme-aware display
  - Applied to both FamilyScreen member cards and MapScreen member indicator

- **Comprehensive GitHub Actions Workflows**: Created 7 workflow files for CI/CD and security
  - `ci.yml` - Main CI pipeline (lint, typecheck, tests, build, security audit)
  - `integration.yml` - Database integration tests with PostgreSQL, privacy tests
  - `codeql.yml` - Static security analysis (public repos only)
  - `dependency-review.yml` - Blocks PRs with vulnerable dependencies
  - `scheduled-security.yml` - Nightly security audits and compliance checks
  - `release-backend.yml` - Backend deployment with staging → production flow
  - `release-mobile.yml` - iOS/Android builds via Expo EAS
  - Security features: location data validation, JWT checks, secret scanning, SDK audits

- **TypeScript CI Error Fixes**: Fixed multiple TypeScript errors across the codebase
  - `AddressAutocomplete.tsx` - Fixed useRef type annotation
  - `LocationLogger.tsx` - Fixed apiRequest function call signature and user type annotations
  - `NotificationToast.tsx` - Removed console.log in JSX render (returns void, not ReactNode)
  - `toaster.tsx` - Fixed variant type to match Toast component types
  - `Places.tsx` - Added AuthUser interface for proper user typing
  - `server/locationLogger.ts` - Changed userId from string to number, fixed timestamp null check
  - `server/routes.ts` - Fixed locationLogger calls with proper number type
  - `server/replitAuth.ts` - Replaced upsertUser with createUser/updateUserProfile, fixed type casting
  - Updated CI workflow to handle known Vite config type issue

### 2025-10-26

- **Theme Color Update**: Updated primary theme color to darker deep sky blue (#0EA5E9)
  - Changed from #1d89f1 to #0EA5E9 (darker deep sky blue)
  - Updated across all mobile components: buttons, icons, markers, tab bar
  - Updated notification bell, alert dialogs, loading indicators
  - Updated interactive elements and active states
  - Consistent darker deep sky blue theme throughout entire mobile app

- **Family Tab UI Enhancements (Mobile)**:
  - Removed family member count indicator from section header
  - Updated profile avatars to use lighter gray color (#9CA3AF) with white initials
  - Profile avatars now show both first and last initials (e.g., "JD" for John Doe)
  - Added logged-in user to family members list with "You" badge
  - Logged-in user shows as "Currently active" with green status
  - Statistics now accurately count logged-in user in Total Members and Online Now
  - Blue badge (#0EA5E9) with white text indicating current user
  - Improved visual hierarchy and consistency across family member cards
  - Simplified status messages: "Currently active", "2 min ago", "Offline for 3h", etc. (removed redundant status prefix)
  - Updated "View" button text color to match theme color (#0EA5E9)

- **Map Screen Family Markers (Mobile)**:
  - Family members now visible on map as green circular markers
  - Shows all family members with location sharing enabled (no time limit)
  - Green markers match style of user location marker (circle with white border)
  - Active members (< 15 min) have pulsing animation on green marker
  - Older markers (> 15 min) are slightly faded but still visible
  - Custom styled callout (speech bubble) appears when tapping family member marker
  - Callout shows: member's full name, online/offline status with color-coded dot, time since last seen
  - Status colors: Green (active), Yellow (recent), Orange (inactive), Red/Gray (offline)
  - Speech bubble design matches app theme with rounded corners, shadows, and pointer
  - Callout includes person icon in blue theme color background
  - Shows full first and last name of family members
  - Displays detailed status: "Currently active", "5 min ago", "Offline for 2h", "Offline for 3d"

### 2025-10-22

- **Custom Themed Dialogs (Mobile)**: Replaced all native alerts with custom-styled dialogs
  - Created AlertDialog component matching app's design system
  - Theme color (#0EA5E9) with consistent button styles, icons, and rounded corners
  - Smooth fade-in animations and backdrop blur
  - Custom icons for different alert types (success, error, confirmation, info)
  - Applied to: family member removal, location permissions, join family, clipboard copy, navigation
  - Consistent user experience across all confirmation/alert dialogs
- **Members Indicator (Mobile Map)**: Fixed to show accurate real-time online count
  - **Always counts logged-in user as online** (viewing app = online)
  - Fetches actual family location data from API every 10 seconds
  - Counts family members active within last 5 minutes (sharing enabled + recent timestamp)
  - Total count = logged-in user + active family members
  - **Map markers**: Only shows locations from last 24 hours (prevents old stale markers)
  - Green pulsing markers for active members (< 15 min), gray for older markers
  - Includes "last seen" timestamps in marker callouts

- **NotificationBell Component (Mobile)**: Added real-time notification center to mobile map
  - Positioned at top-right with solid theme color background (#0EA5E9)
  - White bell icon with red badge showing unread count
  - Full modal with color-coded notification icons
  - Auto-refreshes every 5-10 seconds
  - Mark as read functionality (individual and bulk)
  - Matches web app notification center exactly
  - Fixed: Removed blur effect for consistent color matching across all UI elements
- **Family Tab Statistics (Mobile)**: Added real-time family statistics at bottom of Family tab
  - **Copied EXACTLY from web app's Family tab UI**
  - Two cards in a row showing Total Members and Online Now counts
  - Total Members: Large primary color number (#0EA5E9) with count of all family members
  - Online Now: Large green number (#10B981) counting members active within last 5 minutes
  - Cards have white background, border, rounded corners, and centered text
  - Matches web app styling: grid layout, card design, colors, and typography
- **Theme Color Update**: Changed primary color from #007AFF to #0EA5E9 across entire mobile app
  - Updated all interactive elements (buttons, icons, markers)
  - Updated tab bar active states
  - Updated loading indicators
  - Updated notification indicators and unread states
  - All color-coded elements now use new theme color
- **Status Bar Configuration**: Configured Android system status bar for theme-aware display
  - Light mode: Black system indicators (time, battery, signal)
  - Dark mode ready: Will show white indicators when dark mode is implemented
  - Uses expo-status-bar with "dark" style for light mode
- **Compass Component (Mobile Map)**: Added interactive compass showing map orientation
  - Positioned at bottom left corner (mirroring notification bell position)
  - Same size and shape as notification bell (44x44px, rounded)
  - **Red needle always points to true north** - rotates opposite to map rotation
  - **Instant real-time rotation** - compass needle tracks map rotation with zero lag
  - **No animation delay** - uses direct value updates for immediate responsiveness
  - **Animated reset to north** - tapping compass smoothly swings map back to north-up
  - Ultra-clean minimalist design: red/gray needles with 4px gap, no border or circle
  - Counter-rotates as map turns to maintain north reference
  - Uses `onRegionChange` + `setValue()` for instant visual feedback
  - Matches alignment spacing (16px from edges, 72px from bottom)
- **Map Type Toggle & POI Fix (Mobile)**: Improved satellite view experience
  - Changed satellite mode to use "hybrid" map type (satellite imagery + labels/POIs)
  - POI icons now stay visible in satellite view instead of flashing and disappearing
  - **Dynamic status bar**: Status bar automatically adapts to map type
  - White system icons (light style) in hybrid/satellite mode for better visibility
  - Black system icons (dark style) in standard mode
  - Status bar changes instantly when toggling map type
  - Works across all screens (mapType state lifted to App.tsx)
- **Map Position Persistence (Mobile)**: Map stays exactly where you left it
  - All screens remain mounted but hidden when switching tabs
  - MapScreen never unmounts, preserving map position, zoom, and rotation naturally
  - Region changes only saved when Map tab is active (prevents saving incorrect positions)
  - `isActive` prop prevents `onRegionChangeComplete` from triggering when screen is hidden
  - Inactive screens use `opacity: 0` and `pointerEvents: "none"` to hide them
  - Map position, zoom, and rotation are perfectly preserved when switching tabs

### 2025-10-20

- **Documentation Migration**: Moved all documentation from `replit.md` to `README.md`
- **Workflow Update**: All future changes will be formatted with Prettier and documented in README.md

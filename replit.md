# FamilyLocator - Real-time Family Location Sharing App

## Overview

FamilyLocator is a modern web application that enables families to share their real-time locations with each other in a secure and privacy-focused environment. The application provides an interactive map interface where family members can see each other's locations, manage privacy settings, and organize important places.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Maps**: Leaflet with React-Leaflet for interactive map functionality

### Backend Architecture

- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Real-time Communication**: WebSocket for live location updates
- **Session Management**: Express sessions with PostgreSQL store

### Mobile-First Design

- Responsive design optimized for mobile devices
- Bottom navigation pattern for easy thumb navigation
- Touch-friendly interface elements
- Progressive Web App capabilities

## Key Components

### Authentication System

- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions for persistence
- **Security**: HTTP-only cookies with secure flag for production
- **User Management**: Automatic user creation and profile management

### Location Services

- **Geolocation API**: High-accuracy location tracking with user consent
- **Real-time Updates**: WebSocket connections for live location sharing
- **Privacy Controls**: Granular settings for location sharing and history
- **Location History**: Optional storage of location data for family members

### Family Management

- **Connections**: Invite-based family member system
- **Status Tracking**: Visual indicators for family member availability
- **Privacy Respect**: Honor individual privacy settings
- **Connection States**: Pending, accepted, and blocked connection management

### Places System

- **Custom Places**: Users can save important locations (home, work, school)
- **Categorization**: Organized place categories with custom icons
- **Geofencing**: Potential for location-based notifications
- **Quick Access**: Easy navigation to saved places

## Data Flow

### Location Updates

1. Client requests geolocation permission
2. Browser provides location coordinates
3. Client sends location to server via REST API
4. Server validates and stores location in database
5. Server broadcasts location update via WebSocket to family members
6. Connected family members receive real-time location updates

### Family Connections

1. User sends invitation by email
2. Invitee receives connection request
3. Invitee accepts/rejects connection
4. Bi-directional family relationship established
5. Location sharing begins based on privacy settings

### Privacy Settings

1. User modifies privacy settings in UI
2. Settings sent to server and stored in database
3. Server respects settings for location sharing
4. Real-time updates honor privacy preferences

## External Dependencies

### Core Dependencies

- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **leaflet**: Interactive map functionality
- **wouter**: Lightweight routing
- **@radix-ui/\***: Accessible UI components
- **tailwindcss**: Utility-first CSS framework

### Development Tools

- **TypeScript**: Static type checking
- **Vite**: Build tool and development server
- **drizzle-kit**: Database schema management
- **tsx**: TypeScript execution for server

### Authentication

- **openid-client**: OpenID Connect implementation
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

## Deployment Strategy

### Build Process

- **Client**: Vite builds optimized React application to `dist/public`
- **Server**: esbuild bundles TypeScript server code to `dist/index.js`
- **Database**: Drizzle migrations applied before deployment

### Environment Configuration

- **Development**: Local development with hot reloading
- **Production**: Replit deployment with autoscaling
- **Database**: PostgreSQL connection via environment variable
- **Sessions**: Secure session secret for production

### Replit Integration

- **Modules**: Node.js 20, Web, PostgreSQL 16
- **Deployment**: Autoscale deployment target
- **Port Configuration**: Internal port 5000, external port 80
- **Development**: Integrated development environment

## Changelog

- August 21, 2025. Enhanced History page with interactive features and fixed location logging:
  - Implemented clickable location history entries that redirect to main map with automatic centering
  - Added comprehensive Location Settings panel with configurable auto-location logging intervals (15min to 8hrs)
  - Enhanced address autocomplete functionality for better place creation with real address suggestions
  - Fixed critical location logging issue - eliminated duplicate saves with intelligent throttling system
  - Added location distance-based deduplication to prevent rapid duplicate entries
  - Improved error handling in History page with proper authentication and retry mechanisms
  - Created visual indicators and "Click to view on map" hints for better user experience
  - History map view shows color-coded pins with tooltips and family member filtering
  - Detailed timestamps display both relative time ("2h ago") and full date/time information

- August 20, 2025. Completed cross-platform notification system:
  - Fixed mobile notification issues by implementing Service Worker API for mobile devices
  - Created comprehensive notification helper that automatically detects mobile vs desktop
  - Added vibration support for mobile notifications and proper fallback handling
  - Integrated Service Worker notifications with existing WebSocket geofencing system
  - System now successfully delivers notifications on both desktop and mobile platforms
  - Removed diagnostic and test components from Settings after successful implementation

- August 18, 2025. Profile management improvements and UI streamlining:
  - Fixed profile image upload and display across all components
  - Improved password change error handling with user-friendly messages
  - Enhanced error handling in queryClient.ts to properly parse JSON responses
  - Fixed logout functionality to properly redirect to landing page instead of 404 error
  - Completely removed privacy settings feature from the application
  - Consolidated Settings page into single group without section headers (Account/Support removed)
  - Simplified settings layout to show just Profile Information and Help & Support

- August 17, 2025. Enhanced geofencing notifications and UI improvements:
  - Fixed mobile pin dragging issues - pins now stay where moved and save correctly
  - Updated database permissions to allow family members to modify shared place locations
  - Implemented geofencing notifications for entering/exiting saved places (10m radius)
  - Added test notification system with manual trigger and geofence state clearing
  - Real-time toast notifications appear when family members enter/exit saved locations
  - Enhanced WebSocket system to broadcast geofence events to all family members
  - Removed hamburger menu and search button from map interface for cleaner UI
  - Streamlined top header to show only family member status indicator

- August 15, 2025. Map improvements and critical location accuracy fixes:
  - Switched map provider to Google Maps for familiar interface and better rendering
  - Fixed critical precision issue: Database was using 32-bit `real` type limiting coordinates to 6-7 digits
  - Solution: Upgraded latitude/longitude columns to `double precision` for full GPS accuracy
  - Test location now at exact coordinates: 37.77959918666838, -121.9555844121186 (250 Canyon Lakes Place)
  - All saved places now support full coordinate precision (15+ decimal places)
  - Added geofence state clearing endpoint (/api/geofence/clear) for fresh detection
  - Root cause identified: Coordinate truncation due to insufficient database precision, not visual estimation
  - Updated all place coordinates with official Google Maps data for perfect pin placement

- August 14, 2025. Enhanced geofencing precision and notifications:
  - Updated geofencing radius from 100m to 10m for more precise location detection
  - Improved notification messages to show "entering/exiting [location]" format
  - Fixed family invitation system to connect new members to ALL existing family members
  - Real-time notifications sent to all family members when someone enters/exits places
  - Cleaned up settings panel by removing test components for production use

- August 13, 2025. Implemented geofencing notifications for location-based alerts:
  - Added geofencing detection system using Haversine distance calculations
  - Real-time notifications via WebSocket when family members enter/exit saved places
  - Toast notifications with visual indicators for arrival/departure events
  - Automatic state tracking to prevent duplicate notifications
  - Integration with existing location sharing and WebSocket infrastructure

- August 13, 2025. Enhanced map zoom capabilities with advanced controls:
  - Increased maximum zoom from default to level 22 (extremely detailed view)
  - Added satellite/hybrid view toggle for high-resolution imagery
  - Custom zoom controls with dedicated zoom in/out buttons
  - Removed default Leaflet zoom controls for cleaner interface
  - Enhanced tile layer configuration for better performance at high zoom
  - ArcGIS satellite imagery for detailed aerial views
  - Improved map controls positioning and styling

- August 13, 2025. Replaced email invitation system with invitation codes:
  - Replaced email-based family invitations with 6-character invitation codes
  - Users can now generate invitation codes that expire after 24 hours
  - Family members join using codes instead of email addresses
  - Added invitation codes table to database schema with expiration tracking
  - Simplified family joining process - no need for email verification
  - Codes automatically marked as used when someone joins the family
  - Added copy-to-clipboard functionality for easy code sharing
  - Updated Family page UI to show active codes and join options

- August 11, 2025. Improved cross-platform compatibility and user experience:
  - Fixed bottom navigation issues on Windows with better CSS positioning and cursor handling
  - Enhanced touch device support across platforms
  - Removed World Map feature due to stability issues across different browsers
  - Simplified navigation to focus on core family location sharing features
  - Completely redesigned landing page with clear account creation instructions
  - Added both "Create Account" and "Sign In" options for new and existing users
  - Improved invitation system with step-by-step guidance for new users
  - Added better error messages explaining why invitations require existing accounts

- June 24, 2025. Added automatic hourly location logging feature:
  - Background service that logs user location data every hour
  - Configurable through user privacy settings (location history enabled/disabled)
  - Auto-start/stop based on WebSocket connections and user preferences
  - Manual control through Settings page with LocationLogger component
  - Enhanced location schema with type field (manual vs automatic_hourly)
  - Temporary in-memory storage implementation to resolve database connection issues

- June 15, 2025. Created comprehensive cross-platform family locator application with:
  - Real-time location tracking using geolocation API and WebSocket connections
  - Interactive map interface with Leaflet for visualizing family member locations
  - Family member management system with invite/accept functionality
  - Privacy controls for location sharing and history
  - Saved places system with categorization (home, work, school, etc.)
  - Mobile-responsive design optimized for phones and tablets
  - Progressive Web App features for app-like experience
  - Secure authentication using Replit Auth with PostgreSQL session storage
  - Database schema with users, locations, places, and family connections tables

## User Preferences

Preferred communication style: Simple, everyday language.
Project focus: Cross-platform web-based family location sharing with real-time capabilities.
Location accuracy: All location pins must use exact coordinates from Google Maps, never use geocoding or approximations.

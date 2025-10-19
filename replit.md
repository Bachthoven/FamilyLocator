# FamilyLocator - Real-time Family Location Sharing App

## Overview
FamilyLocator is a cross-platform application designed for families to securely share real-time locations. It provides an interactive map interface, privacy management, and tools for organizing important places. The project aims to deliver a robust, user-friendly solution for family safety and coordination across web and mobile platforms.

## User Preferences
Preferred communication style: Simple, everyday language.
Project focus: Cross-platform web-based family location sharing with real-time capabilities.
Location accuracy: All location pins must use exact coordinates from Google Maps, never use geocoding or approximations.

## System Architecture

### Frontend Architecture
- **Web Application**: React 18.2 with TypeScript, Vite, Tailwind CSS (shadcn/ui), TanStack Query, Wouter, and Leaflet (React-Leaflet) for maps.
- **Mobile Application**: React Native 0.73.6 with Expo SDK 50 and TypeScript, optimized for iOS and Android.

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
- **TypeScript**: Static type checking.
- **Vite**: Build tool and development server.
- **drizzle-kit**: Database schema management.
- **tsx**: TypeScript execution for server.

### Authentication
- **openid-client**: OpenID Connect implementation.
- **passport**: Authentication middleware.
- **express-session**: Session management.
- **connect-pg-simple**: PostgreSQL session store.
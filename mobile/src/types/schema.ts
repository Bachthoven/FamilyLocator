// Mobile-only type definitions for the Family Locator app
// These match the server schema but without database dependencies

export interface User {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  profileImageUrl: string | null;
  locationSharingEnabled: boolean;
  locationHistoryEnabled: boolean;
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: number;
  userId: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address: string | null;
  type: 'manual' | 'automatic_hourly';
  timestamp: Date;
}

export interface Place {
  id: number;
  userId: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  category: string | null;
  color: string;
  createdAt: Date;
}

export interface FamilyConnection {
  id: number;
  userId: number;
  familyMemberId: number;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
}

export interface FamilyMember extends User {
  status: 'pending' | 'accepted' | 'blocked';
}

export interface InvitationCode {
  id: number;
  code: string;
  userId: number;
  expiresAt: Date;
  usedAt: Date | null;
  usedById: number | null;
  createdAt: Date;
}

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: Date;
}

export interface PasswordResetCode {
  id: number;
  email: string;
  code: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

// API request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  sessionToken: string;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

export interface CreatePlaceRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category?: string;
  color?: string;
}

export interface JoinFamilyRequest {
  code: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  locationSharingEnabled?: boolean;
  locationHistoryEnabled?: boolean;
  notificationsEnabled?: boolean;
}

export interface PushTokenRequest {
  pushToken: string;
}

import { User, Location } from '@shared/schema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MapPin, Eye, EyeOff } from 'lucide-react';

interface FamilyMemberCardProps {
  user: User;
  location?: Location;
  isRecent?: boolean;
  lastSeen?: string | null;
  onViewLocation?: () => void;
  onRemove?: () => void;
}

function getTimeAgo(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function getStatusColor(location?: Location, user?: User): string {
  if (!location || !user?.locationSharingEnabled) return 'bg-gray-400';
  
  const now = new Date();
  const diff = now.getTime() - new Date(location.timestamp!).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  
  if (minutes < 5) return 'bg-green-500';
  if (minutes < 30) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function FamilyMemberCard({
  user,
  location,
  isRecent = true,
  lastSeen,
  onViewLocation,
  onRemove,
}: FamilyMemberCardProps) {
  const statusColor = getStatusColor(location, user);
  const canViewLocation = location && user.locationSharingEnabled;
  
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
      <div className="flex items-center space-x-3">
        <Avatar className="w-12 h-12">
          <AvatarImage 
            src={user.profileImageUrl || undefined} 
            alt={`${user.firstName || user.email}'s profile`}
          />
          <AvatarFallback>
            {user.firstName ? user.firstName[0].toUpperCase() : user.email?.[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <div className="font-medium text-foreground">
            {user.firstName && user.lastName 
              ? `${user.firstName} ${user.lastName}`
              : user.firstName || user.email
            }
          </div>
          <div className="text-sm text-muted-foreground flex items-center">
            <div className={`w-2 h-2 ${statusColor} rounded-full mr-2 ${!isRecent ? 'opacity-60' : ''}`}></div>
            {canViewLocation ? (
              location.address || 'Unknown location'
            ) : (
              'Location sharing off'
            )}
          </div>
          {canViewLocation && lastSeen && (
            <div className="text-xs text-muted-foreground">
              Last seen {lastSeen}
            </div>
          )}
          {canViewLocation && isRecent && (
            <div className="text-xs text-green-600 dark:text-green-400">
              Active now
            </div>
          )}
        </div>
      </div>
      
      <div className="text-right flex items-center space-x-2">
        {canViewLocation ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewLocation}
            className="text-primary hover:text-primary/80"
          >
            <MapPin className="w-4 h-4 mr-1" />
            View
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="text-muted-foreground"
          >
            <EyeOff className="w-4 h-4 mr-1" />
            Hidden
          </Button>
        )}
      </div>
    </div>
  );
}

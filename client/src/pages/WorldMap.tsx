import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import WorldMap from '@/components/WorldMap';
import BottomNavigation from '@/components/BottomNavigation';
import { Globe } from 'lucide-react';

export default function WorldMapPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Globe className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <div className="w-32 h-4 bg-muted animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-background border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">World Map</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          Family Locations
        </div>
      </div>

      {/* Map Content */}
      <div className="flex-1 relative">
        <WorldMap />
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
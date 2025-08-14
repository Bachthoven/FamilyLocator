import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TestTube, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SimpleGeofenceTest() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const simulateNotification = () => {
    setIsLoading(true);
    
    // Create a simple test notification that should appear
    const testNotification = {
      id: Date.now().toString(),
      type: 'geofence' as const,
      userId: 999,
      userName: 'Test User',
      placeName: 'Test Place',
      action: 'entered' as const,
      message: 'Test User has entered Test Place',
      timestamp: new Date().toISOString(),
    };

    // Dispatch a custom event to trigger the notification
    window.dispatchEvent(new CustomEvent('test-geofence-notification', {
      detail: testNotification
    }));

    toast({
      title: "Test Notification Triggered",
      description: "A test geofence notification should appear in the top-right corner.",
    });

    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Simple Notification Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Test the notification system directly without requiring WebSocket connections.
        </p>
        
        <Button 
          onClick={simulateNotification}
          disabled={isLoading}
          className="w-full"
        >
          <Bell className="h-4 w-4 mr-2" />
          {isLoading ? 'Testing...' : 'Test Notification'}
        </Button>
      </CardContent>
    </Card>
  );
}
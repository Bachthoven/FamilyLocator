import { useState, useEffect } from "react";
import { Bell, BellOff, Check, X, TestTube } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function NotificationSettings() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [systemNotificationsEnabled, setSystemNotificationsEnabled] = useState(false);
  const { toast } = useToast();

  // Test notification mutation
  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/geofence/test");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Notification Sent",
        description: "Check if you received a system notification!",
      });
    },
    onError: (error) => {
      console.error("Test notification error:", error);
      toast({
        title: "Test Failed",
        description: "Could not send test notification - check console for details",
        variant: "destructive",
      });
    },
  });

  // Direct browser test notification
  const testBrowserNotification = () => {
    console.log('Testing browser notification directly...');
    console.log('Notification permission:', Notification.permission);
    
    if (Notification.permission === 'granted') {
      try {
        console.log('Creating test notification...');
        const notification = new Notification("🔔 FamilyLocator Test", {
          body: "This is a test notification to verify your browser settings are working correctly. You should see this popup!",
          icon: '/favicon.ico',
          tag: 'test-notification',
          requireInteraction: false,
          silent: false,
          badge: '/favicon.ico',
        });

        console.log('Test notification created successfully:', notification);
        
        notification.onclick = () => {
          console.log('Test notification was clicked');
          window.focus();
        };

        setTimeout(() => {
          console.log('Closing test notification');
          notification.close();
        }, 8000); // Keep it open longer for testing
        
        toast({
          title: "Browser Test Sent",
          description: "Check if you saw a system notification! Look for a popup outside the browser.",
        });
      } catch (error) {
        console.error('Error showing test notification:', error);
        toast({
          title: "Browser Test Failed",
          description: `Error: ${error.message}`,
          variant: "destructive",
        });
      }
    } else {
      console.log('Notification permission not granted:', Notification.permission);
      toast({
        title: "Permission Required",
        description: `Permission status: ${Notification.permission}. Please enable notifications first.`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      setSystemNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support system notifications",
        variant: "destructive",
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      setSystemNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive system notifications for location alerts",
        });
        
        // Show a test notification
        const testNotification = new Notification("FamilyLocator", {
          body: "System notifications are now enabled!",
          icon: '/favicon.ico',
          tag: 'test-notification',
        });
        
        setTimeout(() => testNotification.close(), 3000);
      } else if (permission === 'denied') {
        toast({
          title: "Notifications Blocked",
          description: "You can enable notifications in your browser settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Error",
        description: "Failed to request notification permission",
        variant: "destructive",
      });
    }
  };

  const getPermissionStatus = () => {
    switch (notificationPermission) {
      case 'granted':
        return { icon: Check, text: "Enabled", color: "text-green-600" };
      case 'denied':
        return { icon: X, text: "Blocked", color: "text-red-600" };
      default:
        return { icon: BellOff, text: "Not Set", color: "text-gray-500" };
    }
  };

  const status = getPermissionStatus();
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          System Notifications
        </CardTitle>
        <CardDescription>
          Get native notifications on your device when family members enter or exit saved locations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="system-notifications">Enable System Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications even when the app is in the background
            </p>
          </div>
          <Switch
            id="system-notifications"
            checked={systemNotificationsEnabled}
            onCheckedChange={(checked) => {
              if (checked && notificationPermission !== 'granted') {
                requestNotificationPermission();
              } else {
                setSystemNotificationsEnabled(checked);
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
            <span className="text-sm font-medium">Permission Status: {status.text}</span>
          </div>
          {notificationPermission === 'denied' && (
            <Button variant="outline" size="sm" onClick={() => {
              toast({
                title: "Permission Blocked",
                description: "Please enable notifications in your browser settings and refresh the page",
                duration: 5000,
              });
            }}>
              Help
            </Button>
          )}
        </div>

        {notificationPermission === 'default' && (
          <Button 
            onClick={requestNotificationPermission}
            className="w-full"
          >
            <Bell className="w-4 h-4 mr-2" />
            Enable System Notifications
          </Button>
        )}

        {systemNotificationsEnabled && (
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={testBrowserNotification}
              className="w-full"
            >
              <TestTube className="w-4 h-4 mr-2" />
              Test Browser Notification
            </Button>
            <Button
              variant="outline"
              onClick={() => testNotificationMutation.mutate()}
              disabled={testNotificationMutation.isPending}
              className="w-full"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {testNotificationMutation.isPending ? "Sending..." : "Test Geofence Notification"}
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• You'll receive notifications when family members enter or exit saved places</p>
          <p>• Notifications appear even when the app is closed or minimized</p>
          <p>• You can disable this anytime in your browser settings</p>
        </div>
      </CardContent>
    </Card>
  );
}
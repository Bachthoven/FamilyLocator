import { useState, useEffect } from "react";
import { Bell, BellOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { requestNotificationPermission } from "@/utils/notificationHelper";

interface NotificationSettingsProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NotificationSettings({ open, onOpenChange }: NotificationSettingsProps) {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [systemNotificationsEnabled, setSystemNotificationsEnabled] = useState(false);
  const { toast } = useToast();



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

  const notificationContent = (
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



        <div className="text-xs text-muted-foreground">
          <p>• You'll receive notifications when family members enter or exit saved places</p>
          <p>• Notifications appear even when the app is closed or minimized</p>
          <p>• You can disable this anytime in your browser settings</p>
        </div>
      </CardContent>
    </Card>
  );

  // If modal props are provided, wrap in Dialog
  if (open !== undefined && onOpenChange) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {notificationContent}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise, render standalone
  return notificationContent;
}
import { useState, useEffect } from "react";
import { Bell, BellOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { requestNotificationPermission } from "@/utils/notificationHelper";

export function NotificationSettingsCompact() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [systemNotificationsEnabled, setSystemNotificationsEnabled] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      setSystemNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support system notifications",
        variant: "destructive",
      });
      return;
    }

    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      setSystemNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive system notifications for important events",
        });
      } else if (permission === 'denied') {
        toast({
          title: "Notifications Denied",
          description: "You can change this in your browser settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Permission Error",
        description: "Failed to request notification permission",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setIsDialogOpen(true)}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">System Notifications</p>
              <p className="text-sm text-muted-foreground">
                {systemNotificationsEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {systemNotificationsEnabled ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <X className="w-4 h-4 text-red-600" />
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              System Notifications
            </DialogTitle>
            <DialogDescription>
              Get notified when family members enter or exit important places
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {systemNotificationsEnabled ? (
                  <>
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">Enabled</span>
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium">
                      {notificationPermission === 'denied' ? 'Blocked' : 'Disabled'}
                    </span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="notifications-toggle" className="text-sm">
                  {systemNotificationsEnabled ? 'On' : 'Off'}
                </Label>
                <Switch
                  id="notifications-toggle"
                  checked={systemNotificationsEnabled}
                  onCheckedChange={() => {}} // Read-only - controlled by browser permission
                  disabled={true}
                />
              </div>
            </div>

            {!systemNotificationsEnabled && notificationPermission !== 'denied' && (
              <Button
                onClick={handleRequestPermission}
                className="w-full"
                variant="outline"
              >
                <Bell className="w-4 h-4 mr-2" />
                Enable System Notifications
              </Button>
            )}

            {notificationPermission === 'denied' && (
              <Button
                onClick={() => {
                  toast({
                    title: "Browser Settings Required",
                    description: "Please enable notifications in your browser settings, then refresh this page.",
                  });
                }}
                className="w-full"
                variant="outline"
              >
                <BellOff className="w-4 h-4 mr-2" />
                Enable System Notifications
              </Button>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• You'll receive notifications when family members enter or exit saved places</p>
              <p>• Notifications appear even when the app is closed or minimized</p>
              <p>• Works on both desktop and mobile devices</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
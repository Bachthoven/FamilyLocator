import { useEffect, useState } from 'react';
import { Bell, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/useWebSocket';

interface GeofenceNotification {
  id: string;
  type: 'geofence';
  userId: number;
  userName: string;
  placeName: string;
  action: 'entered' | 'exited';
  message: string;
  timestamp: string;
}

interface NotificationToastProps {
  notification: GeofenceNotification;
  onDismiss: () => void;
}

export function NotificationToast({
  notification,
  onDismiss,
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade out animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) {
    return null;
  }

  const isEntered = notification.action === 'entered';

  return (
    <Card
      className={`
      fixed top-4 right-4 z-50 w-80 shadow-lg transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      border-l-4 ${isEntered ? 'border-l-green-500' : 'border-l-orange-500'}
      bg-white dark:bg-gray-900
    `}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-full ${isEntered ? 'bg-green-100 dark:bg-green-900' : 'bg-orange-100 dark:bg-orange-900'}`}
          >
            <MapPin
              className={`h-4 w-4 ${isEntered ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}
            />
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-500" />
              <Badge
                variant={isEntered ? 'default' : 'secondary'}
                className="text-xs"
              >
                {isEntered ? 'Arrived' : 'Left'}
              </Badge>
            </div>

            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {notification.userName}
            </p>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isEntered ? 'arrived at' : 'left'}{' '}
              <span className="font-medium">{notification.placeName}</span>
            </p>

            <p className="text-xs text-gray-500 dark:text-gray-500">
              {new Date(notification.timestamp).toLocaleTimeString()}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="p-1 h-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface NotificationManagerProps {
  children: React.ReactNode;
}

export function NotificationManager({ children }: NotificationManagerProps) {
  const [notifications, setNotifications] = useState<GeofenceNotification[]>(
    []
  );
  const { lastMessage } = useWebSocket();

  // Handle WebSocket messages for notifications
  useEffect(() => {
    console.log('NotificationManager: lastMessage changed:', lastMessage);

    if (
      lastMessage?.type === 'geofence' ||
      (lastMessage?.type === 'notification' &&
        lastMessage?.geofenceType === 'geofence')
    ) {
      const notification: GeofenceNotification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: 'geofence',
        userId: lastMessage.userId,
        userName: lastMessage.userName,
        placeName: lastMessage.placeName,
        action: lastMessage.action,
        message: lastMessage.message,
        timestamp: lastMessage.timestamp,
      };

      console.log('Adding geofence notification from WebSocket:', notification);
      console.log(
        'Current notifications count before add:',
        notifications.length
      );
      setNotifications((prev) => {
        const updated = [...prev, notification];
        console.log('Updated notifications count:', updated.length);
        return updated;
      });
    } else if (lastMessage) {
      console.log(
        'Message type not matching geofence criteria:',
        lastMessage.type,
        lastMessage
      );
    }
  }, [lastMessage]);

  // Add event listener for test notifications
  useEffect(() => {
    const handleTestNotification = (event: CustomEvent) => {
      console.log('Test notification event received:', event.detail);
      setNotifications((prev) => [...prev, event.detail]);
    };

    window.addEventListener(
      'test-geofence-notification',
      handleTestNotification as EventListener
    );

    return () => {
      window.removeEventListener(
        'test-geofence-notification',
        handleTestNotification as EventListener
      );
    };
  }, []);

  const dismissNotification = (id: string) => {
    console.log('Dismissing notification:', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  console.log(
    'NotificationManager render: notifications count =',
    notifications.length
  );

  return (
    <>
      {children}

      {/* Render notifications */}
      <div className="fixed top-4 right-4 z-50 pointer-events-none">
        <div className="space-y-2 pointer-events-auto">
          {notifications.length > 0 &&
            console.log('Rendering notifications:', notifications)}
          {notifications.map((notification, index) => (
            <div
              key={notification.id}
              className="transition-all duration-300 ease-in-out"
              style={{
                transform: `translateY(${index * 90}px)`,
                zIndex: 50 - index,
              }}
            >
              <NotificationToast
                notification={notification}
                onDismiss={() => dismissNotification(notification.id)}
              />
            </div>
          ))}

          {/* Debug indicator */}
          {notifications.length > 0 && (
            <div className="text-xs bg-blue-500 text-white p-2 rounded">
              Debug: {notifications.length} notification(s)
            </div>
          )}
        </div>
      </div>
    </>
  );
}

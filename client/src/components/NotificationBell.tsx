import { useState, useEffect } from "react";
import { Bell, X, CheckCircle, AlertTriangle, XCircle, Info, MapPin, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Notification } from "@shared/schema";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { lastMessage } = useWebSocket();

  // Get unread notification count for the red dot
  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 5000, // Check every 5 seconds for faster updates
  });
  
  const unreadCount = unreadCountData?.count || 0;

  // Request notification permission when component mounts
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          console.log('Notification permission:', permission);
        } catch (error) {
          console.error('Error requesting notification permission:', error);
        }
      }
    };

    requestNotificationPermission();
  }, []);

  // Listen for WebSocket notifications and refresh the queries
  useEffect(() => {
    if (lastMessage) {
      try {
        const message = JSON.parse(lastMessage.toString());
        if (message.type === 'geofence' || message.type === 'notification') {
          // Immediately refresh notification queries when new notifications arrive
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
          queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
          
          // System notifications are handled by useWebSocket.ts to avoid duplicates
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }
  }, [lastMessage]);

  // Get notifications (always fetch, not just when opened)
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 10000, // Refresh every 10 seconds
    refetchOnWindowFocus: true,
  });

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest("PATCH", "/api/notifications/mark-all-read");
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getToastIcon = (title: string, type: string) => {
    const titleStr = title.toLowerCase();
    
    // Geofence notifications
    if (titleStr.includes('entering') || titleStr.includes('entering')) {
      return <MapPin className="w-5 h-5 text-green-500" />;
    }
    if (titleStr.includes('exiting') || titleStr.includes('leaving')) {
      return <MapPin className="w-5 h-5 text-orange-500" />;
    }
    
    // Success notifications
    if (titleStr.includes('success') || titleStr.includes('saved') || titleStr.includes('added') || 
        titleStr.includes('copied') || titleStr.includes('joined') || titleStr.includes('started') ||
        titleStr.includes('stopped') || titleStr.includes('deleted') || titleStr.includes('removed') ||
        titleStr.includes('updated') || titleStr.includes('centered')) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    
    // Family/location notifications
    if (titleStr.includes('location') || titleStr.includes('family') || titleStr.includes('member')) {
      return <Users className="w-5 h-5 text-blue-500" />;
    }
    
    // Error notifications
    if (titleStr.includes('error') || titleStr.includes('failed') || titleStr.includes('unauthorized')) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    
    // Warning notifications
    if (titleStr.includes('warning') || titleStr.includes('expired')) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    
    // Default info icon
    return <Info className="w-5 h-5 text-blue-500" />;
  };

  const getToastColors = (title: string) => {
    const titleStr = title.toLowerCase();
    
    // Geofence notifications - special styling
    if (titleStr.includes('entering') || titleStr.includes('exiting')) {
      return 'bg-green-50 dark:bg-green-950/20';
    }
    
    // Success notifications
    if (titleStr.includes('success') || titleStr.includes('saved') || titleStr.includes('added') || 
        titleStr.includes('copied') || titleStr.includes('joined') || titleStr.includes('started') ||
        titleStr.includes('stopped') || titleStr.includes('deleted') || titleStr.includes('removed') ||
        titleStr.includes('updated') || titleStr.includes('centered')) {
      return 'bg-green-50 dark:bg-green-950/20';
    }
    
    // Error notifications
    if (titleStr.includes('error') || titleStr.includes('failed') || titleStr.includes('unauthorized')) {
      return 'bg-red-50 dark:bg-red-950/20';
    }
    
    // Warning notifications
    if (titleStr.includes('warning') || titleStr.includes('expired')) {
      return 'bg-yellow-50 dark:bg-yellow-950/20';
    }
    
    // Default styling
    return 'bg-blue-50 dark:bg-blue-950/20';
  };

  const getBorderColor = (title: string) => {
    const titleStr = title.toLowerCase();
    
    // Geofence notifications
    if (titleStr.includes('entering') || titleStr.includes('exiting')) {
      return 'border-l-green-500';
    }
    
    // Success notifications
    if (titleStr.includes('success') || titleStr.includes('saved') || titleStr.includes('added') || 
        titleStr.includes('copied') || titleStr.includes('joined') || titleStr.includes('started') ||
        titleStr.includes('stopped') || titleStr.includes('deleted') || titleStr.includes('removed') ||
        titleStr.includes('updated') || titleStr.includes('centered')) {
      return 'border-l-green-500';
    }
    
    // Error notifications
    if (titleStr.includes('error') || titleStr.includes('failed') || titleStr.includes('unauthorized')) {
      return 'border-l-red-500';
    }
    
    // Warning notifications
    if (titleStr.includes('warning') || titleStr.includes('expired')) {
      return 'border-l-yellow-500';
    }
    
    // Default styling
    return 'border-l-blue-500';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`relative p-2 h-10 w-10 rounded-lg shadow-lg transition-all hover:shadow-xl ${
            unreadCount > 0 
              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
              : 'bg-background hover:bg-muted'
          }`}
        >
          <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-white' : 'text-foreground'}`} />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-2xl border rounded-lg z-50" align="end">
        <div className="flex items-center justify-between p-4 border-b bg-background rounded-t-lg">
          <div>
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {notifications.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {unreadCount > 0 ? `${unreadCount} new` : 'All caught up'}
              </p>
            )}
          </div>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/10 px-3 py-1.5 rounded-md"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bell className="h-8 w-8 text-gray-400" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">No notifications yet</h4>
              <p className="text-sm text-gray-500">
                You'll see location alerts and updates here
              </p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {notifications.map((notification) => {
                const borderLeftColor = notification.title.toLowerCase().includes('entering') || notification.title.toLowerCase().includes('exiting') ? 'border-l-green-500' : 
                  notification.title.toLowerCase().includes('error') || notification.title.toLowerCase().includes('failed') ? 'border-l-red-500' :
                  notification.title.toLowerCase().includes('warning') || notification.title.toLowerCase().includes('expired') ? 'border-l-yellow-500' : 'border-l-blue-500';
                
                const bgColor = notification.title.toLowerCase().includes('entering') || notification.title.toLowerCase().includes('exiting') ? 'bg-green-50 dark:bg-green-950/20' :
                  notification.title.toLowerCase().includes('error') || notification.title.toLowerCase().includes('failed') ? 'bg-red-50 dark:bg-red-950/20' :
                  notification.title.toLowerCase().includes('warning') || notification.title.toLowerCase().includes('expired') ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-blue-50 dark:bg-blue-950/20';

                return (
                <div
                  key={notification.id}
                  className={`relative flex w-full items-center justify-between overflow-hidden rounded-md border-l-4 ${borderLeftColor} ${bgColor} p-6 pr-8 shadow-lg transition-all cursor-pointer hover:shadow-xl ${
                    !notification.isRead 
                      ? 'border-2 border-l-4 border-blue-400 dark:border-blue-500 shadow-xl' 
                      : 'border border-l-4 border-gray-200 dark:border-gray-700 opacity-75 hover:opacity-90'
                  }`}
                  onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                >
                  {/* Red dot indicator for unread notifications */}
                  {!notification.isRead && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-sm animate-pulse z-10"></div>
                  )}
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Toast-style icon */}
                    <div className="flex-shrink-0">
                      {getToastIcon(notification.title, notification.type)}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      {/* Toast-style title */}
                      <div className={`text-sm font-semibold text-foreground ${
                        !notification.isRead ? 'font-bold text-blue-900 dark:text-blue-100' : ''
                      }`}>
                        {notification.title}
                      </div>
                      
                      {/* Toast-style description */}
                      <div className={`text-sm text-foreground ${
                        !notification.isRead 
                          ? 'opacity-95 font-medium text-blue-800 dark:text-blue-200' 
                          : 'opacity-90'
                      }`}>
                        {notification.message}
                      </div>
                      
                      {/* Time stamp */}
                      <div className={`text-xs text-foreground ${
                        !notification.isRead ? 'opacity-80' : 'opacity-70'
                      }`}>
                        {formatTime(notification.createdAt || new Date().toISOString())}
                      </div>
                    </div>
                  </div>
                  
                  {/* Toast-style close button (only for unread) */}
                  {!notification.isRead && (
                    <button
                      className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
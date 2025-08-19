import { useState } from "react";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

  // Get unread notification count for the red dot
  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000, // Check every 30 seconds
  });
  
  const unreadCount = unreadCountData?.count || 0;

  // Get notifications when the popover is opened
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: isOpen,
    refetchOnWindowFocus: false,
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

  const getNotificationIcon = (type: string) => {
    if (type.includes('geofence')) {
      return '📍';
    }
    if (type.includes('family')) {
      return '👥';
    }
    return '🔔';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative p-2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg border"
        >
          <Bell className="h-5 w-5 text-gray-700" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs font-bold rounded-full"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-xl border-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50">
          <div>
            <h3 className="font-bold text-base text-gray-900">Notifications</h3>
            {notifications.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {unreadCount > 0 ? `${unreadCount} new` : 'All caught up'}
              </p>
            )}
          </div>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-full"
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
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-all duration-200 ${
                    !notification.isRead 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-l-4 border-blue-400' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      !notification.isRead 
                        ? 'bg-blue-500 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <span className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-semibold text-sm truncate ${
                          !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 animate-pulse" />
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed mb-3 ${
                        !notification.isRead ? 'text-gray-800' : 'text-gray-600'
                      }`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-medium ${
                          !notification.isRead ? 'text-blue-600' : 'text-gray-400'
                        }`}>
                          {formatTime(notification.createdAt || new Date().toISOString())}
                        </p>
                        {!notification.isRead && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
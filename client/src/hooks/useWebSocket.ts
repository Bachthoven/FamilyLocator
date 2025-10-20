import { useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket() {
  const { user } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket opened, authenticating...");
      setIsConnected(true);
      // Authenticate the WebSocket connection
      if (ws.current) {
        const authMessage = {
          type: "auth",
          userId: (user as any)?.id,
        };
        console.log("Sending auth message:", authMessage);
        ws.current.send(JSON.stringify(authMessage));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("WebSocket message received:", message);

        // If it's a geofence message, try to show a system notification immediately
        if (
          message.type === "geofence" &&
          Notification.permission === "granted"
        ) {
          console.log(
            "Attempting to show system notification for geofence event"
          );
          // Import the helper dynamically to avoid circular dependency
          import("@/utils/notificationHelper")
            .then(({ showNotification }) => {
              showNotification(message.message, {
                body: "",
                icon: "/favicon.ico",
                tag: "geofence-notification",
                requireInteraction: false,
                vibrate: [200, 100, 200],
              }).then((success) => {
                if (success) {
                  console.log("Geofence notification shown successfully");
                } else {
                  console.error("Failed to show geofence notification");
                }
              });
            })
            .catch((error) => {
              console.error("Error loading notification helper:", error);
            });
        }

        setLastMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user]);

  const sendMessage = (message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log("Sending WebSocket message:", message);
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, cannot send message:", message);
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}

import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

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
      console.log('WebSocket opened, authenticating...');
      setIsConnected(true);
      // Authenticate the WebSocket connection
      if (ws.current) {
        const authMessage = {
          type: 'auth',
          userId: user.id,
        };
        console.log('Sending auth message:', authMessage);
        ws.current.send(JSON.stringify(authMessage));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        
        // If it's a geofence message, try to show a system notification immediately
        if (message.type === 'geofence' && Notification.permission === 'granted') {
          console.log('Attempting to show system notification for geofence event');
          try {
            const notification = new Notification(`Location Alert - ${message.placeName}`, {
              body: message.message,
              icon: '/favicon.ico',
              tag: 'geofence-notification',
              requireInteraction: false,
              silent: false,
            });
            console.log('System notification created successfully');
            setTimeout(() => notification.close(), 5000);
          } catch (notificationError) {
            console.error('Error creating system notification:', notificationError);
          }
        }
        
        setLastMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
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
      console.log('Sending WebSocket message:', message);
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}

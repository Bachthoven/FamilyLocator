import { useEffect, useRef, useState } from 'react';

interface UseWebSocketOptions {
  onMessage?: (event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = url.startsWith('ws')
          ? url
          : `${protocol}//${window.location.host}${url}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = (event) => {
          setIsConnected(true);
          options.onOpen?.(event);
        };

        ws.onmessage = (event) => {
          options.onMessage?.(event);
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          options.onClose?.(event);

          // Attempt to reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        };

        ws.onerror = (event) => {
          options.onError?.(event);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('WebSocket connection error:', error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  const send = (data: string | object) => {
    if (wsRef.current && isConnected) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
    }
  };

  return {
    isConnected,
    send,
  };
}

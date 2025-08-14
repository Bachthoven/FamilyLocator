import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, WifiOff } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/use-auth';

export function WebSocketTest() {
  const { isConnected, lastMessage, sendMessage } = useWebSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (lastMessage) {
      setMessages(prev => [...prev.slice(-4), lastMessage]); // Keep last 5 messages
    }
  }, [lastMessage]);

  const testConnection = () => {
    if (user && sendMessage) {
      sendMessage({ 
        type: 'test', 
        message: 'Testing WebSocket connection',
        timestamp: new Date().toISOString()
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          WebSocket Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm">
            <strong>Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}
          </p>
          <p className="text-sm">
            <strong>User ID:</strong> {user?.id || 'Not authenticated'}
          </p>
        </div>

        <Button 
          onClick={testConnection}
          disabled={!isConnected || !user}
          className="w-full"
        >
          Test Connection
        </Button>

        <div className="space-y-2">
          <p className="text-sm font-medium">Recent Messages:</p>
          <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs max-h-32 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500">No messages yet</p>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className="mb-1">
                  <strong>{msg.type}:</strong> {JSON.stringify(msg, null, 2)}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
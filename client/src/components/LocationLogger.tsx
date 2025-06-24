import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Square, Activity } from 'lucide-react';

interface LoggingSession {
  userId: string;
  lastLogTime: string;
  nextLogTime: string;
}

interface LoggingStatus {
  activeSessions: LoggingSession[];
}

export default function LocationLogger() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get logging status
  const { data: status, isLoading } = useQuery<LoggingStatus>({
    queryKey: ['/api/location-logging/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Start logging mutation
  const startLogging = useMutation({
    mutationFn: () => apiRequest('/api/location-logging/start', {
      method: 'POST',
    }),
    onSuccess: () => {
      toast({
        title: "Location Logging Started",
        description: "Your location will now be automatically logged every hour",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/location-logging/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start Logging",
        description: error.message || "Could not start automatic location logging",
        variant: "destructive",
      });
    },
  });

  // Stop logging mutation
  const stopLogging = useMutation({
    mutationFn: () => apiRequest('/api/location-logging/stop', {
      method: 'POST',
    }),
    onSuccess: () => {
      toast({
        title: "Location Logging Stopped",
        description: "Automatic hourly location logging has been disabled",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/location-logging/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Stop Logging",
        description: error.message || "Could not stop automatic location logging",
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  const isUserLoggingActive = status?.activeSessions?.some(session => session.userId === user.id);
  const userSession = status?.activeSessions?.find(session => session.userId === user.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Automatic Location Logging
        </CardTitle>
        <CardDescription>
          Automatically save your location every hour for location history tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={isUserLoggingActive ? "default" : "secondary"}>
              {isUserLoggingActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          
          {isUserLoggingActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => stopLogging.mutate()}
              disabled={stopLogging.isPending}
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Logging
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => startLogging.mutate()}
              disabled={startLogging.isPending || !user.locationHistoryEnabled}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Logging
            </Button>
          )}
        </div>

        {!user.locationHistoryEnabled && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Location history is disabled in your settings. Enable it to use automatic logging.
            </p>
          </div>
        )}

        {userSession && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Last logged:</span>
              <span>{new Date(userSession.lastLogTime).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Next log:</span>
              <span>{new Date(userSession.nextLogTime).toLocaleString()}</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center text-sm text-muted-foreground">
            Loading status...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
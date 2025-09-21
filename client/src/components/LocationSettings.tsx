import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Clock, Save } from 'lucide-react';

interface LocationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationSettings({ open, onOpenChange }: LocationSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [autoLocationEnabled, setAutoLocationEnabled] = useState(true);
  const [locationInterval, setLocationInterval] = useState('60'); // in minutes

  useEffect(() => {
    if (user && open) {
      // Initialize with user's current settings
      setAutoLocationEnabled(user.locationHistoryEnabled || true);
      // Get stored interval or default to 60 minutes
      const storedInterval = localStorage.getItem('autoLocationInterval') || '60';
      setLocationInterval(storedInterval);
    }
  }, [user, open]);

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Update user preferences
      await apiRequest('PUT', '/api/user/preferences', {
        locationHistoryEnabled: autoLocationEnabled,
      });

      // Store interval in localStorage for the location logger
      localStorage.setItem('autoLocationInterval', locationInterval);
      localStorage.setItem('autoLocationEnabled', autoLocationEnabled.toString());
      
      // Trigger page reload to restart location logging with new settings
      window.location.reload();

      toast({
        title: 'Settings saved',
        description: 'Location logging preferences updated successfully',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save location settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save location settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const intervalOptions = [
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '120', label: '2 hours' },
    { value: '240', label: '4 hours' },
    { value: '480', label: '8 hours' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Location Settings
          </DialogTitle>
          <DialogDescription>
            Configure automatic location logging and history preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Automatic Location Logging
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Enable auto-logging</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically save your location at regular intervals
                  </p>
                </div>
                <Switch
                  checked={autoLocationEnabled}
                  onCheckedChange={setAutoLocationEnabled}
                />
              </div>

              {autoLocationEnabled && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Logging interval</Label>
                  <Select value={locationInterval} onValueChange={setLocationInterval}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      {intervalOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How often to automatically record your location
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
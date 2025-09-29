import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { User } from '@shared/schema';

interface PrivacySettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export default function PrivacySettings({
  open,
  onOpenChange,
  user,
}: PrivacySettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState({
    locationSharingEnabled: user.locationSharingEnabled ?? true,
    locationHistoryEnabled: user.locationHistoryEnabled ?? true,
    notificationsEnabled: user.notificationsEnabled ?? true,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: typeof settings) => {
      const response = await apiRequest(
        'PATCH',
        '/api/user/settings',
        newSettings
      );
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['/api/auth/user'], updatedUser);
      toast({
        title: 'Settings updated',
        description: 'Your privacy settings have been saved successfully.',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Privacy Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Share Location</Label>
              <div className="text-sm text-muted-foreground">
                Allow family members to see your location
              </div>
            </div>
            <Switch
              checked={settings.locationSharingEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  locationSharingEnabled: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Location History</Label>
              <div className="text-sm text-muted-foreground">
                Save your location history for later reference
              </div>
            </div>
            <Switch
              checked={settings.locationHistoryEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  locationHistoryEnabled: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">
                Push Notifications
              </Label>
              <div className="text-sm text-muted-foreground">
                Get notified when family members share their location
              </div>
            </div>
            <Switch
              checked={settings.notificationsEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  notificationsEnabled: checked,
                }))
              }
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

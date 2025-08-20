import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import BottomNavigation from '@/components/BottomNavigation';
import { ProfileEditor } from '@/components/ProfileEditor';
import { NotificationSettingsCompact } from '@/components/NotificationSettingsCompact';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Settings as SettingsIcon, 
  User, 
  HelpCircle, 
  LogOut
} from 'lucide-react';

export default function Settings() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logoutMutation.mutate();
    }
  };

  const settingsItems = [
    {
      icon: User,
      label: 'Profile Information',
      description: 'Update your personal details',
      action: () => setProfileEditorOpen(true),
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      description: 'Get help and contact support',
      action: () => toast({ title: 'Support Contact', description: 'For support, contact: bachtoven.rules@gmail.com' }),
    },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-muted animate-pulse mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center mb-2">
            <SettingsIcon className="w-6 h-6 mr-2" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account and app preferences
          </p>
        </div>

        {/* User Profile Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage 
                  src={user.profileImageUrl || undefined} 
                  alt={`${user.firstName || user.email}'s profile`}
                />
                <AvatarFallback className="text-lg">
                  {user.firstName ? user.firstName[0].toUpperCase() : user.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <CardTitle className="text-xl">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user.firstName || user.email
                  }
                </CardTitle>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant={user.locationSharingEnabled ? "default" : "secondary"}>
                    {user.locationSharingEnabled ? "Location Sharing On" : "Location Sharing Off"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Profile Information</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfileEditor(true)}
              >
                Edit
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Notification Settings */}
        <NotificationSettingsCompact />

        {/* Settings Items */}
        <div className="space-y-4">
          {settingsItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="hover:shadow-md transition-shadow cursor-pointer" onClick={item.action}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                    <div className="text-muted-foreground">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Logout Button */}
        <div className="mt-8">
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>

        {/* App Info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>FamilyLocator v1.0.0</p>
          <p className="mt-1">Stay connected, stay safe</p>
        </div>
      </div>

      {/* Profile Editor Modal */}
      {user && (
        <ProfileEditor
          open={profileEditorOpen}
          onOpenChange={setProfileEditorOpen}
          user={user}
        />
      )}

      <BottomNavigation />
    </div>
  );
}

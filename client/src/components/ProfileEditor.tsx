import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ObjectUploader } from './ObjectUploader';
import type { UploadResult } from '@uppy/core';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Camera, Save, X } from 'lucide-react';

interface ProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: number;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
  };
}

export function ProfileEditor({ open, onOpenChange, user }: ProfileEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [profileImageUrl, setProfileImageUrl] = useState(user.profileImageUrl);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', '/api/user/profile', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest('POST', '/api/objects/upload');
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const uploadUrl = result.successful[0].uploadURL;
      
      try {
        // Set the profile image ACL policy
        const response = await apiRequest('PUT', '/api/profile-image', {
          profileImageURL: uploadUrl
        });
        
        const data = await response.json();
        setProfileImageUrl(data.objectPath);
        
        toast({
          title: "Image Uploaded",
          description: "Profile image uploaded successfully!",
        });
      } catch (error: any) {
        toast({
          title: "Upload Failed",
          description: error.message || "Failed to process uploaded image.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords if changing password
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        toast({
          title: "Current Password Required",
          description: "Please enter your current password to change it.",
          variant: "destructive",
        });
        return;
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "New password and confirmation don't match.",
          variant: "destructive",
        });
        return;
      }
      
      if (formData.newPassword.length < 6) {
        toast({
          title: "Password Too Short",
          description: "Password must be at least 6 characters long.",
          variant: "destructive",
        });
        return;
      }
    }

    const updateData: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
    };

    if (profileImageUrl !== user.profileImageUrl) {
      updateData.profileImageUrl = profileImageUrl;
    }

    if (formData.newPassword) {
      updateData.currentPassword = formData.currentPassword;
      updateData.newPassword = formData.newPassword;
    }

    updateProfileMutation.mutate(updateData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update your profile information, upload a new profile picture, or change your password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarImage 
                src={profileImageUrl || undefined} 
                alt="Profile picture"
              />
              <AvatarFallback className="text-2xl">
                {formData.firstName ? formData.firstName[0].toUpperCase() : formData.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={5242880} // 5MB
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="bg-blue-500 hover:bg-blue-600"
            >
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <span>Upload New Picture</span>
              </div>
            </ObjectUploader>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email"
            />
          </div>

          {/* Password Fields */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-sm font-medium">Change Password (Optional)</h4>
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateProfileMutation.isPending}
              className="order-2 sm:order-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="order-1 sm:order-2"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
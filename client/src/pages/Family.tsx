import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import FamilyMemberCard from '@/components/FamilyMemberCard';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users, Check, X, Mail } from 'lucide-react';
import { User } from '@shared/schema';

export default function Family() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  // Fetch family members
  const { data: familyMembers = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/family'],
    enabled: !!user,
  });

  // Fetch pending invitations
  const { data: pendingInvitations = [] } = useQuery<Array<{ id: number; user: User; createdAt: Date }>>({
    queryKey: ['/api/family/invitations'],
    enabled: !!user,
  });

  // Fetch family locations for status
  const { data: familyLocations = [] } = useQuery<Array<{ user: User; latitude: number; longitude: number; timestamp: Date | null; }>>({
    queryKey: ['/api/locations/family'],
    enabled: !!user,
  });

  // Invite family member mutation
  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/family/invite', { email });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send invitation');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "Family member invitation has been sent successfully.",
      });
      setInviteDialogOpen(false);
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['/api/family'] });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      
      // Handle specific error messages from server
      let errorMessage = "Failed to send invitation. Please try again.";
      if (error?.message) {
        if (error.message.includes("User not found")) {
          errorMessage = `The person with that email hasn't signed up for FamilyLocator yet. Please ask them to create an account first, then try inviting them again.`;
        } else if (error.message.includes("already in your family")) {
          errorMessage = "This person is already in your family.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Cannot Send Invitation",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async (inviterId: string) => {
      await apiRequest('POST', `/api/family/accept/${inviterId}`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation accepted",
        description: "You have joined the family successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/family'] });
      queryClient.invalidateQueries({ queryKey: ['/api/family/invitations'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to accept invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Remove family member mutation
  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest('DELETE', `/api/family/${memberId}`);
    },
    onSuccess: () => {
      toast({
        title: "Member removed",
        description: "Family member has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/family'] });
      queryClient.invalidateQueries({ queryKey: ['/api/locations/family'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to remove family member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }
    inviteMutation.mutate(inviteEmail.trim());
  };

  const handleRemove = (memberId: string) => {
    if (confirm('Are you sure you want to remove this family member?')) {
      removeMutation.mutate(memberId);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Users className="w-6 h-6 mr-2" />
              Family Members
            </h1>
            <p className="text-muted-foreground">
              Manage your family connections and location sharing
            </p>
          </div>
          
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Family Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter family member's email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg mt-2">
                    <strong>Important:</strong> The person you're inviting must already have a FamilyLocator account. 
                    <br /><br />
                    <strong>How to help them sign up:</strong>
                    <br />1. Send them this website link: <code className="text-xs">{window.location.origin}</code>
                    <br />2. Ask them to click "Create Your Free Account" 
                    <br />3. Once they have an account, you can invite them here
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInvite}
                    disabled={inviteMutation.isPending}
                  >
                    {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Family Members List */}
        <div className="space-y-4">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-4 bg-card rounded-xl border">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="w-32 h-4 mb-2" />
                  <Skeleton className="w-24 h-3" />
                </div>
                <Skeleton className="w-16 h-8" />
              </div>
            ))
          ) : familyMembers.length === 0 ? (
            <div className="space-y-6">
              {/* Pending Invitations Section */}
              {pendingInvitations.length > 0 && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="flex items-center gap-2 text-lg font-medium mb-3">
                    <Mail className="h-5 w-5 text-primary" />
                    Pending Invitations ({pendingInvitations.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingInvitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between bg-background p-3 rounded border">
                        <div className="flex items-center gap-3">
                          <img
                            src={invitation.user.profileImageUrl || '/default-avatar.png'}
                            alt={invitation.user.firstName || 'User'}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium">
                              {invitation.user.firstName} {invitation.user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {invitation.user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => acceptMutation.mutate(invitation.user.id)}
                            disabled={acceptMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeMutation.mutate(invitation.user.id)}
                            disabled={removeMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No family members yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start by inviting your family members to join FamilyLocator
                </p>
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Member
                </Button>
              </div>
            </div>
          ) : (
            familyMembers.map((member: User) => {
              const locationData = familyLocations.find((loc: any) => loc.user?.id === member.id);
              // Transform location data to match expected format
              const location = locationData ? {
                id: locationData.id || 0,
                userId: member.id,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                accuracy: locationData.accuracy || null,
                address: locationData.address || null,
                type: locationData.type || 'manual',
                timestamp: locationData.timestamp || null,
              } : undefined;
              
              return (
                <FamilyMemberCard
                  key={member.id}
                  user={member}
                  location={location}
                  onRemove={() => handleRemove(member.id)}
                />
              );
            })
          )}
        </div>

        {/* Statistics */}
        {familyMembers.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-card p-4 rounded-xl border text-center">
              <div className="text-2xl font-bold text-primary">{familyMembers.length}</div>
              <div className="text-sm text-muted-foreground">Total Members</div>
            </div>
            <div className="bg-card p-4 rounded-xl border text-center">
              <div className="text-2xl font-bold text-green-500">{familyLocations.length}</div>
              <div className="text-sm text-muted-foreground">Online Now</div>
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}

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
import { Plus, Users } from 'lucide-react';
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

  // Fetch family locations for status
  const { data: familyLocations = [] } = useQuery<Array<{ user: User; latitude: number; longitude: number; timestamp: Date | null; }>>({
    queryKey: ['/api/locations/family'],
    enabled: !!user,
  });

  // Invite family member mutation
  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/family/invite', { email });
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
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
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
          window.location.href = "/api/login";
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
          ) : (
            familyMembers.map((member: User) => {
              const location = familyLocations.find((loc: any) => loc.userId === member.id);
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

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
import { Plus, Users, Copy, QrCode, KeyRound } from 'lucide-react';
import { User, InvitationCode } from '@shared/schema';

export default function Family() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  // Fetch family members
  const { data: familyMembers = [], isLoading: familyLoading, error: familyError } = useQuery<User[]>({
    queryKey: ['/api/family'],
    enabled: !!user,
    retry: 1,
  });

  // Fetch invitation codes
  const { data: invitationCodes = [], isLoading: codesLoading, error: codesError } = useQuery<InvitationCode[]>({
    queryKey: ['/api/family/codes'],
    enabled: !!user,
    retry: 1,
  });

  // Debug logging
  console.log('Family component state:', {
    user: !!user,
    familyMembers: familyMembers.length,
    invitationCodes: invitationCodes.length,
    familyLoading,
    codesLoading,
    familyError,
    codesError
  });

  // Fetch family locations for status
  const { data: familyLocations = [] } = useQuery<Array<{ user: User; latitude: number; longitude: number; timestamp: Date | null; }>>({
    queryKey: ['/api/locations/family'],
    enabled: !!user,
  });

  // Generate invitation code mutation
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/family/generate-code');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate invitation code');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedCode(data.code);
      setCodeDialogOpen(true);
      queryClient.invalidateQueries({ queryKey: ['/api/family/codes'] });
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
      
      toast({
        title: "Error",
        description: "Failed to generate invitation code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Join family mutation
  const joinFamilyMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/family/join', { code });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join family');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You have successfully joined the family.",
      });
      setJoinDialogOpen(false);
      setJoinCode('');
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
      
      toast({
        title: "Error",
        description: error.message || "Failed to join family. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast({
        title: "Copied!",
        description: "Invitation code copied to clipboard.",
      });
    });
  };



  const formatExpiration = (expiresAt: Date) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const hoursLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursLeft <= 0) return "Expired";
    if (hoursLeft === 1) return "Expires in 1 hour";
    return `Expires in ${hoursLeft} hours`;
  };

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
          
          <div className="flex gap-2">
            <Button onClick={() => generateCodeMutation.mutate()} className="gap-2">
              <QrCode className="w-4 h-4" />
              Generate Code
            </Button>
            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <KeyRound className="w-4 h-4" />
                  Join Family
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5" />
                    Join Family with Code
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Invitation Code</Label>
                    <Input
                      id="code"
                      placeholder="Enter 6-character code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setJoinDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => joinFamilyMutation.mutate(joinCode)}
                      disabled={joinCode.length !== 6 || joinFamilyMutation.isPending}
                    >
                      {joinFamilyMutation.isPending ? "Joining..." : "Join Family"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Invitation Codes Section */}
        {invitationCodes.length > 0 && (
          <div className="bg-card rounded-xl border p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Your Invitation Codes
            </h2>
            <div className="space-y-2">
              {invitationCodes.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between bg-background p-3 rounded-lg border">
                  <div>
                    <div className="font-mono text-lg font-bold text-primary">
                      {invitation.code}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatExpiration(invitation.expiresAt)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(invitation.code)}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Family Members List */}
        <div className="space-y-4">
          {familyLoading ? (
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
                Generate an invitation code to invite family members, or join using someone else's code.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => generateCodeMutation.mutate()} className="gap-2">
                  <QrCode className="w-4 h-4" />
                  Generate Code
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setJoinDialogOpen(true)}
                  className="gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  Join Family
                </Button>
              </div>
            </div>
          ) : (
            familyMembers.map((member: User) => {
              const locationData = familyLocations.find((loc: any) => loc.user?.id === member.id);
              // Transform location data to match expected format
              const location = locationData ? {
                id: 0,
                userId: member.id,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                accuracy: null,
                address: null,
                type: 'manual' as const,
                timestamp: locationData.timestamp || null,
              } : undefined;
              
              return (
                <FamilyMemberCard
                  key={member.id}
                  user={member}
                  location={location}
                  onRemove={() => handleRemove(member.id.toString())}
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

        {/* Generated Code Dialog */}
        <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Invitation Code Generated
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="bg-primary/10 p-6 rounded-lg border-2 border-dashed border-primary/20">
                <div className="text-3xl font-mono font-bold text-center tracking-wider text-primary">
                  {generatedCode}
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Share this code with family members. It expires in 24 hours.
              </p>
              <div className="flex gap-2 w-full">
                <Button
                  onClick={() => copyToClipboard(generatedCode)}
                  className="flex-1 gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Code
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCodeDialogOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Join Family Dialog */}
        <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Join Family
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="join-code">Invitation Code</Label>
                <Input
                  id="join-code"
                  placeholder="Enter 6-character code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="font-mono text-center text-lg tracking-wider"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => joinFamilyMutation.mutate(joinCode)}
                  disabled={joinCode.length !== 6 || joinFamilyMutation.isPending}
                  className="flex-1"
                >
                  {joinFamilyMutation.isPending ? "Joining..." : "Join Family"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setJoinDialogOpen(false);
                    setJoinCode('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <BottomNavigation />
    </div>
  );
}

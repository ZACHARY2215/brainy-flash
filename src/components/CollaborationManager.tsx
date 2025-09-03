import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Edit3, 
  Trash2,
  Crown,
  Eye,
  Edit
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Collaborator {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  permission: 'viewer' | 'editor' | 'owner';
  created_at: string;
}

interface CollaborationManagerProps {
  setId: string;
  isOwner: boolean;
}

const CollaborationManager = ({ setId, isOwner }: CollaborationManagerProps) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPermission, setNewPermission] = useState<'viewer' | 'editor'>('viewer');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOwner) {
      fetchCollaborators();
    }
  }, [setId, isOwner]);

  const fetchCollaborators = async () => {
    try {
      setLoading(true);
      // This would call your backend API
      // const response = await fetch(`/api/sharing/${setId}/collaborators`);
      // const data = await response.json();
      // setCollaborators(data);
      
      // For now, show placeholder data
      setCollaborators([]);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      toast({
        title: "Error",
        description: "Failed to load collaborators",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addCollaborator = async () => {
    if (!newEmail.trim()) return;
    
    try {
      setIsAdding(true);
      // This would call your backend API
      // const response = await fetch(`/api/sharing/${setId}/collaborators`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ user_email: newEmail, permission: newPermission })
      // });
      
      // For now, just show a success message
      toast({
        title: "Success",
        description: `Added ${newEmail} as ${newPermission}`,
      });
      
      setNewEmail('');
      setNewPermission('viewer');
      // fetchCollaborators(); // Refresh the list
    } catch (error) {
      console.error('Error adding collaborator:', error);
      toast({
        title: "Error",
        description: "Failed to add collaborator",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const updatePermission = async (collaboratorId: string, permission: 'viewer' | 'editor' | 'owner') => {
    try {
      // This would call your backend API
      // const response = await fetch(`/api/sharing/${setId}/collaborators/${collaboratorId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ permission })
      // });
      
      toast({
        title: "Success",
        description: "Permission updated successfully",
      });
      
      // fetchCollaborators(); // Refresh the list
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive"
      });
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) return;
    
    try {
      // This would call your backend API
      // const response = await fetch(`/api/sharing/${setId}/collaborators/${collaboratorId}`, {
      //   method: 'DELETE'
      // });
      
      toast({
        title: "Success",
        description: "Collaborator removed successfully",
      });
      
      // fetchCollaborators(); // Refresh the list
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast({
        title: "Error",
        description: "Failed to remove collaborator",
        variant: "destructive"
      });
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'editor':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'owner':
        return 'Owner';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Viewer';
      default:
        return 'Viewer';
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Collaboration
        </CardTitle>
        <CardDescription>
          Manage who can view and edit this flashcard set
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Collaborator */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Collaborator
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Collaborator</DialogTitle>
              <DialogDescription>
                Invite someone to collaborate on this flashcard set
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="collaborator@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="permission">Permission Level</Label>
                <Select value={newPermission} onValueChange={(value: 'viewer' | 'editor') => setNewPermission(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Viewer - Can view and study
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                        Editor - Can view, study, and edit
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={addCollaborator} 
                disabled={isAdding || !newEmail.trim()}
                className="w-full"
              >
                {isAdding ? 'Adding...' : 'Add Collaborator'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Collaborators List */}
        <div className="space-y-3">
          <h4 className="font-medium">Current Collaborators</h4>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading collaborators...
            </div>
          ) : collaborators.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No collaborators yet
            </div>
          ) : (
            collaborators.map((collaborator) => (
              <div key={collaborator.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getPermissionIcon(collaborator.permission)}
                  <div>
                    <div className="font-medium">{collaborator.full_name || collaborator.username}</div>
                    <div className="text-sm text-muted-foreground">{collaborator.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {getPermissionLabel(collaborator.permission)}
                  </Badge>
                  {collaborator.permission !== 'owner' && (
                    <>
                      <Select
                        value={collaborator.permission}
                        onValueChange={(value: 'viewer' | 'editor') => 
                          updatePermission(collaborator.id, value)
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCollaborator(collaborator.id)}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CollaborationManager;

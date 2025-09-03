import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Trash2, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface Collaborator {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  permission: 'viewer' | 'editor' | 'owner';
  created_at: string;
}

interface CollaborationManagerProps {
  setId: string;
  currentUserPermission: 'owner' | 'editor' | 'viewer';
}

const CollaborationManager: React.FC<CollaborationManagerProps> = ({
  setId,
  currentUserPermission
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'viewer' | 'editor'>('viewer');

  const fetchCollaborators = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sets/${setId}/collaborators`);
      if (response.ok) {
        const data = await response.json();
        setCollaborators(data);
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollaborators();
  }, [setId]);

  const addCollaborator = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      const response = await fetch(`/api/sets/${setId}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          permission
        })
      });

      if (response.ok) {
        toast.success('Collaborator added successfully');
        setEmail('');
        fetchCollaborators();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add collaborator');
      }
    } catch (error) {
      console.error('Error adding collaborator:', error);
      toast.error('Failed to add collaborator');
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    try {
      const response = await fetch(`/api/sets/${setId}/collaborators/${collaboratorId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Collaborator removed');
        fetchCollaborators();
      } else {
        toast.error('Failed to remove collaborator');
      }
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  const updatePermission = async (collaboratorId: string, newPermission: string) => {
    try {
      const response = await fetch(`/api/sets/${setId}/collaborators/${collaboratorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permission: newPermission })
      });

      if (response.ok) {
        toast.success('Permission updated');
        fetchCollaborators();
      } else {
        toast.error('Failed to update permission');
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Failed to update permission');
    }
  };

  if (currentUserPermission === 'viewer') {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Collaboration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Collaborator */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Select value={permission} onValueChange={(value: 'viewer' | 'editor') => setPermission(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addCollaborator} disabled={loading}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Collaborators List */}
        <div className="space-y-2">
          {collaborators.map((collaborator) => (
            <div key={collaborator.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{collaborator.full_name || collaborator.username}</p>
                  <p className="text-sm text-muted-foreground">{collaborator.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentUserPermission === 'owner' && collaborator.permission !== 'owner' && (
                  <Select
                    value={collaborator.permission}
                    onValueChange={(value) => updatePermission(collaborator.id, value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Badge variant={collaborator.permission === 'owner' ? 'default' : 'secondary'}>
                  {collaborator.permission}
                </Badge>
                {currentUserPermission === 'owner' && collaborator.permission !== 'owner' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCollaborator(collaborator.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CollaborationManager;
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Trash2, Mail, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'viewer' | 'editor'>('viewer');

  const fetchCollaborators = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('set_id', setId);

      if (error) throw error;
      
      // Fetch profile data separately for each collaborator
      const formattedData = await Promise.all((data || []).map(async (collab) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, full_name')
          .eq('user_id', collab.user_id)
          .single();
        
        return {
          id: collab.id,
          user_id: collab.user_id,
          username: profile?.username || 'Unknown',
          full_name: profile?.full_name || 'Unknown User',
          permission: collab.permission as 'viewer' | 'editor' | 'owner',
          created_at: collab.created_at
        };
      }));
      
      setCollaborators(formattedData);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      toast.error('Failed to fetch collaborators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserPermission !== 'viewer') {
      fetchCollaborators();
    }
  }, [setId, currentUserPermission]);

  const addCollaborator = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      // First find the user by email in profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('username', `%${email.trim()}%`)
        .limit(1);

      if (profileError) throw profileError;
      
      if (!profiles || profiles.length === 0) {
        toast.error('User not found. They may need to sign up first.');
        return;
      }

      const { error } = await supabase
        .from('collaborators')
        .insert({
          set_id: setId,
          user_id: profiles[0].user_id,
          permission
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast.error('User is already a collaborator');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Collaborator added successfully');
      setEmail('');
      fetchCollaborators();
    } catch (error) {
      console.error('Error adding collaborator:', error);
      toast.error('Failed to add collaborator');
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    try {
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;

      toast.success('Collaborator removed');
      fetchCollaborators();
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  const updatePermission = async (collaboratorId: string, newPermission: string) => {
    try {
      const { error } = await supabase
        .from('collaborators')
        .update({ permission: newPermission })
        .eq('id', collaboratorId);

      if (error) throw error;

      toast.success('Permission updated');
      fetchCollaborators();
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
        {currentUserPermission === 'owner' && (
          <div className="flex gap-2">
            <Input
              placeholder="Enter username or email"
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
        )}

        {/* Collaborators List */}
        <div className="space-y-2">
          {collaborators.map((collaborator) => (
            <div key={collaborator.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{collaborator.full_name}</p>
                  <p className="text-sm text-muted-foreground">@{collaborator.username}</p>
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

        {collaborators.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No collaborators yet</p>
            {currentUserPermission === 'owner' && (
              <p className="text-sm">Add collaborators to share editing access</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CollaborationManager;
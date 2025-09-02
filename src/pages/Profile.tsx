import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User, Mail, Settings, ArrowLeft } from "lucide-react";


interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut, updateProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
  });

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        if (data) {
          setProfile(data);
          setFormData({
            username: data.username || "",
            full_name: data.full_name || "",
          });
        } else {
          // Create profile if it doesn't exist
          const newProfile = {
            user_id: user.id,
            username: user.user_metadata?.username || "",
            full_name: user.user_metadata?.full_name || "",
          };

          const { data: insertedProfile, error: insertError } = await supabase
            .from("profiles")
            .insert(newProfile)
            .select()
            .single();

          if (insertError) throw insertError;

          setProfile(insertedProfile);
          setFormData({
            username: insertedProfile.username || "",
            full_name: insertedProfile.full_name || "",
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSaving(true);
    try {
      // Update profile in database
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: formData.username,
          full_name: formData.full_name,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Update auth user metadata
      const { error: authError } = await updateProfile({
        username: formData.username,
        full_name: formData.full_name,
      });

      if (authError) throw authError;

      setProfile({
        ...profile,
        username: formData.username,
        full_name: formData.full_name,
      });

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back to Dashboard Button */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {profile?.full_name || "User"}
                  </h3>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {user?.email}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Username</label>
                  <Input
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    placeholder="Enter your username"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
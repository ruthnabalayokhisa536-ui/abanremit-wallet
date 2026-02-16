import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PinInput from "@/components/PinInput";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { useProfile } from "@/hooks/use-profile";
import { useWallet } from "@/hooks/use-wallet";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ProfilePage = () => {
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { profile } = useProfile();
  const { wallet } = useWallet();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        email: profile.email || user?.email || "",
      });
    }
  }, [profile, user]);

  const validateFormData = (data: typeof formData): { valid: boolean; error?: string } => {
    if (!data.full_name.trim()) {
      return { valid: false, error: "Full name is required" };
    }
    
    if (!data.phone.trim()) {
      return { valid: false, error: "Phone number is required" };
    }
    
    return { valid: true };
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    // Validate form data
    const validation = validateFormData(formData);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
        })
        .eq("user_id", user.id);

      if (error) {
        // Log detailed error for debugging
        console.error("Profile update error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        
        // Handle specific error types
        if (error.message.includes("network") || error.message.includes("fetch")) {
          throw new Error("Failed to update profile. Please check your connection and try again.");
        } else if (error.code === "23505") {
          // Unique constraint violation
          throw new Error("This phone number or email is already in use.");
        } else if (error.code === "42501") {
          // Permission denied
          throw new Error("You don't have permission to update this profile.");
        } else {
          throw error;
        }
      }

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      
      // Display user-friendly error message
      const errorMessage = error.message || "Failed to update profile. Please try again.";
      toast.error(errorMessage);
      
      // Keep form in edit mode and preserve user input
      // (formData is already preserved, just don't exit edit mode)
    } finally {
      // Always clear loading state to re-enable buttons
      setSaving(false);
    }
  };

  if (showPinSetup) {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto">
          <PinInput
            title="Create Transaction PIN"
            onSubmit={() => { setPinSet(true); setShowPinSetup(false); }}
            onCancel={() => setShowPinSetup(false)}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Profile & Settings</h2>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>

        {/* Profile Photo Section */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Profile Photo</h3>
          {user?.id && (
            <ProfilePhotoUpload
              currentPhotoUrl={profile?.profile_photo_url}
              userId={user.id}
              userName={profile?.full_name || undefined}
            />
          )}
        </Card>

        {/* Profile Information */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="254712345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveProfile} disabled={saving} className="flex-1">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    if (profile) {
                      setFormData({
                        full_name: profile.full_name || "",
                        phone: profile.phone || "",
                        email: profile.email || user?.email || "",
                      });
                    }
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-foreground font-medium">{profile?.full_name || "Not set"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                <p className="text-foreground font-medium">{profile?.phone || "Not set"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-foreground font-medium">{profile?.email || user?.email || "Not set"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Wallet Number</label>
                <p className="text-foreground font-mono text-sm">{wallet?.wallet_number || wallet?.wallet_id || "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">KYC Status</label>
                <div className="mt-1">
                  <Badge variant={profile?.kyc_status === "approved" ? "default" : profile?.kyc_status === "pending" ? "secondary" : "destructive"} className="capitalize">
                    {profile?.kyc_status || "Not Started"}
                  </Badge>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Transaction PIN */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Transaction PIN</h3>
          {pinSet ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-success font-medium">✓ PIN has been set</span>
              <Button variant="outline" size="sm" onClick={() => setShowPinSetup(true)}>Change PIN</Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">Set a 4-digit PIN for transactions.</p>
              <Button onClick={() => setShowPinSetup(true)}>Create PIN</Button>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;

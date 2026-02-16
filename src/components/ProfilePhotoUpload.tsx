import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string | null;
  userId: string;
  userName?: string;
  onUploadComplete?: (url: string) => void;
}

export function ProfilePhotoUpload({
  currentPhotoUrl,
  userId,
  userName,
  onUploadComplete,
}: ProfilePhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 200; // Target size
          canvas.width = size;
          canvas.height = size;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          // Calculate crop dimensions for square
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          // Draw cropped and resized image
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Could not create blob"));
              }
            },
            "image/jpeg",
            0.9
          );
        };
        img.onerror = () => reject(new Error("Could not load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      // Resize image
      const resizedBlob = await resizeImage(file);

      // Create file name
      const fileExt = "jpg";
      const fileName = `${userId}/avatar.${fileExt}`;

      // Delete old photo if exists
      if (currentPhotoUrl) {
        const oldPath = currentPhotoUrl.split("/").slice(-2).join("/");
        await supabase.storage.from("profile-photos").remove([oldPath]);
      }

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, resizedBlob, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(fileName);

      // Update profile in database
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_photo_url: publicUrl })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
      toast.success("Profile photo updated successfully!");
      
      if (onUploadComplete) {
        onUploadComplete(publicUrl);
      }
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentPhotoUrl) return;

    setUploading(true);
    try {
      // Delete from storage
      const oldPath = currentPhotoUrl.split("/").slice(-2).join("/");
      await supabase.storage.from("profile-photos").remove([oldPath]);

      // Update profile in database
      const { error } = await supabase
        .from("profiles")
        .update({ profile_photo_url: null })
        .eq("user_id", userId);

      if (error) throw error;

      setPreviewUrl(null);
      toast.success("Profile photo removed");
      
      if (onUploadComplete) {
        onUploadComplete("");
      }
    } catch (error: any) {
      console.error("Error removing photo:", error);
      toast.error(error.message || "Failed to remove photo");
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    if (!userName) return "U";
    return userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="w-32 h-32">
          <AvatarImage src={previewUrl || undefined} alt={userName || "User"} />
          <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
        </Avatar>
        
        {previewUrl && !uploading && (
          <button
            onClick={handleRemovePhoto}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
            title="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        variant="outline"
        size="sm"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Camera className="w-4 h-4 mr-2" />
            {previewUrl ? "Change Photo" : "Upload Photo"}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG or GIF. Max 5MB.
        <br />
        Image will be cropped to square.
      </p>
    </div>
  );
}

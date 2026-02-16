import { supabase } from "@/integrations/supabase/client";

export interface KYCDocument {
  id?: string;
  user_id: string;
  document_type: "id_card" | "passport" | "driving_license" | "business_license";
  file_path: string;
  file_url?: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  uploaded_at?: string;
}

export interface KYCUploadResponse {
  success: boolean;
  message: string;
  fileUrl?: string;
  error?: string;
}

/**
 * KYC Service - Handles KYC document uploads and verification
 * Supports ID cards, passports, driving licenses, and business licenses
 */
export const kycService = {
  /**
   * Upload a KYC document to Supabase Storage
   */
  async uploadDocument(
    userId: string,
    file: File,
    documentType: KYCDocument["document_type"]
  ): Promise<KYCUploadResponse> {
    try {
      // Validate file
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return {
          success: false,
          message: "File size exceeds 5MB limit",
          error: "FILE_TOO_LARGE",
        };
      }

      const validMimes = ["image/jpeg", "image/png", "application/pdf"];
      if (!validMimes.includes(file.type)) {
        return {
          success: false,
          message: "Only JPEG, PNG, and PDF files are allowed",
          error: "INVALID_FILE_TYPE",
        };
      }

      // Generate file path
      const timestamp = Date.now();
      const fileName = `${userId}/${documentType}/${timestamp}.${file.name.split(".").pop()}`;

      // Upload to storage
      const { data, error } = await supabase.storage
        .from("kyc_documents")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        return {
          success: false,
          message: "Failed to upload document",
          error: error.message,
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("kyc_documents")
        .getPublicUrl(fileName);

      // Create KYC document record
      const { error: dbError } = await supabase
        .from("kyc_documents")
        .insert({
          user_id: userId,
          document_type: documentType,
          file_path: data.path,
          file_url: urlData.publicUrl,
          status: "pending",
        });

      if (dbError) {
        return {
          success: false,
          message: "Failed to save document record",
          error: dbError.message,
        };
      }

      // Update profile KYC status to pending_review
      await supabase
        .from("profiles")
        .update({ kyc_status: "pending" })
        .eq("user_id", userId);

      return {
        success: true,
        message: "Document uploaded successfully. Awaiting verification.",
        fileUrl: urlData.publicUrl,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "An error occurred during upload",
        error: error.message,
      };
    }
  },

  /**
   * Get KYC documents for a user
   */
  async getUserDocuments(userId: string): Promise<KYCDocument[]> {
    const { data, error } = await supabase
      .from("kyc_documents")
      .select("*")
      .eq("user_id", userId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error fetching KYC documents:", error);
      return [];
    }

    return (data || []) as KYCDocument[];
  },

  /**
   * Get KYC document by ID
   */
  async getDocument(documentId: string): Promise<KYCDocument | null> {
    const { data, error } = await (supabase
      .from("kyc_documents") as any)
      .select("*")
      .eq("id", documentId)
      .single();

    if (error) {
      console.error("Error fetching KYC document:", error);
      return null;
    }

    return data as KYCDocument;
  },

  /**
   * Delete a KYC document
   */
  async deleteDocument(documentId: string, filePath: string): Promise<boolean> {
    try {
      // Delete from storage
      await supabase.storage.from("kyc_documents").remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from("kyc_documents")
        .delete()
        .eq("id", documentId);

      return !error;
    } catch (error) {
      console.error("Error deleting document:", error);
      return false;
    }
  },

  /**
   * Get KYC status for current user
   */
  async getKYCStatus(userId: string): Promise<string> {
    const { data, error } = await supabase
      .from("profiles")
      .select("kyc_status")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching KYC status:", error);
      return "pending";
    }

    return data?.kyc_status || "pending";
  },

  /**
   * Check if KYC is required for transactions
   */
  async isKYCRequired(): Promise<boolean> {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "kyc_required")
      .single();

    if (error) {
      return true; // Default to true if not found
    }

    return data?.value === "true" || data?.value === true;
  },

  /**
   * Submit KYC for verification
   */
  async submitForVerification(userId: string): Promise<KYCUploadResponse> {
    try {
      // Check if user has any documents
      const documents = await kycService.getUserDocuments(userId);

      if (documents.length === 0) {
        return {
          success: false,
          message: "Please upload at least one document before submission",
          error: "NO_DOCUMENTS",
        };
      }

      // Update profile status to under_review
      const { error } = await supabase
        .from("profiles")
        .update({ kyc_status: "pending" })
        .eq("user_id", userId);

      if (error) {
        return {
          success: false,
          message: "Failed to submit KYC for verification",
          error: error.message,
        };
      }

      return {
        success: true,
        message: "KYC submitted successfully. We will review and notify you soon.",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "An error occurred during submission",
        error: error.message,
      };
    }
  },
};

export default kycService;

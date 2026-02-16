import React, { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, AlertCircle, CheckCircle2, X } from "lucide-react";
import { kycService, KYCDocument } from "@/services/kyc.service";
import { toast } from "sonner";

interface KYCUploadProps {
  userId: string;
  onUploadSuccess?: (document: KYCDocument) => void;
  maxFiles?: number;
}

const documentTypes = [
  { value: "id_card", label: "National ID Card", accept: "image/jpeg, image/png, application/pdf" },
  { value: "passport", label: "Passport", accept: "image/jpeg, image/png, application/pdf" },
  { value: "driving_license", label: "Driving License", accept: "image/jpeg, image/png, application/pdf" },
  { value: "business_license", label: "Business License", accept: "image/jpeg, image/png, application/pdf" },
] as const;

const KYCUpload: React.FC<KYCUploadProps> = ({ userId, onUploadSuccess, maxFiles = 4 }) => {
  const [selectedType, setSelectedType] = useState<KYCDocument["document_type"]>("id_card");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<KYCDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load uploaded documents on mount
  React.useEffect(() => {
    const loadDocuments = async () => {
      setLoadingDocs(true);
      const docs = await kycService.getUserDocuments(userId);
      setUploadedDocuments(docs);
      setLoadingDocs(false);
    };
    loadDocuments();
  }, [userId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setFile(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    try {
      const result = await kycService.uploadDocument(userId, file, selectedType);

      if (result.success) {
        toast.success(result.message);

        // Reload documents
        const docs = await kycService.getUserDocuments(userId);
        setUploadedDocuments(docs);

        // Reset form
        setFile(null);
        setPreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        // Callback
        if (onUploadSuccess && docs.length > 0) {
          onUploadSuccess(docs[docs.length - 1]);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, filePath: string) => {
    const success = await kycService.deleteDocument(docId, filePath);
    if (success) {
      toast.success("Document deleted");
      const docs = await kycService.getUserDocuments(userId);
      setUploadedDocuments(docs);
    } else {
      toast.error("Failed to delete document");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-600";
      case "rejected":
        return "text-red-600";
      case "pending":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Upload KYC Document</h3>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Document Type</label>
          <div className="grid grid-cols-2 gap-2">
            {documentTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value as KYCDocument["document_type"])}
                className={`p-2 rounded-lg border transition ${
                  selectedType === type.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Select File</label>
          <div className="flex flex-col gap-3">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileSelect}
              disabled={uploading}
              className="cursor-pointer"
            />
            {file && (
              <div className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
              </div>
            )}
            {preview && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </>
          )}
        </Button>
      </Card>

      {/* Uploaded Documents Section */}
      {uploadedDocuments.length > 0 && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Uploaded Documents</h3>

          {loadingDocs ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {uploadedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between p-3 border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {doc.document_type.replace("_", " ")}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          doc.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : doc.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </span>
                    </div>
                    {doc.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        {doc.rejection_reason}
                      </p>
                    )}
                    {doc.uploaded_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mr-3"
                    >
                      View
                    </a>
                  )}

                  {doc.status === "pending" && (
                    <button
                      onClick={() => doc.id && handleDelete(doc.id, doc.file_path)}
                      className="text-destructive hover:text-destructive/80"
                      title="Delete document"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Status Summary */}
      {uploadedDocuments.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-900">
            <CheckCircle2 className="w-4 h-4 inline mr-2" />
            {uploadedDocuments.filter((d) => d.status === "approved").length} of{" "}
            {uploadedDocuments.length} documents verified
          </p>
          {uploadedDocuments.length < maxFiles && (
            <p className="text-xs text-blue-800 mt-2">
              You can upload up to {maxFiles - uploadedDocuments.length} more document(s)
            </p>
          )}
        </Card>
      )}
    </div>
  );
};

export default KYCUpload;

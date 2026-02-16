import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import KYCUpload from "@/components/KYCUpload";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useKYC } from "@/hooks/use-kyc";
import { kycService } from "@/services/kyc.service";
import { toast } from "sonner";

const KYCVerificationPage = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { kyc, loading } = useKYC(user?.id);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitForVerification = async () => {
    if (!user?.id) return;

    setSubmitting(true);
    try {
      const result = await kycService.submitForVerification(user.id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="user">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusIcon = () => {
    switch (kyc?.status) {
      case "approved":
        return <CheckCircle2 className="w-6 h-6 text-green-600" />;
      case "rejected":
        return <XCircle className="w-6 h-6 text-red-600" />;
      case "pending":
        return <Clock className="w-6 h-6 text-yellow-600" />;
      default:
        return <AlertCircle className="w-6 h-6 text-blue-600" />;
    }
  };

  const getStatusText = () => {
    switch (kyc?.status) {
      case "approved":
        return {
          title: "Verified",
          description: "Your identity has been successfully verified. You can now access all features.",
          color: "bg-green-50 border-green-200",
          textColor: "text-green-900",
        };
      case "rejected":
        return {
          title: "Verification Failed",
          description: "Your documents were rejected. Please review and submit again.",
          color: "bg-red-50 border-red-200",
          textColor: "text-red-900",
        };
      case "pending":
        return {
          title: "Under Review",
          description: "Your documents are being reviewed. This usually takes 1-2 business days.",
          color: "bg-yellow-50 border-yellow-200",
          textColor: "text-yellow-900",
        };
      default:
        return {
          title: "Not Started",
          description: "Complete your KYC verification to unlock all features.",
          color: "bg-blue-50 border-blue-200",
          textColor: "text-blue-900",
        };
    }
  };

  const status = getStatusText();

  return (
    <DashboardLayout role="user">
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">KYC Verification</h1>
          <p className="text-muted-foreground mt-2">
            Complete identity verification to access all AbanRemit features
          </p>
        </div>

        {/* Status Card */}
        <Card className={`p-6 border ${status.color}`}>
          <div className="flex items-start gap-4">
            <div className="mt-1">{getStatusIcon()}</div>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${status.textColor}`}>{status.title}</h3>
              <p className={`text-sm mt-1 ${status.textColor.replace("text-", "text-opacity-80 text-")}`}>
                {status.description}
              </p>
            </div>
          </div>
        </Card>

        {/* KYC Steps */}
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Verification Steps</h3>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm font-medium flex-shrink-0">
                  1
                </span>
                <div>
                  <p className="font-medium text-foreground">Upload Documents</p>
                  <p className="text-sm text-muted-foreground">Provide a valid ID, passport, or license</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm font-medium flex-shrink-0">
                  2
                </span>
                <div>
                  <p className="font-medium text-foreground">Submit for Review</p>
                  <p className="text-sm text-muted-foreground">Our team will verify your information</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm font-medium flex-shrink-0">
                  3
                </span>
                <div>
                  <p className="font-medium text-foreground">Get Verified</p>
                  <p className="text-sm text-muted-foreground">Start using all AbanRemit features</p>
                </div>
              </li>
            </ol>
          </div>
        </Card>

        {/* Document Requirements */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Document Requirements</h3>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Clear photo or scan of your document (both sides if applicable)</span>
            </div>
            <div className="flex gap-2">
              <span className="text-primary font-bold">•</span>
              <span>File formats: JPEG, PNG, or PDF (max 5MB)</span>
            </div>
            <div className="flex gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Document must not be expired</span>
            </div>
            <div className="flex gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Face must be clearly visible</span>
            </div>
          </div>
        </Card>

        {/* KYC Upload Component */}
        {user?.id && <KYCUpload userId={user.id} />}

        {/* Submit Button */}
        {kyc?.documentsCount > 0 && kyc?.status !== "approved" && (
          <div className="flex gap-3">
            <Button
              onClick={handleSubmitForVerification}
              disabled={submitting || kyc?.status === "pending"}
              className="flex-1"
            >
              {submitting ? "Submitting..." : "Submit for Verification"}
            </Button>
          </div>
        )}

        {/* Features Info */}
        {kyc?.status !== "approved" && (
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Unlock These Features:</h4>
            <ul className="space-y-1 text-sm text-blue-900">
              <li>✓ Unlimited wallet balance</li>
              <li>✓ Send money to any recipient</li>
              <li>✓ Buy airtime for all networks</li>
              <li>✓ Withdraw funds instantly</li>
              <li>✓ Access to agent services</li>
            </ul>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default KYCVerificationPage;

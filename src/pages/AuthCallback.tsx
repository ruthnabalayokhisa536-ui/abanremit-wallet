import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Get the hash from URL (Supabase sends verification as hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const type = hashParams.get("type");

        if (type === "signup" && accessToken) {
          // Email verification successful
          const { data: { user }, error } = await supabase.auth.getUser(accessToken);
          
          if (error) throw error;

          if (user) {
            setStatus("success");
            setMessage("Email verified successfully! Redirecting to login...");
            toast.success("Email verified! You can now sign in.");
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
              navigate("/login", { replace: true });
            }, 2000);
          }
        } else if (type === "recovery") {
          // Password recovery
          setStatus("success");
          setMessage("Password reset link verified. Redirecting...");
          setTimeout(() => {
            navigate("/reset-password", { replace: true });
          }, 2000);
        } else {
          // Check if user is already logged in
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            setStatus("success");
            setMessage("Already verified! Redirecting to dashboard...");
            setTimeout(() => {
              navigate("/dashboard", { replace: true });
            }, 1500);
          } else {
            throw new Error("Invalid verification link");
          }
        }
      } catch (error: any) {
        console.error("Email verification error:", error);
        setStatus("error");
        setMessage(error.message || "Email verification failed. Please try again.");
        toast.error("Verification failed");
      }
    };

    handleEmailVerification();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary/5 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center space-y-6">
          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">Verifying Email</h2>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-16 h-16 text-success mx-auto" />
              <h2 className="text-2xl font-bold text-success">Success!</h2>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 text-destructive mx-auto" />
              <h2 className="text-2xl font-bold text-destructive">Verification Failed</h2>
              <p className="text-muted-foreground">{message}</p>
              <div className="space-y-2 pt-4">
                <Button onClick={() => navigate("/login")} className="w-full">
                  Go to Login
                </Button>
                <Button onClick={() => navigate("/register")} variant="outline" className="w-full">
                  Register Again
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AuthCallback;

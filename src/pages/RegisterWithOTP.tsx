import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, Phone } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { otpService } from "@/services/otp.service";
import { toast } from "sonner";

const RegisterWithOTP = () => {
  const [step, setStep] = useState<"details" | "verify">("details");
  const [form, setForm] = useState({ 
    fullName: "", 
    phone: "", 
    email: "", 
    password: "", 
    confirmPassword: "" 
  });
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, "");
    
    // Handle different formats
    if (cleaned.startsWith("254")) {
      return cleaned.slice(0, 12); // Ensure exactly 12 digits (254 + 9)
    } else if (cleaned.startsWith("0")) {
      return "254" + cleaned.substring(1, 10); // 254 + next 9 digits
    } else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
      return "254" + cleaned.slice(0, 9); // 254 + first 9 digits
    }
    
    // Default: try to extract 9 digits and prepend 254
    const digits = cleaned.slice(-9); // Get last 9 digits
    return "254" + digits;
  };

  const validatePhone = (phone: string): boolean => {
    const formatted = formatPhoneNumber(phone);
    return /^254\d{9}$/.test(formatted);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!form.fullName.trim() || form.fullName.trim().length > 100) {
      setError("Full name is required (max 100 characters).");
      return;
    }
    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    if (!validatePhone(form.phone)) {
      setError("Invalid phone number. Use format: 07XX XXX XXX or 2547XX XXX XXX");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const formattedPhone = formatPhoneNumber(form.phone);
      const result = await otpService.sendOTP(formattedPhone, "verification");
      
      if (result.success) {
        toast.success("OTP sent to your phone!");
        setStep("verify");
      } else {
        setError(result.message || "Failed to send OTP");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    setSubmitting(true);
    try {
      const formattedPhone = formatPhoneNumber(form.phone);
      
      // Verify OTP
      const verifyResult = await otpService.verifyOTP(formattedPhone, otp, "verification");
      
      if (!verifyResult.verified) {
        setError(verifyResult.message || "Invalid OTP");
        setSubmitting(false);
        return;
      }

      // OTP verified, proceed with registration
      await signUp(form.email, form.password, {
        full_name: form.fullName.trim(),
        phone: formattedPhone,
        phone_verified: "true",
      });

      toast.success("Registration successful! You can now log in.");
      navigate("/login");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setSubmitting(true);
    try {
      const formattedPhone = formatPhoneNumber(form.phone);
      const result = await otpService.resendOTP(formattedPhone, "verification");
      
      if (result.success) {
        toast.success("OTP resent!");
      } else {
        toast.error(result.message || "Failed to resend OTP");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to resend OTP");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary/5 p-4 bg-cover bg-center" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('/hero-bg.jpg')" }}>
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">AbanRemit</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {step === "details" ? "Create your account" : "Verify your phone number"}
          </p>
        </div>

        {step === "details" ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground">Full Legal Name</label>
              <Input 
                placeholder="John Doe" 
                value={form.fullName} 
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} 
                className="mt-1" 
                required 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Phone Number</label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="tel" 
                  placeholder="07XX XXX XXX" 
                  value={form.phone} 
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                  className="pl-10" 
                  required 
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">We'll send an OTP to verify your number</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input 
                type="email" 
                placeholder="email@example.com" 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
                className="mt-1" 
                required 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative mt-1">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Create password (min 6 chars)" 
                  value={form.password} 
                  onChange={(e) => setForm({ ...form, password: e.target.value })} 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <Input 
                type="password" 
                placeholder="Confirm password" 
                value={form.confirmPassword} 
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} 
                className="mt-1" 
                required 
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send OTP
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndRegister} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>
            )}
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to<br />
                <span className="font-medium text-foreground">{form.phone}</span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Verification Code</label>
              <Input 
                type="text" 
                placeholder="000000" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} 
                className="mt-1 text-center text-2xl tracking-widest" 
                maxLength={6}
                required 
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verify & Create Account
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={submitting}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                Resend OTP
              </button>
              <span className="mx-2 text-muted-foreground">•</span>
              <button
                type="button"
                onClick={() => setStep("details")}
                className="text-sm text-primary hover:underline"
              >
                Change Phone Number
              </button>
            </div>
          </form>
        )}

        <p className="text-sm text-center text-muted-foreground mt-6">
          Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
        </p>
      </Card>
    </div>
  );
};

export default RegisterWithOTP;

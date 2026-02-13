import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const Register = () => {
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.fullName.trim() || form.fullName.trim().length > 100) {
      setError("Full name is required (max 100 characters).");
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
      await signUp(form.email, form.password, {
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
      });
      toast.success("Registration successful! Please check your email to verify your account.");
      navigate("/login");
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary/5 p-4 bg-cover bg-center" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('/hero-bg.jpg')" }}>
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">AbanRemit</h1>
          <p className="text-sm text-muted-foreground mt-2">Create your account</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground">Full Legal Name</label>
            <Input placeholder="John Doe" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="mt-1" required />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Phone Number</label>
            <Input type="tel" placeholder="07XX XXX XXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" required />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative mt-1">
              <Input type={showPassword ? "text" : "password"} placeholder="Create password (min 6 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Confirm Password</label>
            <Input type="password" placeholder="Confirm password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="mt-1" required />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Account
          </Button>
        </form>
        <p className="text-sm text-center text-muted-foreground mt-6">
          Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
        </p>
      </Card>
    </div>
  );
};

export default Register;

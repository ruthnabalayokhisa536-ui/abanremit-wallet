import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WalletNumberValidatorProps {
  value: string;
  onChange: (value: string) => void;
  onValidation: (isValid: boolean, name?: string, walletId?: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  isAgentWallet?: boolean;
}

const WalletNumberValidator: React.FC<WalletNumberValidatorProps> = ({
  value,
  onChange,
  onValidation,
  label = "Wallet Number",
  placeholder = "Enter wallet number",
  disabled = false,
  isAgentWallet = false,
}) => {
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    name?: string;
    walletId?: string;
  } | null>(null);

  useEffect(() => {
    if (!value || value.length < 3) {
      setValidationResult(null);
      onValidation(false);
      return;
    }

    const validateWallet = async () => {
      setValidating(true);
      
      try {
        const { data, error } = await supabase
          .from("wallets")
          .select(`
            id,
            wallet_id,
            user_id,
            profiles!inner(full_name, phone)
          `)
          .eq("wallet_id", value)
          .maybeSingle();

        if (error || !data) {
          setValidationResult({ valid: false });
          onValidation(false);
        } else {
          const profile = data.profiles as any;
          setValidationResult({
            valid: true,
            name: profile?.full_name || "Unknown",
            walletId: data.wallet_id,
          });
          onValidation(true, profile?.full_name, data.wallet_id);
        }
      } catch (err) {
        setValidationResult({ valid: false });
        onValidation(false);
      }
      
      setValidating(false);
    };

    const debounce = setTimeout(validateWallet, 500);
    return () => clearTimeout(debounce);
  }, [value, isAgentWallet, onValidation]);

  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative mt-1">
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="pr-10"
          disabled={disabled}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {validating && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {!validating && validationResult?.valid && (
            <CheckCircle className="w-4 h-4 text-success" />
          )}
          {!validating && validationResult && !validationResult.valid && value.length >= 3 && (
            <XCircle className="w-4 h-4 text-destructive" />
          )}
        </div>
      </div>
      {validationResult?.valid && validationResult.name && (
        <p className="text-sm text-success mt-1">
          ✓ {validationResult.name}
        </p>
      )}
      {validationResult && !validationResult.valid && value.length >= 3 && (
        <p className="text-sm text-destructive mt-1">
          ✗ Wallet not found
        </p>
      )}
    </div>
  );
};

export default WalletNumberValidator;

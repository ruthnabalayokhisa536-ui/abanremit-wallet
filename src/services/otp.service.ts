import { supabase } from "@/integrations/supabase/client";
import { smsService } from "./payment/sms.service";

interface OTPResponse {
  success: boolean;
  message: string;
  otpId?: string;
}

interface OTPVerifyResponse {
  success: boolean;
  message: string;
  verified: boolean;
}

export const otpService = {
  /**
   * Generate and send OTP to phone number
   */
  async sendOTP(phoneNumber: string, purpose: "login" | "transaction" | "verification"): Promise<OTPResponse> {
    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      console.log("Generating OTP:", {
        phone: phoneNumber,
        otp: otp, // Remove this in production!
        purpose,
        expiresAt: expiresAt.toISOString()
      });

      // Store OTP in database using RPC or direct insert
      const { data, error } = await supabase.rpc('create_otp_code' as any, {
        p_phone_number: smsService.formatPhoneNumber(phoneNumber),
        p_code: otp,
        p_purpose: purpose,
        p_expires_at: expiresAt.toISOString(),
      });

      if (error) {
        console.error("OTP storage error:", error);
        // Try direct insert as fallback
        const { error: insertError } = await supabase
          .from('otp_codes')
          .insert({
            phone_number: smsService.formatPhoneNumber(phoneNumber),
            code: otp,
            purpose: purpose,
            expires_at: expiresAt.toISOString(),
            verified: false
          });
        
        if (insertError) {
          console.error("Direct insert also failed:", insertError);
        } else {
          console.log("OTP stored via direct insert");
        }
      } else {
        console.log("OTP stored via RPC, ID:", data);
      }

      // Send OTP via SMS
      const message = `ABAN_COOL: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
      await smsService.sendSms({
        to: smsService.formatPhoneNumber(phoneNumber),
        message,
      });

      return {
        success: true,
        message: "OTP sent successfully",
        otpId: String(data || `OTP${Date.now()}`),
      };
    } catch (error: any) {
      console.error("OTP send error:", error);
      return {
        success: false,
        message: error.message || "Failed to send OTP",
      };
    }
  },

  /**
   * Verify OTP code
   */
  async verifyOTP(phoneNumber: string, code: string, purpose: "login" | "transaction" | "verification"): Promise<OTPVerifyResponse> {
    try {
      const formattedPhone = smsService.formatPhoneNumber(phoneNumber);

      console.log("Verifying OTP:", {
        phone: formattedPhone,
        code: code,
        purpose: purpose
      });

      // Verify using RPC function
      const { data, error } = await supabase.rpc('verify_otp_code' as any, {
        p_phone_number: formattedPhone,
        p_code: code,
        p_purpose: purpose,
      });

      console.log("Verification result:", { data, error });

      if (error) {
        console.error("RPC verification error:", error);
        // Try direct query as fallback
        const { data: otpData, error: queryError } = await supabase
          .from('otp_codes')
          .select('*')
          .eq('phone_number', formattedPhone)
          .eq('code', code)
          .eq('purpose', purpose)
          .eq('verified', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log("Direct query result:", { otpData, queryError });

        if (queryError || !otpData) {
          return {
            success: false,
            message: "Invalid or expired OTP",
            verified: false,
          };
        }

        // Mark as verified
        await supabase
          .from('otp_codes')
          .update({ verified: true })
          .eq('id', otpData.id);

        return {
          success: true,
          message: "OTP verified successfully",
          verified: true,
        };
      }

      if (!data) {
        return {
          success: false,
          message: "Invalid or expired OTP",
          verified: false,
        };
      }

      return {
        success: true,
        message: "OTP verified successfully",
        verified: true,
      };
    } catch (error: any) {
      console.error("OTP verify error:", error);
      return {
        success: false,
        message: error.message || "Failed to verify OTP",
        verified: false,
      };
    }
  },

  /**
   * Resend OTP
   */
  async resendOTP(phoneNumber: string, purpose: "login" | "transaction" | "verification"): Promise<OTPResponse> {
    // Send new OTP
    return this.sendOTP(phoneNumber, purpose);
  },
};

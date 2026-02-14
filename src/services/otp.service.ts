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

      // Store OTP in database using RPC or direct insert
      const { data, error } = await supabase.rpc('create_otp_code' as any, {
        p_phone_number: smsService.formatPhoneNumber(phoneNumber),
        p_code: otp,
        p_purpose: purpose,
        p_expires_at: expiresAt.toISOString(),
      });

      if (error) {
        console.warn("OTP storage error, using fallback:", error);
        // Fallback: just send SMS without storing
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

      // Verify using RPC function
      const { data, error } = await supabase.rpc('verify_otp_code' as any, {
        p_phone_number: formattedPhone,
        p_code: code,
        p_purpose: purpose,
      });

      if (error || !data) {
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

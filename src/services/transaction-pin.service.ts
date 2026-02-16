import { supabase } from "@/integrations/supabase/client";

export interface TransactionPinStatus {
  hasPin: boolean;
  isLocked: boolean;
  lockedUntil?: string;
  failedAttempts?: number;
}

/**
 * Transaction PIN Service
 * Handles transaction PIN creation, validation, and management
 */
export const transactionPinService = {
  /**
   * Check if user has a transaction PIN
   */
  async hasPin(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('has_transaction_pin', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking PIN status:', error);
      return false;
    }
  },

  /**
   * Get PIN status (locked, failed attempts, etc.)
   */
  async getPinStatus(): Promise<TransactionPinStatus> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('transaction_pins')
        .select('failed_attempts, locked_until')
        .eq('user_id', user.user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        return { hasPin: false, isLocked: false };
      }

      const isLocked = data.locked_until ? new Date(data.locked_until) > new Date() : false;

      return {
        hasPin: true,
        isLocked,
        lockedUntil: data.locked_until,
        failedAttempts: data.failed_attempts,
      };
    } catch (error) {
      console.error('Error getting PIN status:', error);
      return { hasPin: false, isLocked: false };
    }
  },

  /**
   * Create transaction PIN
   */
  async createPin(pin: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate PIN format (4-6 digits)
      if (!/^\d{4,6}$/.test(pin)) {
        return {
          success: false,
          message: 'PIN must be 4-6 digits',
        };
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Hash PIN using pgcrypto (server-side)
      const { data, error } = await supabase
        .from('transaction_pins')
        .insert({
          user_id: user.user.id,
          pin_hash: pin, // Will be hashed by database trigger
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return {
            success: false,
            message: 'PIN already exists. Use change PIN instead.',
          };
        }
        throw error;
      }

      return {
        success: true,
        message: 'Transaction PIN created successfully',
      };
    } catch (error: any) {
      console.error('Error creating PIN:', error);
      return {
        success: false,
        message: error.message || 'Failed to create PIN',
      };
    }
  },

  /**
   * Change transaction PIN
   */
  async changePin(oldPin: string, newPin: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate new PIN format
      if (!/^\d{4,6}$/.test(newPin)) {
        return {
          success: false,
          message: 'New PIN must be 4-6 digits',
        };
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Validate old PIN first
      const isValid = await this.validatePin(oldPin);
      if (!isValid) {
        return {
          success: false,
          message: 'Current PIN is incorrect',
        };
      }

      // Update PIN
      const { error } = await supabase
        .from('transaction_pins')
        .update({
          pin_hash: newPin, // Will be hashed by database trigger
          failed_attempts: 0,
          locked_until: null,
        })
        .eq('user_id', user.user.id);

      if (error) throw error;

      return {
        success: true,
        message: 'PIN changed successfully',
      };
    } catch (error: any) {
      console.error('Error changing PIN:', error);
      return {
        success: false,
        message: error.message || 'Failed to change PIN',
      };
    }
  },

  /**
   * Validate transaction PIN
   */
  async validatePin(pin: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('validate_transaction_pin', {
        p_user_id: user.user.id,
        p_pin: pin,
      });

      if (error) {
        // Check if it's a lock error
        if (error.message.includes('locked')) {
          throw new Error('Account locked due to too many failed attempts');
        }
        if (error.message.includes('not set')) {
          throw new Error('Transaction PIN not set');
        }
        return false;
      }

      return data === true;
    } catch (error: any) {
      console.error('Error validating PIN:', error);
      throw error;
    }
  },

  /**
   * Reset PIN (admin only)
   */
  async resetPin(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('transaction_pins')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      return {
        success: true,
        message: 'PIN reset successfully',
      };
    } catch (error: any) {
      console.error('Error resetting PIN:', error);
      return {
        success: false,
        message: error.message || 'Failed to reset PIN',
      };
    }
  },
};

export default transactionPinService;

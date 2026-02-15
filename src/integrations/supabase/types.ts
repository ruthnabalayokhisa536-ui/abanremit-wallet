export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_commissions: {
        Row: {
          agent_id: string
          commission_amount: number
          created_at: string
          id: string
          transaction_id: string
        }
        Insert: {
          agent_id: string
          commission_amount: number
          created_at?: string
          id?: string
          transaction_id: string
        }
        Update: {
          agent_id?: string
          commission_amount?: number
          created_at?: string
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          agent_id: string
          business_name: string | null
          commission_balance: number
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string
          business_name?: string | null
          commission_balance?: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          business_name?: string | null
          commission_balance?: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      airtime_networks: {
        Row: {
          code: string
          commission_rate: number
          created_at: string
          enabled: boolean
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          commission_rate?: number
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          commission_rate?: number
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      airtime_transactions: {
        Row: {
          agent_id: string | null
          amount: number
          commission: number
          created_at: string
          fee: number
          id: string
          network_id: string
          phone_number: string
          status: string
          transaction_id: string
          type: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          amount: number
          commission?: number
          created_at?: string
          fee?: number
          id?: string
          network_id: string
          phone_number: string
          status?: string
          transaction_id?: string
          type?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          amount?: number
          commission?: number
          created_at?: string
          fee?: number
          id?: string
          network_id?: string
          phone_number?: string
          status?: string
          transaction_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "airtime_transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airtime_transactions_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "airtime_networks"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      commission_rates: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          percentage: number
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          percentage: number
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          percentage?: number
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      commission_transactions: {
        Row: {
          agent_id: string
          agent_wallet_id: string
          base_amount: number
          commission_amount: number
          commission_percentage: number
          created_at: string | null
          id: string
          status: string | null
          transaction_id: string
          transaction_type: string
        }
        Insert: {
          agent_id: string
          agent_wallet_id: string
          base_amount: number
          commission_amount: number
          commission_percentage: number
          created_at?: string | null
          id?: string
          status?: string | null
          transaction_id: string
          transaction_type: string
        }
        Update: {
          agent_id?: string
          agent_wallet_id?: string
          base_amount?: number
          commission_amount?: number
          commission_percentage?: number
          created_at?: string | null
          id?: string
          status?: string | null
          transaction_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_transactions_agent_wallet_id_fkey"
            columns: ["agent_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          enabled: boolean
          id: string
          is_default: boolean
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          enabled?: boolean
          id?: string
          is_default?: boolean
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          is_default?: boolean
          name?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      currency_exchange_rates: {
        Row: {
          from_currency: string
          rate: number
          to_currency: string
          updated_at: string | null
        }
        Insert: {
          from_currency: string
          rate: number
          to_currency: string
          updated_at?: string | null
        }
        Update: {
          from_currency?: string
          rate?: number
          to_currency?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fees: {
        Row: {
          created_at: string
          flat_fee: number
          id: string
          max_amount: number | null
          min_amount: number | null
          percentage_fee: number
          transaction_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          flat_fee?: number
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          percentage_fee?: number
          transaction_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          flat_fee?: number
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          percentage_fee?: number
          transaction_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          document_type: string
          file_path: string
          file_url: string | null
          id: string
          rejection_reason: string | null
          status: string
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          document_type: string
          file_path: string
          file_url?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          document_type?: string
          file_path?: string
          file_url?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mpesa_transactions: {
        Row: {
          account_reference: string
          amount: number
          checkout_request_id: string
          created_at: string | null
          id: string
          merchant_request_id: string
          mpesa_receipt_number: string | null
          phone_number: string
          result_code: number | null
          result_desc: string | null
          status: string
          transaction_date: string | null
          transaction_desc: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_reference: string
          amount: number
          checkout_request_id: string
          created_at?: string | null
          id?: string
          merchant_request_id: string
          mpesa_receipt_number?: string | null
          phone_number: string
          result_code?: number | null
          result_desc?: string | null
          status?: string
          transaction_date?: string | null
          transaction_desc?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_reference?: string
          amount?: number
          checkout_request_id?: string
          created_at?: string | null
          id?: string
          merchant_request_id?: string
          mpesa_receipt_number?: string | null
          phone_number?: string
          result_code?: number | null
          result_desc?: string | null
          status?: string
          transaction_date?: string | null
          transaction_desc?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          priority: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          priority?: string | null
          read?: boolean
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          priority?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          phone_number: string
          purpose: string
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone_number: string
          purpose: string
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_number?: string
          purpose?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      otps: {
        Row: {
          action: string
          created_at: string
          expires_at: string
          id: string
          otp_hash: string
          used: boolean
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          expires_at: string
          id?: string
          otp_hash: string
          used?: boolean
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      pesapal_transactions: {
        Row: {
          amount: number
          callback_url: string | null
          created_at: string | null
          currency: string
          description: string | null
          id: string
          merchant_reference: string
          notification_id: string | null
          order_id: string
          payment_method: string | null
          payment_status_code: number | null
          payment_status_description: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          callback_url?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          merchant_reference: string
          notification_id?: string | null
          order_id: string
          payment_method?: string | null
          payment_status_code?: number | null
          payment_status_description?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          callback_url?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          merchant_reference?: string
          notification_id?: string | null
          order_id?: string
          payment_method?: string | null
          payment_status_code?: number | null
          payment_status_description?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          id_back_url: string | null
          id_front_url: string | null
          kyc_status: string
          national_id: string | null
          passport_number: string | null
          phone: string | null
          profile_image_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          kyc_status?: string
          national_id?: string | null
          passport_number?: string | null
          phone?: string | null
          profile_image_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          kyc_status?: string
          national_id?: string | null
          passport_number?: string | null
          phone?: string | null
          profile_image_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_charges: {
        Row: {
          cost: number | null
          created_at: string | null
          id: string
          message_type: string
          phone_number: string
          status: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          id?: string
          message_type: string
          phone_number: string
          status?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          id?: string
          message_type?: string
          phone_number?: string
          status?: string | null
        }
        Relationships: []
      }
      stripe_transactions: {
        Row: {
          amount: number
          client_secret: string | null
          created_at: string | null
          currency: string
          description: string | null
          id: string
          payment_intent_id: string
          payment_method: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          client_secret?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          payment_intent_id: string
          payment_method?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          client_secret?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          payment_intent_id?: string
          payment_method?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      transaction_pins: {
        Row: {
          created_at: string | null
          failed_attempts: number | null
          id: string
          locked_until: string | null
          pin_hash: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          failed_attempts?: number | null
          id?: string
          locked_until?: string | null
          pin_hash: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          failed_attempts?: number | null
          id?: string
          locked_until?: string | null
          pin_hash?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          agent_id: string | null
          amount: number
          commission_amount: number | null
          created_at: string
          fee: number
          id: string
          metadata: Json | null
          receipt_reference: string | null
          receiver_wallet_id: string | null
          sender_wallet_id: string | null
          status: string
          transaction_id: string
          type: string
        }
        Insert: {
          agent_id?: string | null
          amount: number
          commission_amount?: number | null
          created_at?: string
          fee?: number
          id?: string
          metadata?: Json | null
          receipt_reference?: string | null
          receiver_wallet_id?: string | null
          sender_wallet_id?: string | null
          status?: string
          transaction_id?: string
          type: string
        }
        Update: {
          agent_id?: string | null
          amount?: number
          commission_amount?: number | null
          created_at?: string
          fee?: number
          id?: string
          metadata?: Json | null
          receipt_reference?: string | null
          receiver_wallet_id?: string | null
          sender_wallet_id?: string | null
          status?: string
          transaction_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_receiver_wallet_id_fkey"
            columns: ["receiver_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_sender_wallet_id_fkey"
            columns: ["sender_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          agent_id: string | null
          balance: number
          created_at: string
          currency: string | null
          id: string
          is_agent_wallet: boolean | null
          status: string
          transaction_pin: string | null
          updated_at: string
          user_id: string
          wallet_id: string
          wallet_number: string | null
        }
        Insert: {
          agent_id?: string | null
          balance?: number
          created_at?: string
          currency?: string | null
          id?: string
          is_agent_wallet?: boolean | null
          status?: string
          transaction_pin?: string | null
          updated_at?: string
          user_id: string
          wallet_id?: string
          wallet_number?: string | null
        }
        Update: {
          agent_id?: string | null
          balance?: number
          created_at?: string
          currency?: string | null
          id?: string
          is_agent_wallet?: boolean | null
          status?: string
          transaction_pin?: string | null
          updated_at?: string
          user_id?: string
          wallet_id?: string
          wallet_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_and_credit_commission: {
        Args: {
          p_agent_id: string
          p_amount: number
          p_transaction_id: string
          p_transaction_type: string
        }
        Returns: undefined
      }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      create_otp_code: {
        Args: {
          p_code: string
          p_expires_at: string
          p_phone_number: string
          p_purpose: string
        }
        Returns: string
      }
      credit_wallet: {
        Args: { deposit_amount: number; wallet_uuid: string }
        Returns: undefined
      }
      generate_agent_id: { Args: never; Returns: string }
      generate_agent_number: { Args: never; Returns: string }
      generate_receipt_reference: { Args: never; Returns: string }
      generate_user_wallet_number: { Args: never; Returns: string }
      generate_wallet_number: { Args: { is_agent?: boolean }; Returns: string }
      get_agent_commission_summary: {
        Args: { p_agent_id: string }
        Returns: {
          this_month_commission: number
          today_commission: number
          total_commission: number
          transaction_count: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_transaction_pin: { Args: { p_user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_agent_or_admin: { Args: never; Returns: boolean }
      track_sms_charge: {
        Args: { p_phone: string; p_type: string }
        Returns: undefined
      }
      validate_transaction_pin: {
        Args: { p_pin: string; p_user_id: string }
        Returns: boolean
      }
      verify_otp_code: {
        Args: { p_code: string; p_phone_number: string; p_purpose: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "agent" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "agent", "admin"],
    },
  },
} as const

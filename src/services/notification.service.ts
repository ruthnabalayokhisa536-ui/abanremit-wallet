import { supabase } from "@/integrations/supabase/client";
import { smsService } from "./payment/sms.service";

export type NotificationType = "transaction" | "kyc" | "security" | "system" | "promotion";
export type NotificationPriority = "low" | "medium" | "high" | "urgent";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  sendSMS?: boolean;
  phoneNumber?: string;
}

interface NotificationResponse {
  success: boolean;
  message: string;
  notificationId?: string;
}

export const notificationService = {
  /**
   * Create and send notification
   */
  async createNotification(params: CreateNotificationParams): Promise<NotificationResponse> {
    try {
      const {
        userId,
        title,
        message,
        type,
        priority = "medium",
        sendSMS = false,
        phoneNumber,
      } = params;

      // Create notification in database
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title,
          message,
          type,
          priority,
          read: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Send SMS if requested and phone number provided
      if (sendSMS && phoneNumber) {
        await smsService.sendSms({
          to: smsService.formatPhoneNumber(phoneNumber),
          message: `ABAN_COOL: ${title} - ${message}`,
        });
      }

      return {
        success: true,
        message: "Notification created successfully",
        notificationId: data.id,
      };
    } catch (error: any) {
      console.error("Notification creation error:", error);
      return {
        success: false,
        message: error.message || "Failed to create notification",
      };
    }
  },

  /**
   * Send transaction notification
   */
  async sendTransactionNotification(
    userId: string,
    transactionType: string,
    amount: number,
    phoneNumber?: string
  ): Promise<NotificationResponse> {
    const title = `Transaction ${transactionType}`;
    const message = `Your ${transactionType} of KES ${amount.toLocaleString()} has been processed successfully.`;

    return this.createNotification({
      userId,
      title,
      message,
      type: "transaction",
      priority: "high",
      sendSMS: true,
      phoneNumber,
    });
  },

  /**
   * Send KYC status notification
   */
  async sendKYCNotification(
    userId: string,
    status: "approved" | "rejected" | "pending",
    phoneNumber?: string
  ): Promise<NotificationResponse> {
    const messages = {
      approved: "Your KYC verification has been approved. You now have full access to all features.",
      rejected: "Your KYC verification was rejected. Please review and resubmit your documents.",
      pending: "Your KYC verification is under review. We'll notify you once it's processed.",
    };

    return this.createNotification({
      userId,
      title: `KYC ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: messages[status],
      type: "kyc",
      priority: "high",
      sendSMS: true,
      phoneNumber,
    });
  },

  /**
   * Send security alert
   */
  async sendSecurityAlert(
    userId: string,
    alertMessage: string,
    phoneNumber?: string
  ): Promise<NotificationResponse> {
    return this.createNotification({
      userId,
      title: "Security Alert",
      message: alertMessage,
      type: "security",
      priority: "urgent",
      sendSMS: true,
      phoneNumber,
    });
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      return !error;
    } catch (error) {
      console.error("Mark as read error:", error);
      return false;
    }
  },

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      return !error;
    } catch (error) {
      console.error("Mark all as read error:", error);
      return false;
    }
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);

      return count || 0;
    } catch (error) {
      console.error("Get unread count error:", error);
      return 0;
    }
  },

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Get notifications error:", error);
      return [];
    }
  },
};

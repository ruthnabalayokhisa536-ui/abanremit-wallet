import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

interface UseNotificationsOptions {
  userId?: string;
  limit?: number;
  unreadOnly?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { userId, limit = 50, unreadOnly = false } = options;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        if (!userId) {
          setNotifications([]);
          setLoading(false);
          return;
        }

        let queryBuilder = supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .eq("dismissed", false)
          .order("created_at", { ascending: false })
          .limit(limit);

        const { data, error } = unreadOnly
          ? await queryBuilder.eq("read", false)
          : await queryBuilder;

        if (error) throw error;

        if (!cancelled) {
          setNotifications(data || []);
          
          // Count unread notifications
          const unread = (data || []).filter((n) => !n.read).length;
          setUnreadCount(unread);
          
          setLoading(false);
        }
      } catch (error) {
        // Suppress AbortError in development (caused by rapid mount/unmount)
        if (error instanceof Error && error.name === 'AbortError') {
          console.debug('[useNotifications] Request aborted (normal in development)');
        } else {
          console.error("Failed to fetch notifications:", error);
        }
        if (!cancelled) {
          setNotifications([]);
          setLoading(false);
        }
      }
    };

    fetchNotifications();

    // Real-time notification updates
    if (userId) {
      const channel = supabase
        .channel(`notifications-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!cancelled && payload.new) {
              const newNotification = payload.new as Notification;
              setNotifications((prev) => [newNotification, ...prev].slice(0, limit));
              if (!newNotification.read) {
                setUnreadCount((prev) => prev + 1);
              }
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!cancelled && payload.new) {
              const updatedNotification = payload.new as Notification;
              setNotifications((prev) => {
                const updated = prev.map((n) => 
                  n.id === updatedNotification.id ? updatedNotification : n
                );
                
                // Recalculate unread count
                const unread = updated.filter((n) => !n.read).length;
                setUnreadCount(unread);
                
                return updated;
              });
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!cancelled && payload.old) {
              const deletedId = (payload.old as Notification).id;
              setNotifications((prev) => {
                const filtered = prev.filter((n) => n.id !== deletedId);
                
                // Recalculate unread count
                const unread = filtered.filter((n) => !n.read).length;
                setUnreadCount(unread);
                
                return filtered;
              });
            }
          }
        )
        .subscribe();

      return () => {
        cancelled = true;
        supabase.removeChannel(channel);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [userId, limit, unreadOnly]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) throw error;

      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // Mark as dismissed instead of deleting
      const { error } = await supabase
        .from("notifications")
        .update({ 
          dismissed: true, 
          dismissed_at: new Date().toISOString(),
          read: true 
        })
        .eq("id", notificationId);

      if (error) throw error;

      // Optimistic update - remove from list
      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === notificationId);
        if (notification && !notification.read) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return prev.filter((n) => n.id !== notificationId);
      });
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
    }
  };

  const refetch = async () => {
    if (!userId) return;

    try {
      const queryBuilder = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("dismissed", false)
        .order("created_at", { ascending: false })
        .limit(limit);

      const { data, error } = unreadOnly 
        ? await queryBuilder.eq("read", false)
        : await queryBuilder;

      if (error) throw error;

      setNotifications(data || []);
      
      // Count unread notifications
      const unread = (data || []).filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Failed to refetch notifications:", error);
    }
  };

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch,
  };
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  title: string | null;
  priority: string | null;
  dismissed: boolean | null;
  dismissed_at: string | null;
}

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
        if (!userId) { setNotifications([]); setLoading(false); return; }

        let query = supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .eq("dismissed", false)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (unreadOnly) {
          query = query.eq("read", false);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!cancelled) {
          const items = (data || []) as unknown as Notification[];
          setNotifications(items);
          setUnreadCount(items.filter((n) => !n.read).length);
          setLoading(false);
        }
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) {
          console.error("Failed to fetch notifications:", error);
        }
        if (!cancelled) { setNotifications([]); setLoading(false); }
      }
    };

    fetchNotifications();

    if (userId) {
      const channel = supabase
        .channel(`notifications-${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            if (!cancelled && payload.new) {
              const n = payload.new as unknown as Notification;
              setNotifications((prev) => [n, ...prev].slice(0, limit));
              if (!n.read) setUnreadCount((prev) => prev + 1);
            }
          }
        )
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            if (!cancelled && payload.new) {
              const updated = payload.new as unknown as Notification;
              setNotifications((prev) => {
                const list = prev.map((n) => n.id === updated.id ? updated : n);
                setUnreadCount(list.filter((n) => !n.read).length);
                return list;
              });
            }
          }
        )
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            if (!cancelled && payload.old) {
              const deletedId = (payload.old as any).id;
              setNotifications((prev) => {
                const filtered = prev.filter((n) => n.id !== deletedId);
                setUnreadCount(filtered.filter((n) => !n.read).length);
                return filtered;
              });
            }
          }
        )
        .subscribe();

      return () => { cancelled = true; supabase.removeChannel(channel); };
    }

    return () => { cancelled = true; };
  }, [userId, limit, unreadOnly]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) { console.error("Failed to mark notification as read:", error); }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) { console.error("Failed to mark all notifications as read:", error); }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ dismissed: true, dismissed_at: new Date().toISOString(), read: true }).eq("id", notificationId);
      if (error) throw error;
      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === notificationId);
        if (notification && !notification.read) setUnreadCount((count) => Math.max(0, count - 1));
        return prev.filter((n) => n.id !== notificationId);
      });
    } catch (error) { console.error("Failed to dismiss notification:", error); }
  };

  const refetch = async () => {
    if (!userId) return;
    try {
      let query = supabase.from("notifications").select("*").eq("user_id", userId).eq("dismissed", false).order("created_at", { ascending: false }).limit(limit);
      if (unreadOnly) query = query.eq("read", false);
      const { data, error } = await query;
      if (error) throw error;
      const items = (data || []) as unknown as Notification[];
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.read).length);
    } catch (error) { console.error("Failed to refetch notifications:", error); }
  };

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification, refetch };
}

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <DashboardLayout role="user">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : notifications.length === 0 ? (
          <Card className="p-8 text-center"><p className="text-muted-foreground">No notifications yet.</p></Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <Card key={n.id} className={`p-4 ${!n.read ? "border-primary/30 bg-primary/5" : ""}`}>
                <p className="text-sm text-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;

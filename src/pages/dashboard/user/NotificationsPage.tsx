import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCheck, Trash2, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { toast } from "sonner";

const NotificationsPage = () => {
  const { user } = useAuth();
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({ userId: user?.id });

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    toast.success("Marked as read");
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    toast.success("All notifications marked as read");
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    toast.success("Notification deleted");
  };

  return (
    <DashboardLayout role="user">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No notifications yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              You'll receive notifications for transactions and important updates.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={`p-4 transition-colors ${
                  !n.read
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {!n.read && (
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                      )}
                      <p className="text-sm font-medium text-foreground capitalize">
                        {n.type?.replace(/_/g, " ") || "Notification"}
                      </p>
                    </div>
                    <p className="text-sm text-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!n.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(n.id)}
                        className="h-8 w-8 p-0"
                        title="Mark as read"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(n.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;

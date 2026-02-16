// Add this to DashboardLayout.tsx after the imports
import { supabase } from "@/integrations/supabase/client";

// Add this state inside the DashboardLayout component (after other useState declarations)
const [unreadCount, setUnreadCount] = useState(0);

// Add this useEffect to fetch and subscribe to notifications
useEffect(() => {
  if (!user?.id) return;

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);
    
    setUnreadCount(count || 0);
  };

  fetchUnreadCount();

  // Real-time subscription
  const channel = supabase
    .channel("notification-updates")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      },
      () => fetchUnreadCount()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id]);

// Update the renderNavItem function to show badge on Bell icon
// Replace the existing renderNavItem function with this:
const renderNavItem = (item: NavItem) => {
  const showBadge = item.label === "Notifications" && unreadCount > 0;
  
  if (item.children) {
    const open = openDropdowns.includes(item.label) || isDropdownActive(item);
    return (
      <div key={item.label}>
        <button
          onClick={() => toggleDropdown(item.label)}
          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
            isDropdownActive(item)
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
          }`}
        >
          <span className="flex items-center gap-3">
            <item.icon className="w-4 h-4" />
            {item.label}
          </span>
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-0.5">
            {item.children.map((child) => (
              <Link
                key={child.path}
                to={child.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive(child.path)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                }`}
              >
                <child.icon className="w-3.5 h-3.5" />
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      key={item.path}
      to={item.path!}
      onClick={() => setMobileOpen(false)}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors relative ${
        isActive(item.path)
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
      }`}
    >
      <item.icon className="w-4 h-4" />
      {item.label}
      {showBadge && (
        <Badge className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-destructive">
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      )}
    </Link>
  );
};

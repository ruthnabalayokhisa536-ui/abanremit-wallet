import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home, Wallet, ArrowDownCircle, ArrowUpCircle, FileText, Bell, User,
  Users, Settings, Shield, BarChart3, Send, Phone, LogOut, DollarSign,
  Menu, X, ChevronDown, ChevronRight, Globe, Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { useProfile } from "@/hooks/use-profile";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "user" | "agent" | "admin";
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: { label: string; path: string; icon: React.ElementType }[];
}

const userNav: NavItem[] = [
  { label: "Dashboard", icon: Home, path: "/dashboard" },
  { label: "Load Wallet", icon: ArrowDownCircle, path: "/dashboard/deposit" },
  { label: "Withdraw", icon: ArrowUpCircle, path: "/dashboard/withdraw" },
  { label: "Send Money", icon: Send, path: "/dashboard/send" },
  { label: "Buy Airtime", icon: Phone, path: "/dashboard/airtime" },
  { label: "Statements", icon: FileText, path: "/dashboard/statements" },
  { label: "Notifications", icon: Bell, path: "/dashboard/notifications" },
  { label: "Profile & KYC", icon: User, path: "/dashboard/profile" },
];

const agentNav: NavItem[] = [
  { label: "Dashboard", icon: Home, path: "/agent" },
  { label: "Deposit to Wallet", icon: ArrowDownCircle, path: "/agent/deposit" },
  { label: "Withdraw", icon: ArrowUpCircle, path: "/agent/withdraw" },
  { label: "Send To", icon: Send, children: [
    { label: "Send to User Wallet", icon: Wallet, path: "/agent/transfer" },
    { label: "Send to Agent Wallet", icon: Shield, path: "/agent/transfer-agent" },
    { label: "Send to Phone", icon: Phone, path: "/agent/transfer-phone" },
  ]},
  { label: "Sell Airtime", icon: Phone, path: "/agent/sell-airtime" },
  { label: "Commissions", icon: DollarSign, path: "/agent/commissions" },
  { label: "Statements", icon: FileText, path: "/agent/statements" },
  { label: "Notifications", icon: Bell, path: "/agent/notifications" },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", icon: Home, path: "/admin" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Agents", icon: Shield, path: "/admin/agents" },
  { label: "Transactions", icon: BarChart3, children: [
    { label: "Deposits", icon: ArrowDownCircle, path: "/admin/deposits" },
    { label: "Withdrawals", icon: ArrowUpCircle, path: "/admin/withdrawals" },
    { label: "Transfers", icon: Send, path: "/admin/transfers" },
    { label: "Statements", icon: FileText, path: "/admin/statements" },
    { label: "Reports", icon: BarChart3, path: "/admin/reports" },
  ]},
  { label: "Fees & Charges", icon: Settings, path: "/admin/fees" },
  { label: "Currencies", icon: Globe, path: "/admin/currencies" },
  { label: "Airtime", icon: Phone, path: "/admin/airtime" },
  { label: "Admin Actions", icon: Wallet, path: "/admin/actions" },
  { label: "Audit Logs", icon: FileText, path: "/admin/audit" },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);
  const { user, loading: authLoading, signOut } = useAuth();
  const { role: dbRole, loading: roleLoading } = useRole();
  const { profile } = useProfile();

  const nav = role === "admin" ? adminNav : role === "agent" ? agentNav : userNav;
  const roleLabel = role === "admin" ? "Administrator" : role === "agent" ? "Agent" : "User";

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Redirect if role mismatch
  useEffect(() => {
    if (!roleLoading && dbRole && user) {
      if (dbRole !== role) {
        if (dbRole === "admin") navigate("/admin", { replace: true });
        else if (dbRole === "agent") navigate("/agent", { replace: true });
        else navigate("/dashboard", { replace: true });
      }
    }
  }, [dbRole, roleLoading, role, user, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const toggleDropdown = (label: string) => {
    setOpenDropdowns((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (path?: string) => path && location.pathname === path;
  const isDropdownActive = (item: NavItem) =>
    item.children?.some((c) => location.pathname === c.path);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderNavItem = (item: NavItem) => {
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
        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
          isActive(item.path)
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
        }`}
      >
        <item.icon className="w-4 h-4" />
        {item.label}
      </Link>
    );
  };

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold">AbanRemit</h1>
        <p className="text-xs opacity-80 mt-1">{roleLabel} Portal</p>
        {profile && (
          <p className="text-xs opacity-60 mt-0.5 truncate">{profile.full_name}</p>
        )}
      </div>

      {profile && role !== "admin" && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="opacity-60">KYC:</span>
            <Badge
              variant={profile.kyc_status === "approved" ? "default" : profile.kyc_status === "pending" ? "secondary" : "destructive"}
              className="text-[10px] h-5"
            >
              {profile.kyc_status.charAt(0).toUpperCase() + profile.kyc_status.slice(1)}
            </Badge>
          </div>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map(renderNavItem)}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </div>
      <div className="px-4 pb-4 text-xs opacity-60 space-y-1">
        <p>📞 +254 728 825 152</p>
        <p>✉️ support@abancool.com</p>
        <p>💬 WhatsApp: +254 728 825 152</p>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground flex-shrink-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <div className="flex justify-end p-2">
              <button onClick={() => setMobileOpen(false)} className="p-2 text-sidebar-foreground/80">
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <button onClick={() => setMobileOpen(true)} className="p-1">
            <Menu className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-primary">AbanRemit</h1>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{roleLabel}</span>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>

        <nav className="md:hidden flex border-t border-border bg-card">
          {nav.filter(i => i.path).slice(0, 5).map((item) => (
            <Link
              key={item.path}
              to={item.path!}
              className={`flex-1 flex flex-col items-center py-2 text-xs ${
                isActive(item.path) ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5 mb-1" />
              {item.label.split(" ")[0]}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default DashboardLayout;

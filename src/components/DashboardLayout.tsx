import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Home, Wallet, ArrowDownCircle, ArrowUpCircle, FileText, Bell, User, 
  Users, Settings, Shield, BarChart3, Send, Phone, LogOut, DollarSign
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "user" | "agent" | "admin";
}

const userNav = [
  { label: "Dashboard", icon: Home, path: "/dashboard" },
  { label: "Deposit", icon: ArrowDownCircle, path: "/dashboard/deposit" },
  { label: "Withdraw", icon: ArrowUpCircle, path: "/dashboard/withdraw" },
  { label: "Send Money", icon: Send, path: "/dashboard/send" },
  { label: "Buy Airtime", icon: Phone, path: "/dashboard/airtime" },
  { label: "Statements", icon: FileText, path: "/dashboard/statements" },
  { label: "Notifications", icon: Bell, path: "/dashboard/notifications" },
  { label: "Profile", icon: User, path: "/dashboard/profile" },
];

const agentNav = [
  { label: "Dashboard", icon: Home, path: "/agent" },
  { label: "Deposit to Wallet", icon: ArrowDownCircle, path: "/agent/deposit" },
  { label: "Withdraw", icon: ArrowUpCircle, path: "/agent/withdraw" },
  { label: "Transfer", icon: Send, path: "/agent/transfer" },
  { label: "Commissions", icon: DollarSign, path: "/agent/commissions" },
  { label: "Statements", icon: FileText, path: "/agent/statements" },
  { label: "Notifications", icon: Bell, path: "/agent/notifications" },
];

const adminNav = [
  { label: "Dashboard", icon: Home, path: "/admin" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Agents", icon: Shield, path: "/admin/agents" },
  { label: "Transactions", icon: BarChart3, path: "/admin/transactions" },
  { label: "Fees & Charges", icon: Settings, path: "/admin/fees" },
  { label: "Admin Actions", icon: Wallet, path: "/admin/actions" },
  { label: "Audit Logs", icon: FileText, path: "/admin/audit" },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const nav = role === "admin" ? adminNav : role === "agent" ? agentNav : userNav;
  const roleLabel = role === "admin" ? "Administrator" : role === "agent" ? "Agent" : "User";

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold">AbanRemit</h1>
          <p className="text-xs opacity-80 mt-1">{roleLabel} Portal</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
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
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <h1 className="text-lg font-bold text-primary">AbanRemit</h1>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{roleLabel}</span>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-border bg-card">
          {nav.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center py-2 text-xs ${
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-5 h-5 mb-1" />
                {item.label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default DashboardLayout;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";

// User pages
import UserDashboard from "./pages/dashboard/UserDashboard";
import DepositPage from "./pages/dashboard/user/DepositPage";
import WithdrawPage from "./pages/dashboard/user/WithdrawPage";
import SendMoneyPage from "./pages/dashboard/user/SendMoneyPage";
import BuyAirtimePage from "./pages/dashboard/user/BuyAirtimePage";
import StatementsPage from "./pages/dashboard/user/StatementsPage";
import NotificationsPage from "./pages/dashboard/user/NotificationsPage";
import ProfilePage from "./pages/dashboard/user/ProfilePage";

// Agent pages
import AgentDashboard from "./pages/dashboard/AgentDashboard";
import AgentDepositPage from "./pages/dashboard/agent/AgentDepositPage";
import AgentWithdrawPage from "./pages/dashboard/agent/AgentWithdrawPage";
import AgentTransferPage from "./pages/dashboard/agent/AgentTransferPage";
import AgentTransferAgentPage from "./pages/dashboard/agent/AgentTransferAgentPage";
import AgentTransferPhonePage from "./pages/dashboard/agent/AgentTransferPhonePage";
import AgentSellAirtimePage from "./pages/dashboard/agent/AgentSellAirtimePage";
import AgentCommissionsPage from "./pages/dashboard/agent/AgentCommissionsPage";
import AgentStatementsPage from "./pages/dashboard/agent/AgentStatementsPage";
import AgentNotificationsPage from "./pages/dashboard/agent/AgentNotificationsPage";

// Admin pages
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import AdminUsersPage from "./pages/dashboard/admin/AdminUsersPage";
import AdminAgentsPage from "./pages/dashboard/admin/AdminAgentsPage";
import AdminTransactionListPage from "./pages/dashboard/admin/AdminTransactionListPage";
import AdminStatementsPage from "./pages/dashboard/admin/AdminStatementsPage";
import AdminReportsPage from "./pages/dashboard/admin/AdminReportsPage";
import AdminFeesPage from "./pages/dashboard/admin/AdminFeesPage";
import AdminCurrenciesPage from "./pages/dashboard/admin/AdminCurrenciesPage";
import AdminAirtimePage from "./pages/dashboard/admin/AdminAirtimePage";
import AdminActionsPage from "./pages/dashboard/admin/AdminActionsPage";
import AdminAuditPage from "./pages/dashboard/admin/AdminAuditPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* User routes */}
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/dashboard/deposit" element={<DepositPage />} />
          <Route path="/dashboard/withdraw" element={<WithdrawPage />} />
          <Route path="/dashboard/send" element={<SendMoneyPage />} />
          <Route path="/dashboard/airtime" element={<BuyAirtimePage />} />
          <Route path="/dashboard/statements" element={<StatementsPage />} />
          <Route path="/dashboard/notifications" element={<NotificationsPage />} />
          <Route path="/dashboard/profile" element={<ProfilePage />} />

          {/* Agent routes */}
          <Route path="/agent" element={<AgentDashboard />} />
          <Route path="/agent/deposit" element={<AgentDepositPage />} />
          <Route path="/agent/withdraw" element={<AgentWithdrawPage />} />
          <Route path="/agent/transfer" element={<AgentTransferPage />} />
          <Route path="/agent/transfer-agent" element={<AgentTransferAgentPage />} />
          <Route path="/agent/transfer-phone" element={<AgentTransferPhonePage />} />
          <Route path="/agent/sell-airtime" element={<AgentSellAirtimePage />} />
          <Route path="/agent/commissions" element={<AgentCommissionsPage />} />
          <Route path="/agent/statements" element={<AgentStatementsPage />} />
          <Route path="/agent/notifications" element={<AgentNotificationsPage />} />

          {/* Admin routes - separate transaction pages */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/agents" element={<AdminAgentsPage />} />
          <Route path="/admin/deposits" element={<AdminTransactionListPage type="deposit" />} />
          <Route path="/admin/withdrawals" element={<AdminTransactionListPage type="withdrawal" />} />
          <Route path="/admin/transfers" element={<AdminTransactionListPage type="transfer" />} />
          <Route path="/admin/statements" element={<AdminStatementsPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/fees" element={<AdminFeesPage />} />
          <Route path="/admin/currencies" element={<AdminCurrenciesPage />} />
          <Route path="/admin/airtime" element={<AdminAirtimePage />} />
          <Route path="/admin/actions" element={<AdminActionsPage />} />
          <Route path="/admin/audit" element={<AdminAuditPage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

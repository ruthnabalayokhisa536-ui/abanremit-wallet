import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import RegisterWithOTP from "./pages/RegisterWithOTP";
import AuthCallback from "./pages/AuthCallback";

/* ================= USER PAGES ================= */
import UserDashboard from "./pages/dashboard/UserDashboard";
import DepositPage from "./pages/dashboard/user/DepositPage";
import WithdrawPage from "./pages/dashboard/user/WithdrawPage";
import SendMoneyPage from "./pages/dashboard/user/SendMoneyPage";
import BuyAirtimePage from "./pages/dashboard/user/BuyAirtimePage";
import StatementsPage from "./pages/dashboard/user/StatementsPage";
import NotificationsPage from "./pages/dashboard/user/NotificationsPage";
import ProfilePage from "./pages/dashboard/user/ProfilePage";
import KYCVerificationPage from "./pages/dashboard/user/KYCVerificationPage"; // ✅ ADDED

/* ================= AGENT PAGES ================= */
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

/* ================= ADMIN PAGES ================= */
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import AdminUsersPage from "./pages/dashboard/admin/AdminUsersPage";
import AdminAgentsPage from "./pages/dashboard/admin/AdminAgentsPage";
import AdminBulkSMSPage from "./pages/dashboard/admin/AdminBulkSMSPage";
import AdminTransactionListPage from "./pages/dashboard/admin/AdminTransactionListPage";
import AdminStatementsPage from "./pages/dashboard/admin/AdminStatementsPage";
import AdminReportsPage from "./pages/dashboard/admin/AdminReportsPage";
import AdminFeesPage from "./pages/dashboard/admin/AdminFeesPage";
import AdminCurrenciesPage from "./pages/dashboard/admin/AdminCurrenciesPage";
import AdminAirtimePage from "./pages/dashboard/admin/AdminAirtimePage";
import AdminActionsPage from "./pages/dashboard/admin/AdminActionsPage";
import AdminAuditPage from "./pages/dashboard/admin/AdminAuditPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterWithOTP />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* ================= USER ROUTES ================= */}
            <Route path="/dashboard">
              <Route index element={<UserDashboard />} />
              <Route path="deposit" element={<DepositPage />} />
              <Route path="withdraw" element={<WithdrawPage />} />
              <Route path="send" element={<SendMoneyPage />} />
              <Route path="airtime" element={<BuyAirtimePage />} />
              <Route path="statements" element={<StatementsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<ProfilePage />} />

              {/* ✅ KYC ROUTE FIXED */}
              <Route
                path="kyc-verification"
                element={<KYCVerificationPage />}
              />
            </Route>

            {/* ================= AGENT ROUTES ================= */}
            <Route path="/agent">
              <Route index element={<AgentDashboard />} />
              <Route path="deposit" element={<AgentDepositPage />} />
              <Route path="withdraw" element={<AgentWithdrawPage />} />
              <Route path="transfer" element={<AgentTransferPage />} />
              <Route path="transfer-agent" element={<AgentTransferAgentPage />} />
              <Route path="transfer-phone" element={<AgentTransferPhonePage />} />
              <Route path="sell-airtime" element={<AgentSellAirtimePage />} />
              <Route path="commissions" element={<AgentCommissionsPage />} />
              <Route path="statements" element={<AgentStatementsPage />} />
              <Route path="notifications" element={<AgentNotificationsPage />} />
            </Route>

            {/* ================= ADMIN ROUTES ================= */}
            <Route path="/admin">
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="agents" element={<AdminAgentsPage />} />
              <Route path="bulk-sms" element={<AdminBulkSMSPage />} />
              <Route path="deposits" element={<AdminTransactionListPage type="deposit" />} />
              <Route path="withdrawals" element={<AdminTransactionListPage type="withdrawal" />} />
              <Route path="transfers" element={<AdminTransactionListPage type="transfer" />} />
              <Route path="statements" element={<AdminStatementsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="fees" element={<AdminFeesPage />} />
              <Route path="currencies" element={<AdminCurrenciesPage />} />
              <Route path="airtime" element={<AdminAirtimePage />} />
              <Route path="actions" element={<AdminActionsPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

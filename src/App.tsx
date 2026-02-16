import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { NavigationSystemProvider } from "./contexts/NavigationSystemContext";
import { SkeletonPage } from "./components/skeletons";

// Skeleton loading component (replaces spinner)
const PageLoader = () => <SkeletonPage />;

// Eager load critical pages (login, register)
import Login from "./pages/Login";
import RegisterWithOTP from "./pages/RegisterWithOTP";
import AuthCallback from "./pages/AuthCallback";

// Lazy load all other pages
const NotFound = lazy(() => import("./pages/NotFound"));

/* ================= USER PAGES (LAZY) ================= */
const UserDashboard = lazy(() => import("./pages/dashboard/UserDashboard"));
const DepositPage = lazy(() => import("./pages/dashboard/user/DepositPage"));
const WithdrawPage = lazy(() => import("./pages/dashboard/user/WithdrawPage"));
const SendMoneyPage = lazy(() => import("./pages/dashboard/user/SendMoneyPage"));
const BuyAirtimePage = lazy(() => import("./pages/dashboard/user/BuyAirtimePage"));
const StatementsPage = lazy(() => import("./pages/dashboard/user/StatementsPage"));
const NotificationsPage = lazy(() => import("./pages/dashboard/user/NotificationsPage"));
const ProfilePage = lazy(() => import("./pages/dashboard/user/ProfilePage"));
const SetupPinPage = lazy(() => import("./pages/dashboard/user/SetupPinPage"));
const KYCVerificationPage = lazy(() => import("./pages/dashboard/user/KYCVerificationPage"));

/* ================= AGENT PAGES (LAZY) ================= */
const AgentDashboard = lazy(() => import("./pages/dashboard/AgentDashboard"));
const AgentDepositPage = lazy(() => import("./pages/dashboard/agent/AgentDepositPage"));
const AgentWithdrawPage = lazy(() => import("./pages/dashboard/agent/AgentWithdrawPage"));
const AgentTransferPage = lazy(() => import("./pages/dashboard/agent/AgentTransferPage"));
const AgentTransferAgentPage = lazy(() => import("./pages/dashboard/agent/AgentTransferAgentPage"));
const AgentTransferPhonePage = lazy(() => import("./pages/dashboard/agent/AgentTransferPhonePage"));
const AgentSellAirtimePage = lazy(() => import("./pages/dashboard/agent/AgentSellAirtimePage"));
const AgentCommissionsPage = lazy(() => import("./pages/dashboard/agent/AgentCommissionsPage"));
const AgentStatementsPage = lazy(() => import("./pages/dashboard/agent/AgentStatementsPage"));
const AgentNotificationsPage = lazy(() => import("./pages/dashboard/agent/AgentNotificationsPage"));

/* ================= ADMIN PAGES (LAZY) ================= */
const AdminDashboard = lazy(() => import("./pages/dashboard/AdminDashboard"));
const AdminUsersPage = lazy(() => import("./pages/dashboard/admin/AdminUsersPage"));
const AdminAgentsPage = lazy(() => import("./pages/dashboard/admin/AdminAgentsPage"));
const AdminBulkSMSPage = lazy(() => import("./pages/dashboard/admin/AdminBulkSMSPage"));
const AdminTransactionListPage = lazy(() => import("./pages/dashboard/admin/AdminTransactionListPage"));
const AdminStatementsPage = lazy(() => import("./pages/dashboard/admin/AdminStatementsPage"));
const AdminReportsPage = lazy(() => import("./pages/dashboard/admin/AdminReportsPage"));
const AdminFeesPage = lazy(() => import("./pages/dashboard/admin/AdminFeesPage"));
const AdminCurrenciesPage = lazy(() => import("./pages/dashboard/admin/AdminCurrenciesPage"));
const AdminAirtimePage = lazy(() => import("./pages/dashboard/admin/AdminAirtimePage"));
const AdminActionsPage = lazy(() => import("./pages/dashboard/admin/AdminActionsPage"));
const AdminAuditPage = lazy(() => import("./pages/dashboard/admin/AdminAuditPage"));
const AdminDepositsPage = lazy(() => import("./pages/dashboard/admin/AdminDepositsPage"));

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <NavigationSystemProvider>
            <Suspense fallback={<PageLoader />}>
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
              <Route path="setup-pin" element={<SetupPinPage />} />

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
              <Route path="deposits" element={<AdminDepositsPage />} />
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
            </Suspense>
          </NavigationSystemProvider>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

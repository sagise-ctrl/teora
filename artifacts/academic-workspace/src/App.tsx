import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/hooks/protected-route";
import NotFound from "@/pages/not-found";
import { Route, Switch, Router as WouterRouter } from "wouter";
import Dashboard from "@/pages/dashboard";
import NewProject from "@/pages/new-project";
import ProjectWorkspace from "@/pages/project";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Confirm from "@/pages/confirm";
import AuthCallback from "@/pages/auth-callback";
import FinOps from "@/pages/finops";
import Referral from "@/pages/referral";
import AIPricing from "@/pages/ai-pricing";
import Topup from "@/pages/topup";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Monitoring from "@/pages/monitoring";
import Admin from "@/pages/admin";
import LandingAdmin from "@/pages/landing-admin";
import AdminUsers from "@/pages/admin-users";
import AdminFinOps from "@/pages/admin-finops";
import AdminUsage from "@/pages/admin-usage";
import AdminAITiers from "@/pages/admin-ai-tiers";
import AdminHealth from "@/pages/admin-health";
import AdminAuditLog from "@/pages/admin-audit-log";
import AdminReports from "@/pages/admin-reports";
import Profile from "@/pages/profile";
import PustakaSaya from "@/pages/pustaka-saya";
import Assessment from "@/pages/assessment";
import Akun from "@/pages/akun";
import SharedProject from "@/pages/shared";
import Layout from "@/components/layout";

const queryClient = new QueryClient();

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: "easeIn" } },
};

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col flex-1 min-h-0"
    >
      {children}
    </motion.div>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/auth/confirm" component={Confirm} />
      <Route path="/auth/callback" component={AuthCallback} />
      {/* Public shared project route — no auth required */}
      <Route path="/shared/:token" component={SharedProject} />
      <Route path="/">
        <ProtectedRoute>
          <Layout>
            <AnimatedPage><Dashboard /></AnimatedPage>
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/projects/new">
        <ProtectedRoute>
          <Layout>
            <AnimatedPage><NewProject /></AnimatedPage>
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/projects/:id">
        <ProtectedRoute>
          <Layout>
            <AnimatedPage><ProjectWorkspace /></AnimatedPage>
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/finops">
        <ProtectedRoute>
          <Layout>
            <AnimatedPage><FinOps /></AnimatedPage>
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/referral">
        <ProtectedRoute>
          <Layout>
            <AnimatedPage><Referral /></AnimatedPage>
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/ai-pricing">
        <ProtectedRoute>
          <Layout>
            <AnimatedPage><AIPricing /></AnimatedPage>
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/topup">
        <ProtectedRoute>
          <Layout>
            <AnimatedPage><Topup /></AnimatedPage>
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/status" component={Monitoring} />
      <Route path="/landing-admin">
        <ProtectedRoute>
          <AnimatedPage><LandingAdmin /></AnimatedPage>
        </ProtectedRoute>
      </Route>
      {/* Admin routes — /admin sub-pages must come before /admin */}
      <Route path="/admin/users"><ProtectedRoute><AdminUsers /></ProtectedRoute></Route>
      <Route path="/admin/finops"><ProtectedRoute><AdminFinOps /></ProtectedRoute></Route>
      <Route path="/admin/usage"><ProtectedRoute><AdminUsage /></ProtectedRoute></Route>
      <Route path="/admin/ai-tiers"><ProtectedRoute><AdminAITiers /></ProtectedRoute></Route>
      <Route path="/admin/health"><ProtectedRoute><AdminHealth /></ProtectedRoute></Route>
      <Route path="/admin/audit-log"><ProtectedRoute><AdminAuditLog /></ProtectedRoute></Route>
      <Route path="/admin/reports"><ProtectedRoute><AdminReports /></ProtectedRoute></Route>
      <Route path="/admin"><ProtectedRoute><Admin /></ProtectedRoute></Route>
      <Route path="/profile">
        <ProtectedRoute>
          <Layout>
            <AnimatedPage><Profile /></AnimatedPage>
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/pustaka-saya">
        <ProtectedRoute>
          <Layout>
            <AnimatedPage><PustakaSaya /></AnimatedPage>
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/assessment">
        <ProtectedRoute>
          <Layout>
            <AnimatedPage><Assessment /></AnimatedPage>
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/akun">
        <ProtectedRoute>
          <Layout>
            <AnimatedPage><Akun /></AnimatedPage>
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

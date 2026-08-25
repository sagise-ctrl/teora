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
import FinOps from "@/pages/finops";
import Referral from "@/pages/referral";
import AIPricing from "@/pages/ai-pricing";
import Topup from "@/pages/topup";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Monitoring from "@/pages/monitoring";
import Admin from "@/pages/admin";
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
      <Route path="/admin">
        <ProtectedRoute>
          <Layout>
            <AnimatedPage><Admin /></AnimatedPage>
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

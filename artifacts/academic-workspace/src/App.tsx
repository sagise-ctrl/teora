import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Monitoring from "@/pages/monitoring";
import Admin from "@/pages/admin";
import SharedProject from "@/pages/shared";
import Layout from "@/components/layout";

const queryClient = new QueryClient();

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
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/projects/new">
        <ProtectedRoute>
          <Layout>
            <NewProject />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/projects/:id">
        <ProtectedRoute>
          <Layout>
            <ProjectWorkspace />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/finops">
        <ProtectedRoute>
          <Layout>
            <FinOps />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/referral">
        <ProtectedRoute>
          <Layout>
            <Referral />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/status" component={Monitoring} />
      <Route path="/admin">
        <ProtectedRoute>
          <Layout>
            <Admin />
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

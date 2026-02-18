import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

import LoginPage from "@/pages/login";
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const OrdersPage = lazy(() => import("@/pages/orders"));
const ProductsPage = lazy(() => import("@/pages/products"));
const UsersPage = lazy(() => import("@/pages/users"));
const EntitiesPage = lazy(() => import("@/pages/entities"));
const GrossistesPage = lazy(() => import("@/pages/grossistes"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const HistoryPage = lazy(() => import("@/pages/history"));
const StatsPage = lazy(() => import("@/pages/stats"));
const OffersPage = lazy(() => import("@/pages/offers"));
const CommunicationsPage = lazy(() => import("@/pages/communications"));
import NotFound from "@/pages/not-found";

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

function RoleRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { user } = useAuth();
  
  if (!user || !roles.includes(user.role)) {
    return <NotFound />;
  }
  
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/users">
        <RoleRoute roles={["admin", "laboratoire"]}>
          <UsersPage />
        </RoleRoute>
      </Route>
      <Route path="/entities">
        <RoleRoute roles={["admin", "laboratoire"]}>
          <EntitiesPage />
        </RoleRoute>
      </Route>
      <Route path="/grossistes">
        <RoleRoute roles={["admin", "laboratoire"]}>
          <GrossistesPage />
        </RoleRoute>
      </Route>
      <Route path="/offers" component={OffersPage} />
      <Route path="/actions" component={OffersPage} />
      <Route path="/communications" component={CommunicationsPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/history">
        <RoleRoute roles={["admin", "laboratoire"]}>
          <HistoryPage />
        </RoleRoute>
      </Route>
      <Route path="/stats" component={StatsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto bg-background">
            <Suspense fallback={<PageLoader />}>
              <Router />
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ProtectedRoute>
            <AuthenticatedApp />
          </ProtectedRoute>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

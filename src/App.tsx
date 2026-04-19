import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PWAInstallProvider } from "@/contexts/PWAInstallContext";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Index from "./pages/Index";
import GroupDetail from "./pages/GroupDetail";
import GroupMembers from "./pages/GroupMembers";
import CreateGroup from "./pages/CreateGroup";
import Contacts from "./pages/Contacts";
import Profil from "./pages/Profil";
import ContactDetail from "./pages/ContactDetail";
import Legal from "./pages/Legal";
import ListingRedirect from "./pages/ListingRedirect";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : (localStorage.getItem('onboarded') ? <Login /> : <Navigate to="/onboarding" replace />)} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Index />} />
        <Route path="/group/:id" element={<GroupDetail />} />
        <Route path="/group/:id/members" element={<GroupMembers />} />
        <Route path="/create-group" element={<CreateGroup />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/contact/:userId" element={<ContactDetail />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/legal/:page" element={<Legal />} />
        <Route path="/listing/:id" element={<ListingRedirect />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <PWAInstallProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </PWAInstallProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PWAInstallProvider } from "@/contexts/PWAInstallContext";
import { SplashScreen, shouldShowSplash } from "@/components/SplashScreen";
import Login from "./pages/Login";
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
import Drafts from "./pages/Drafts";
import Publish from "./pages/Publish";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/profil" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Routes publiques (navigation, recherche, slider, propriétés Zwandako) */}
      <Route element={<Layout />}>
        <Route path="/" element={<Index />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/contact/:userId" element={<ContactDetail />} />
        <Route path="/legal/:page" element={<Legal />} />
        <Route path="/listing/:id" element={<ListingRedirect />} />
        {/* Routes nécessitant une connexion */}
        <Route path="/group/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
        <Route path="/group/:id/members" element={<ProtectedRoute><GroupMembers /></ProtectedRoute>} />
        <Route path="/create-group" element={<ProtectedRoute><CreateGroup /></ProtectedRoute>} />
        <Route path="/drafts" element={<ProtectedRoute><Drafts /></ProtectedRoute>} />
        <Route path="/publish" element={<ProtectedRoute><Publish /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(() => shouldShowSplash());
  return (
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
            {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
          </TooltipProvider>
        </PWAInstallProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

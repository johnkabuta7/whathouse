import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
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
import OffreImmo from "./pages/OffreImmo";
import ContactDetail from "./pages/ContactDetail";
import Legal from "./pages/Legal";
import ListingPreview from "./pages/ListingPreview";
import NotFound from "./pages/NotFound";
import Drafts from "./pages/Drafts";
import Publish from "./pages/Publish";
import CollaborationRequest from "./pages/CollaborationRequest";
import CollaborationInbox from "./pages/CollaborationInbox";
import AdminDashboard from "./pages/AdminDashboard";
import Affaires from "./pages/Affaires";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days — keep data available offline
      staleTime: 1000 * 30,
      retry: 2,
    },
  },
});

// Persist read-only cache to localStorage so the app shows real content offline.
// Sensitive keys (auth/session/token) are never used as query keys in this app,
// but we defensively strip them anyway.
if (typeof window !== 'undefined') {
  try {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: 'wh-rq-cache-v1',
      throttleTime: 1000,
    });
    persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      dehydrateOptions: {
        shouldDehydrateQuery: (q) => {
          const key = JSON.stringify(q.queryKey).toLowerCase();
          if (key.includes('token') || key.includes('session') || key.includes('auth')) return false;
          return q.state.status === 'success';
        },
      },
    });
  } catch {}
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (!user) {
    try {
      // Petit toast non-bloquant via event consommable, sinon Navigate suffit
      window.dispatchEvent(new CustomEvent('wh:auth-required'));
    } catch {}
    return <Navigate to="/profil" replace />;
  }
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
        <Route path="/affaires" element={<ProtectedRoute><Affaires /></ProtectedRoute>} />
        <Route path="/offre-immo" element={<OffreImmo />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/contact/:userId" element={<ContactDetail />} />
        <Route path="/legal/:page" element={<Legal />} />
        <Route path="/listing/:id" element={<ListingPreview />} />
        {/* Routes nécessitant une connexion */}
        <Route path="/group/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
        <Route path="/group/:id/members" element={<ProtectedRoute><GroupMembers /></ProtectedRoute>} />
        <Route path="/create-group" element={<ProtectedRoute><CreateGroup /></ProtectedRoute>} />
        <Route path="/drafts" element={<ProtectedRoute><Drafts /></ProtectedRoute>} />
        <Route path="/publish" element={<ProtectedRoute><Publish /></ProtectedRoute>} />
        <Route path="/collaboration/request" element={<ProtectedRoute><CollaborationRequest /></ProtectedRoute>} />
        <Route path="/collaboration/inbox" element={<ProtectedRoute><CollaborationInbox /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
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

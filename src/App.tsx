import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import Restaurants from "./pages/Restaurants";
import Sejours from "./pages/Sejours";
import Attractions from "./pages/Attractions";
import Conseils from "./pages/Conseils";
import Profil from "./pages/Profil";
import ListingDetail from "./pages/ListingDetail";
import PostDetail from "./pages/PostDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/restaurants" element={<Restaurants />} />
            <Route path="/sejours" element={<Sejours />} />
            <Route path="/attractions" element={<Attractions />} />
            <Route path="/conseils" element={<Conseils />} />
            <Route path="/profil" element={<Profil />} />
          </Route>
          <Route path="/detail/:type/:id" element={<ListingDetail />} />
          <Route path="/conseil/:id" element={<PostDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

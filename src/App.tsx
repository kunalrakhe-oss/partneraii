import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import HomePage from "@/pages/HomePage";
import CalendarPage from "@/pages/CalendarPage";
import GroceryPage from "@/pages/GroceryPage";
import MoodPage from "@/pages/MoodPage";
import ChoresPage from "@/pages/ChoresPage";
import ChatPage from "@/pages/ChatPage";
import ProfilePage from "@/pages/ProfilePage";
import MemoriesPage from "@/pages/MemoriesPage";
import WelcomePage from "@/pages/WelcomePage";
import PartnerConnectPage from "@/pages/PartnerConnectPage";
import NotFound from "@/pages/NotFound";
import { useState } from "react";

const queryClient = new QueryClient();

function AppRoutes() {
  const [onboarded, setOnboarded] = useState(() => {
    try {
      const val = localStorage.getItem("lovelist-onboarded");
      return val ? JSON.parse(val) : "";
    } catch {
      return "";
    }
  });

  const handleOnboard = () => {
    localStorage.setItem("lovelist-onboarded", JSON.stringify("true"));
    setOnboarded("true");
  };

  if (!onboarded) {
    return (
      <Routes>
        <Route path="/welcome" element={<WelcomePage onComplete={handleOnboard} />} />
        <Route path="/connect" element={<PartnerConnectPage />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/lists" element={<GroceryPage />} />
        <Route path="/mood" element={<MoodPage />} />
        <Route path="/chores" element={<ChoresPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/connect" element={<PartnerConnectPage />} />
        <Route path="/memories" element={<MemoriesPage />} />
      </Route>
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

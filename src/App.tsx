import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DemoProvider } from "@/contexts/DemoContext";
import AppLayout from "@/components/AppLayout";
import HomePage from "@/pages/HomePage";
import CalendarPage from "@/pages/CalendarPage";
import GroceryPage from "@/pages/GroceryPage";
import MoodPage from "@/pages/MoodPage";
import ChoresPage from "@/pages/ChoresPage";
import ChatPage from "@/pages/ChatPage";
import ProfilePage from "@/pages/ProfilePage";
import MemoriesPage from "@/pages/MemoriesPage";
import WorkoutPage from "@/pages/WorkoutPage";
import DietPage from "@/pages/DietPage";
import PartnerConnectPage from "@/pages/PartnerConnectPage";
import CoupleProfilePage from "@/pages/CoupleProfilePage";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "@/pages/NotFound";
import OnboardingFlow from "@/pages/OnboardingFlow";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated — show auth pages only
  const onboardingDone = localStorage.getItem("lovelist-onboarding-done") === "true";
  const defaultRoute = onboardingDone ? "/auth" : "/onboarding";

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/onboarding" element={<OnboardingFlow />} />
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    );
  }

  // Authenticated — if user chose "real" path, exit demo and resume onboarding
  const onboardIntent = localStorage.getItem("lovelist-onboard-intent");
  if (onboardIntent === "real") {
    localStorage.removeItem("lovelist-onboard-intent");
    localStorage.setItem("lovelist-demo-dismissed", "true");
    // Don't mark onboarding done — let them finish the setup flow
    return (
      <Routes>
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={<OnboardingFlow />} />
      </Routes>
    );
  }

  // Authenticated — mark onboarding done (user has an account, no need for onboarding)
  if (localStorage.getItem("lovelist-onboarding-done") !== "true") {
    localStorage.setItem("lovelist-onboarding-done", "true");
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingFlow />} />
      <Route element={<AppLayout />}>
        <Route path="/connect" element={<PartnerConnectPage />} />
        <Route path="/couple" element={<CoupleProfilePage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/lists" element={<GroceryPage />} />
        <Route path="/mood" element={<MoodPage />} />
        <Route path="/chores" element={<ChoresPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/memories" element={<MemoriesPage />} />
      </Route>
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <DemoProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </DemoProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

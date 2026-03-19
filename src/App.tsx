import { useEffect, useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DemoProvider } from "@/contexts/DemoContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
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
import BabyPlanPage from "@/pages/BabyPlanPage";
import MensHealthPage from "@/pages/MensHealthPage";
import PhysioPage from "@/pages/PhysioPage";
import PostpartumPage from "@/pages/PostpartumPage";
import SafetyCheckInPage from "@/pages/SafetyCheckInPage";
import BudgetPage from "@/pages/BudgetPage";
import HealthPage from "@/pages/HealthPage";
import EventPlannerPage from "@/pages/EventPlannerPage";
import PartnerConnectPage from "@/pages/PartnerConnectPage";
import CoupleProfilePage from "@/pages/CoupleProfilePage";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "@/pages/NotFound";
import OnboardingFlow from "@/pages/OnboardingFlow";
import UpgradePage from "@/pages/UpgradePage";
import PostAuthSetup from "@/pages/PostAuthSetup";
import FeatureGate from "@/components/FeatureGate";
import FullscreenExitButton from "@/components/FullscreenExitButton";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  // Authenticated — clean up onboarding state (must be before early returns)
  useEffect(() => {
    if (!user) return;
    const onboardIntent = localStorage.getItem("lovelist-onboard-intent");
    if (onboardIntent === "real") {
      localStorage.removeItem("lovelist-onboard-intent");
      localStorage.setItem("lovelist-demo-dismissed", "true");
    }
  }, [user]);

  // Check if newly authenticated user needs setup
  useEffect(() => {
    if (!user) { setNeedsSetup(null); return; }

    // Always sync localStorage mode selection to DB (even for returning users)
    const syncMode = async () => {
      const savedMode = localStorage.getItem("lovelist-app-mode");
      if (savedMode && (savedMode === "single" || savedMode === "couple")) {
        await supabase.from("profiles").update({ app_mode: savedMode }).eq("user_id", user.id);
        localStorage.removeItem("lovelist-app-mode");
      }
    };
    syncMode();

    // If user already completed setup via this flow, skip
    if (localStorage.getItem("lovelist-setup-done") === "true") {
      setNeedsSetup(false);
      return;
    }
    // Check profile — trigger auto-creates a row, so check if display_name was explicitly set
    const checkProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("app_mode, display_name")
        .eq("user_id", user.id)
        .single();

      // Treat null/empty display_name OR gibberish-looking names as needing setup
      const name = data?.display_name?.trim() || "";
      const looksReal = name.length > 0 && !/^[a-z0-9]{8,}$/i.test(name);

      if (!data || !looksReal) {
        setNeedsSetup(true);
      } else {
        localStorage.setItem("lovelist-setup-done", "true");
        setNeedsSetup(false);
      }
    };
    checkProfile();
  }, [user]);

  if (loading || (user && needsSetup === null)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated — always show onboarding first, with /auth available
  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/onboarding" element={<OnboardingFlow />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  // Needs post-auth setup (mode selection + name)
  if (needsSetup) {
    return (
      <Routes>
        <Route path="/setup" element={<PostAuthSetup />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
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
        <Route path="/memories" element={<FeatureGate feature="memories" featureName="Memories"><MemoriesPage /></FeatureGate>} />
        <Route path="/workout" element={<FeatureGate feature="workout" featureName="Workout Tracking"><WorkoutPage /></FeatureGate>} />
        <Route path="/diet" element={<FeatureGate feature="diet" featureName="Diet Tracking"><DietPage /></FeatureGate>} />
        <Route path="/baby-plan" element={<BabyPlanPage />} />
        <Route path="/mens-health" element={<MensHealthPage />} />
        <Route path="/physio" element={<PhysioPage />} />
        <Route path="/postpartum" element={<PostpartumPage />} />
        <Route path="/safety" element={<SafetyCheckInPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/event-planner" element={<EventPlannerPage />} />
        <Route path="/upgrade" element={<UpgradePage />} />
      </Route>
      {/* Authenticated users always redirect away from auth/onboarding */}
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="/onboarding" element={<Navigate to="/" replace />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function PushNotificationsInit() {
  usePushNotifications();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
      <AuthProvider>
        <SubscriptionProvider>
        <DemoProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <FullscreenExitButton />
            <PushNotificationsInit />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </DemoProvider>
        </SubscriptionProvider>
      </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

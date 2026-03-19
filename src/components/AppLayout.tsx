import { NavLink, Outlet } from "react-router-dom";
import { Home, CalendarDays, ShoppingCart, MessageCircle, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import PartnerNotifications from "@/components/PartnerNotifications";
import DemoBanner from "@/components/DemoBanner";

import VoiceAssistant from "@/components/VoiceAssistant";
import CompletedTasksCleanup from "@/components/CompletedTasksCleanup";
import SmartCommandBar from "@/components/SmartCommandBar";
import { getNavTabs, type NavTabId } from "@/hooks/useLayoutPreferences";
import { useState, useEffect } from "react";

import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const tabMeta: Record<string, { icon: typeof Home; labelKey: string; to: string }> = {
  home: { to: "/", icon: Home, labelKey: "nav.home" },
  calendar: { to: "/calendar", icon: CalendarDays, labelKey: "nav.calendar" },
  lists: { to: "/lists", icon: ShoppingCart, labelKey: "nav.lists" },
  chat: { to: "/chat", icon: MessageCircle, labelKey: "nav.chat" },
  chores: { to: "/chores", icon: ClipboardList, labelKey: "nav.chores" },
};

function GatedVoiceAssistant() {
  const { canAccess } = useSubscriptionContext();
  if (!canAccess("voice-assistant")) return null;
  return <VoiceAssistant />;
}

export default function AppLayout() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [visibleTabs, setVisibleTabs] = useState<NavTabId[]>(getNavTabs);
  const [appMode, setAppMode] = useState<string>("couple");

  // Fetch app_mode from profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("app_mode").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.app_mode) setAppMode(data.app_mode);
      });
  }, [user]);

  // Listen for localStorage changes (when user updates prefs in settings)
  useEffect(() => {
    const onStorage = () => setVisibleTabs(getNavTabs());
    window.addEventListener("storage", onStorage);
    const onFocus = () => setVisibleTabs(getNavTabs());
    window.addEventListener("focus", onFocus);
    const onCustom = () => setVisibleTabs(getNavTabs());
    window.addEventListener("layout-prefs-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("layout-prefs-changed", onCustom);
    };
  }, []);

  const isSingle = appMode === "single";
  const tabs = visibleTabs.map(id => tabMeta[id]).filter(Boolean);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background relative">
      <DemoBanner />
      {!isSingle && <PartnerNotifications />}
      
      <GatedVoiceAssistant />
      <CompletedTasksCleanup />
      <div className="flex-1 overflow-y-auto pb-nav">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 left-0 right-0 glass-card border-t border-border/50 safe-bottom z-50">
        <div className="flex items-center justify-around" style={{ height: 'var(--nav-h)' }}>
          {tabs.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className="relative flex flex-col items-center gap-0.5 px-3 py-2"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute -top-0.5 left-3 right-3 h-[3px] love-gradient rounded-full shadow-glow"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <motion.div
                    animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Icon
                      size={20}
                      className={isActive ? "text-primary drop-shadow-sm" : "text-muted-foreground"}
                    />
                  </motion.div>
                  <span
                    className={`text-[10px] font-semibold tracking-wide ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {t(labelKey)}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

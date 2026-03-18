import { NavLink, Outlet } from "react-router-dom";
import { Home, CalendarDays, ShoppingCart, MessageCircle, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import PartnerNotifications from "@/components/PartnerNotifications";
import DemoBanner from "@/components/DemoBanner";
import PostAuthInstallPrompt from "@/components/PostAuthInstallPrompt";
import VoiceAssistant from "@/components/VoiceAssistant";
import CompletedTasksCleanup from "@/components/CompletedTasksCleanup";
import { getNavTabs, type NavTabId } from "@/hooks/useLayoutPreferences";
import { useState, useEffect } from "react";
import PullToRefresh from "@/components/PullToRefresh";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const [visibleTabs, setVisibleTabs] = useState<NavTabId[]>(getNavTabs);

  // Listen for localStorage changes (when user updates prefs in settings)
  useEffect(() => {
    const onStorage = () => setVisibleTabs(getNavTabs());
    window.addEventListener("storage", onStorage);
    // Also poll on focus in case same-tab change
    const onFocus = () => setVisibleTabs(getNavTabs());
    window.addEventListener("focus", onFocus);
    // Custom event for same-tab updates
    const onCustom = () => setVisibleTabs(getNavTabs());
    window.addEventListener("layout-prefs-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("layout-prefs-changed", onCustom);
    };
  }, []);

  const tabs = visibleTabs.map(id => tabMeta[id]).filter(Boolean);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background relative">
      <DemoBanner />
      <PartnerNotifications />
      <PostAuthInstallPrompt />
      <GatedVoiceAssistant />
      <CompletedTasksCleanup />
      <PullToRefresh>
        <Outlet />
      </PullToRefresh>
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom z-50">
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
                      className="absolute -top-px left-2 right-2 h-0.5 love-gradient rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    size={20}
                    className={isActive ? "text-primary" : "text-muted-foreground"}
                  />
                  <span
                    className={`text-[10px] font-medium ${
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

import { NavLink, Outlet } from "react-router-dom";
import { Home, CalendarDays, ShoppingCart, MessageCircle, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import PartnerNotifications from "@/components/PartnerNotifications";
import DemoBanner from "@/components/DemoBanner";
import PostAuthInstallPrompt from "@/components/PostAuthInstallPrompt";
import VoiceAssistant from "@/components/VoiceAssistant";
import CompletedTasksCleanup from "@/components/CompletedTasksCleanup";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/calendar", icon: CalendarDays, label: "Calendar" },
  { to: "/lists", icon: ShoppingCart, label: "Lists" },
  { to: "/chat", icon: MessageCircle, label: "Chat" },
  { to: "/chores", icon: ClipboardList, label: "Chores" },
];

export default function AppLayout() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background relative">
      <DemoBanner />
      <PartnerNotifications />
      <PostAuthInstallPrompt />
      <VoiceAssistant />
      <CompletedTasksCleanup />
      <main className="flex-1 overflow-y-auto pb-nav">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom z-50">
        <div className="flex items-center justify-around" style={{ height: 'var(--nav-h)' }}>
          {tabs.map(({ to, icon: Icon, label }) => (
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
                    {label}
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

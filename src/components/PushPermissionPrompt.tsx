import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebPush } from "@/hooks/useWebPush";
import { motion, AnimatePresence } from "framer-motion";

const DISMISSED_KEY = "partnerai-push-dismissed";

export default function PushPermissionPrompt() {
  const { permission, subscribe } = useWebPush();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (permission === "unsupported" || permission === "granted" || permission === "denied") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    // Show after a short delay
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, [permission]);

  const handleEnable = async () => {
    await subscribe();
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "true");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-2 left-2 right-2 z-[100] mx-auto max-w-md"
        >
          <div className="rounded-2xl bg-card border border-border shadow-lg p-4 flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 shrink-0">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Enable Notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get reminders for overdue tasks, partner messages & mood check-ins — even when the app is closed.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleEnable} className="text-xs h-8">
                  Turn On
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-xs h-8 text-muted-foreground">
                  Not Now
                </Button>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

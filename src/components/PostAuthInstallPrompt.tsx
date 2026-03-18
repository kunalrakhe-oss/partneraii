import { useEffect, useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const POST_AUTH_PROMPT_KEY = "lovelist-post-auth-install-shown";

/**
 * Secondary install prompt shown once after login/onboarding completion.
 * Only renders inside authenticated routes.
 */
export default function PostAuthInstallPrompt() {
  const { canInstall, isIOS, promptInstall, dismiss } = usePWAInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canInstall || isIOS) return;
    if (localStorage.getItem(POST_AUTH_PROMPT_KEY)) return;
    if (localStorage.getItem("lovelist-install-prompt-disabled") === "true") return;

    // Show after a brief delay once the user lands on a protected page
    const timer = setTimeout(() => {
      setVisible(true);
      localStorage.setItem(POST_AUTH_PROMPT_KEY, "true");
    }, 3000);

    return () => clearTimeout(timer);
  }, [canInstall, isIOS]);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) setVisible(false);
  };

  const handleDismiss = () => {
    dismiss();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-20 left-3 right-3 mx-auto z-[60] max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl love-gradient flex items-center justify-center">
              <Download size={20} className="text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Install LoveLists</p>
              <p className="text-xs text-muted-foreground">Quick access from your home screen</p>
            </div>
            <Button size="sm" className="rounded-xl" onClick={handleInstall}>
              Install
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

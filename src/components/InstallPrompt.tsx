import { useEffect, useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function InstallPrompt() {
  const { canInstall, isIOS, isInstalled, promptInstall, dismiss } = usePWAInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canInstall) return;
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [canInstall]);

  // Show toast on install
  useEffect(() => {
    if (isInstalled) {
      toast.success("LoveLists installed! Find it on your home screen 💕");
    }
  }, [isInstalled]);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    dismiss();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-20 left-2 right-2 mx-auto z-[60] rounded-2xl border border-border bg-card p-4 shadow-xl sm:max-w-md"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl love-gradient flex items-center justify-center">
              <Download size={20} className="text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">
                Add LoveLists to Home Screen
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Install for quick access, offline use & a native app experience.
              </p>
            </div>
          </div>

          {isIOS ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">How to install on iOS:</p>
              <div className="flex items-center gap-2 text-xs text-foreground">
                <Share size={14} className="text-primary flex-shrink-0" />
                <span>Tap the <strong>Share</strong> button in Safari</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground">
                <Plus size={14} className="text-primary flex-shrink-0" />
                <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleDismiss}>
                Got it
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleDismiss}>
                Not now
              </Button>
              <Button size="sm" className="flex-1" onClick={handleInstall}>
                Install
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

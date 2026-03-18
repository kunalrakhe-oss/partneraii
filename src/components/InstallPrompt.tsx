import { useEffect, useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";
import { Download, Share, Plus, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function InstallPrompt() {
  const { canInstall, isIOS, isInstalled, promptInstall, dismiss, isFirstView } = usePWAInstall();
  const [visible, setVisible] = useState(false);

  // Show immediately — no delay
  useEffect(() => {
    if (canInstall && !isInstalled) setVisible(true);
  }, [canInstall]);

  useEffect(() => {
    if (isInstalled) {
      toast.success("LoveLists installed! Find it on your home screen 💕");
    }
  }, [isInstalled]);

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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 40 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            {/* Only show dismiss X on repeat views */}
            {!isFirstView && (
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            )}

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl love-gradient flex items-center justify-center shadow-lg">
                <Smartphone size={32} className="text-primary-foreground" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-center text-lg font-bold text-foreground">
              Get the Full Experience
            </h2>
            <p className="text-center text-sm text-muted-foreground mt-1.5 leading-relaxed">
              Install LoveLists for instant access, offline support & a native app feel.
            </p>

            {isIOS ? (
              <div className="mt-5 space-y-3">
                <p className="text-xs text-muted-foreground font-semibold text-center uppercase tracking-wide">
                  How to install
                </p>
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <Share size={16} className="text-primary" />
                  </div>
                  <span className="text-sm text-foreground">
                    Tap <strong>Share</strong> in Safari
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <Plus size={16} className="text-primary" />
                  </div>
                  <span className="text-sm text-foreground">
                    Tap <strong>Add to Home Screen</strong>
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2 rounded-xl"
                  onClick={handleDismiss}
                >
                  Got it
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                <Button
                  className="w-full rounded-xl h-11 text-base font-semibold gap-2"
                  onClick={handleInstall}
                >
                  <Download size={18} />
                  Install App
                </Button>
                {!isFirstView && (
                  <Button
                    variant="ghost"
                    className="w-full rounded-xl text-muted-foreground"
                    onClick={handleDismiss}
                  >
                    Not now
                  </Button>
                )}
                {isFirstView && (
                  <button
                    onClick={handleDismiss}
                    className="w-full text-center text-xs text-muted-foreground/60 mt-2 hover:text-muted-foreground transition-colors"
                  >
                    Skip for now
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

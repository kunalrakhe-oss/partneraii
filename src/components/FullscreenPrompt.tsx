import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize, X } from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";

const LS_KEY = "fullscreen-prompt-dismissed";

export default function FullscreenPrompt() {
  const { isSupported, isFullscreen, enterFullscreen } = useFullscreen();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isSupported || isFullscreen) return;
    const dismissed = localStorage.getItem(LS_KEY);
    if (!dismissed) {
      // Delay longer to avoid overlapping with the PWA install prompt
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, isFullscreen]);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(LS_KEY, "1");
  };

  const handleGo = async () => {
    await enterFullscreen();
    dismiss();
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-[100]"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-4 right-4 bottom-24 max-w-sm mx-auto bg-card rounded-2xl shadow-xl border border-border z-[100] p-5"
          >
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-muted flex items-center justify-center"
            >
              <X size={14} className="text-muted-foreground" />
            </button>

            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Maximize size={22} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Go Fullscreen?</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Hide the browser bar for an immersive, app-like experience. You can exit anytime.
                </p>
              </div>
              <button
                onClick={handleGo}
                className="w-full love-gradient text-primary-foreground font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
              >
                <Maximize size={16} />
                Go Fullscreen
              </button>
              <button onClick={dismiss} className="text-xs text-muted-foreground font-medium">
                Not now
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

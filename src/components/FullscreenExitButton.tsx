import { motion, AnimatePresence } from "framer-motion";
import { Minimize } from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";

export default function FullscreenExitButton() {
  const { isFullscreen, exitFullscreen } = useFullscreen();

  return (
    <AnimatePresence>
      {isFullscreen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={exitFullscreen}
          className="fixed top-3 right-3 z-[90] w-9 h-9 rounded-full bg-card/80 backdrop-blur-md border border-border shadow-lg flex items-center justify-center active:scale-90 transition-transform"
          title="Exit fullscreen"
        >
          <Minimize size={16} className="text-foreground" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

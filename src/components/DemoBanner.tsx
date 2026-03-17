import { Sparkles, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { useDemo } from "@/contexts/DemoContext";

export default function DemoBanner() {
  const { isDemoMode, exitDemo } = useDemo();
  if (!isDemoMode) return null;

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 border-b border-primary/20 px-4 py-2 flex items-center justify-between gap-2 shrink-0"
    >
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-primary" />
        <span className="text-xs font-semibold text-foreground">Demo Mode</span>
        <span className="text-[10px] text-muted-foreground">Explore with sample data</span>
      </div>
      <button
        onClick={exitDemo}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-soft hover:bg-primary/90 transition-colors"
      >
        <Rocket size={10} />
        Start My Real Journey
      </button>
    </motion.div>
  );
}

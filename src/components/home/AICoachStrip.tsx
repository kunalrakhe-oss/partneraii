import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";

interface AICoachStripProps {
  greeting: string;
  firstName: string;
}

export default function AICoachStrip({ greeting, firstName }: AICoachStripProps) {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const nudge = hour < 12
    ? "Let's make today count ☀️"
    : hour < 17
    ? "How's your afternoon going? 🌤️"
    : "Time to wind down & reflect 🌙";

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate("/chat?tab=ai")}
      className="w-full flex items-center gap-3 rounded-glass bg-card/60 backdrop-blur-glass border border-border/40 px-4 py-3 shadow-card transition-all hover:shadow-elevated"
      style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)", backdropFilter: "blur(40px) saturate(1.8)" }}
    >
      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 animate-glow-pulse">
        <Sparkles size={18} className="text-primary" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-xs text-muted-foreground font-medium">AI Coach</p>
        <p className="text-sm font-semibold text-foreground truncate">{nudge}</p>
      </div>
      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
    </motion.button>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, HeartPulse, Wallet, Users, Sparkles, X } from "lucide-react";

const INTENTS = [
  { id: "plan", label: "Plan my day", icon: CalendarDays, route: "/calendar", color: "from-blue-500/15 to-blue-500/5 border-blue-500/20" },
  { id: "health", label: "Check health", icon: HeartPulse, route: "/health", color: "from-green-500/15 to-green-500/5 border-green-500/20" },
  { id: "finance", label: "Manage finances", icon: Wallet, route: "/budget", color: "from-amber-500/15 to-amber-500/5 border-amber-500/20" },
  { id: "partner", label: "Connect with partner", icon: Users, route: "/chat", color: "from-pink-500/15 to-pink-500/5 border-pink-500/20" },
  { id: "browse", label: "Just browse", icon: Sparkles, route: null, color: "from-purple-500/15 to-purple-500/5 border-purple-500/20" },
] as const;

export default function DayIntentPicker({ isSingle }: { isSingle: boolean }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("partnerai-intent-picked") === "true");

  if (dismissed) return null;

  const handlePick = (intent: typeof INTENTS[number]) => {
    sessionStorage.setItem("partnerai-intent-picked", "true");
    sessionStorage.setItem("partnerai-daily-intent", intent.id);
    setDismissed(true);
    if (intent.route) navigate(intent.route);
  };

  const filteredIntents = isSingle ? INTENTS.filter(i => i.id !== "partner") : INTENTS;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          className="bg-card rounded-2xl p-4 border border-border shadow-soft relative"
        >
          <button
            onClick={() => { sessionStorage.setItem("partnerai-intent-picked", "true"); setDismissed(true); }}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-muted/60 flex items-center justify-center"
          >
            <X size={10} className="text-muted-foreground" />
          </button>
          <p className="text-sm font-bold text-foreground mb-1">How do you want to start today?</p>
          <p className="text-xs text-muted-foreground mb-3">Pick your focus and we'll get you there ✨</p>
          <div className="flex flex-wrap gap-2">
            {filteredIntents.map(intent => (
              <button
                key={intent.id}
                onClick={() => handlePick(intent)}
                className={`flex items-center gap-1.5 bg-gradient-to-br ${intent.color} border rounded-xl px-3 py-2 transition-all active:scale-95`}
              >
                <intent.icon size={14} className="text-foreground/70" />
                <span className="text-xs font-semibold text-foreground">{intent.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

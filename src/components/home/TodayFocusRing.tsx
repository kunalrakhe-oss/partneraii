import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Dumbbell, BookOpen, Wallet, Apple, Moon, Brain, Heart, Target, Activity } from "lucide-react";

const GOAL_ICONS: Record<string, typeof Dumbbell> = {
  workout: Dumbbell,
  exercise: Dumbbell,
  read: BookOpen,
  budget: Wallet,
  eat: Apple,
  diet: Apple,
  sleep: Moon,
  meditate: Brain,
  journal: BookOpen,
  gratitude: Heart,
  walk: Activity,
  run: Activity,
  stretch: Activity,
};

function getIcon(goal: string) {
  const lower = goal.toLowerCase();
  for (const [key, icon] of Object.entries(GOAL_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return Target;
}

interface TodayFocusRingProps {
  dailyGoals: string[];
}

export default function TodayFocusRing({ dailyGoals }: TodayFocusRingProps) {
  const storageKey = `pai-focus-${new Date().toISOString().slice(0, 10)}`;
  const [completed, setCompleted] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...completed]));
  }, [completed, storageKey]);

  const toggle = (i: number) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  if (!dailyGoals.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-bold text-foreground">Today's Focus</p>
        <p className="text-xs text-muted-foreground">{completed.size}/{dailyGoals.length}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
        {dailyGoals.map((goal, i) => {
          const done = completed.has(i);
          const Icon = getIcon(goal);
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.92 }}
              onClick={() => toggle(i)}
              className={`snap-start shrink-0 flex flex-col items-center gap-2 w-20 py-3 rounded-2xl border transition-all duration-300 ${
                done
                  ? "bg-gradient-to-br from-primary/20 to-secondary/20 border-primary/30 shadow-elevated"
                  : "bg-card/60 backdrop-blur-glass border-border/40 shadow-card"
              }`}
              style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)", backdropFilter: "blur(40px) saturate(1.8)" }}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                done ? "bg-primary/20" : "bg-muted"
              }`}>
                {done ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                    <Check size={18} className="text-primary" />
                  </motion.div>
                ) : (
                  <Icon size={18} className="text-muted-foreground" />
                )}
              </div>
              <span className={`text-[10px] font-semibold leading-tight text-center line-clamp-2 ${done ? "text-primary" : "text-foreground"}`}>
                {goal}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

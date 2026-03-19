import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HeartPulse, Sparkles, Wallet, Target, Dumbbell, Salad, Activity, Shield, Baby, Heart, Camera, MessageSquare, ShoppingCart, Check, CalendarDays, PartyPopper, MapPin, ChevronDown } from "lucide-react";

interface PillarGridProps {
  isSingle: boolean;
}

type FeatureItem = { to: string; icon: typeof Heart; label: string };
type Pillar = { id: string; label: string; icon: typeof Heart; color: string; children: FeatureItem[] };

export default function PillarGrid({ isSingle }: PillarGridProps) {
  const navigate = useNavigate();
  const [activePillar, setActivePillar] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const pillars: Pillar[] = [
    {
      id: "healthy", label: "Healthy", icon: HeartPulse, color: "text-success",
      children: [
        { to: "/workout", icon: Dumbbell, label: "Workout" },
        { to: "/diet", icon: Salad, label: "Diet" },
        { to: "/health", icon: Activity, label: "Habits" },
        { to: "/physio", icon: Activity, label: "Physio" },
        { to: "/postpartum", icon: HeartPulse, label: "Postpartum" },
        { to: "/mens-health", icon: Shield, label: "Men's" },
      ],
    },
    {
      id: "happy", label: "Happy", icon: Sparkles, color: "text-warning",
      children: [
        { to: "/mood", icon: Heart, label: "Mood" },
        { to: "/memories", icon: Camera, label: "Memories" },
        { to: "/baby-plan", icon: Baby, label: "Baby Plan" },
        ...(!isSingle ? [{ to: "/chat", icon: MessageSquare, label: "Chat" }] : []),
      ],
    },
    {
      id: "wealthy", label: "Wealthy", icon: Wallet, color: "text-warning",
      children: [
        { to: "/budget", icon: Wallet, label: "Finance" },
        { to: "/lists", icon: ShoppingCart, label: "Lists" },
      ],
    },
    {
      id: "successful", label: "Successful", icon: Target, color: "text-primary",
      children: [
        { to: "/chores", icon: Check, label: "Tasks" },
        { to: "/calendar", icon: CalendarDays, label: "Calendar" },
        { to: "/event-planner", icon: PartyPopper, label: "Events" },
        { to: "/safety", icon: MapPin, label: "Safety" },
      ],
    },
  ];

  // Auto-collapse when user scrolls the parent container
  const handleScroll = useCallback(() => {
    if (activePillar) setActivePillar(null);
  }, [activePillar]);

  useEffect(() => {
    const scrollParent = ref.current?.closest("[data-scroll-container]") || ref.current?.closest(".overflow-y-auto, .overflow-auto");
    if (!scrollParent) return;
    scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollParent.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const active = pillars.find((p) => p.id === activePillar);

  return (
    <div ref={ref}>
      <p className="text-sm font-bold text-foreground px-1 mb-2">Life Pillars</p>

      {/* 4 pillar buttons in one row */}
      <div className="flex justify-between px-1">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          const isActive = activePillar === pillar.id;
          return (
            <button
              key={pillar.id}
              onClick={() => setActivePillar(isActive ? null : pillar.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95 ${isActive ? "bg-muted/80" : "hover:bg-muted/40"}`}
            >
              <div className={`w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center ${isActive ? "ring-2 ring-primary/40" : ""}`}>
                <Icon size={18} className={pillar.color} />
              </div>
              <span className={`text-[10px] font-semibold ${pillar.color}`}>{pillar.label}</span>
            </button>
          );
        })}
      </div>

      {/* Expanded children */}
      <AnimatePresence initial={false}>
        {active && (
          <motion.div
            key={active.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 px-1 pt-3">
              {active.children.map((feat) => {
                const FeatIcon = feat.icon;
                return (
                  <button
                    key={feat.to}
                    onClick={() => navigate(feat.to)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card/60 border border-border/30 hover:bg-muted/80 active:scale-95 transition-all"
                  >
                    <FeatIcon size={14} className="text-foreground" />
                    <span className="text-[11px] font-medium text-foreground whitespace-nowrap">{feat.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

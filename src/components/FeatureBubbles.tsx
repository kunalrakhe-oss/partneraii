import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, HeartPulse, Sparkles, Wallet, Target, Dumbbell, Salad, Activity, Shield, Baby, Heart, Camera, MessageSquare, ShoppingCart, Check, CalendarDays, PartyPopper, MapPin } from "lucide-react";

type FeatureItem = {
  to: string;
  icon: typeof Heart;
  label: string;
  iconColor: string;
  iconBg: string;
};

type Pillar = {
  id: string;
  label: string;
  icon: typeof Heart;
  color: string;
  bgGradient: string;
  ringColor: string;
  children: FeatureItem[];
};

interface FeatureBubblesProps {
  isSingle: boolean;
  uncheckedGroceries: number;
  pendingChores: number;
  totalEvents: number;
}

export default function FeatureBubbles({ isSingle, uncheckedGroceries, pendingChores, totalEvents }: FeatureBubblesProps) {
  const navigate = useNavigate();
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);

  const pillars: Pillar[] = [
    {
      id: "healthy",
      label: "Healthy",
      icon: HeartPulse,
      color: "text-success",
      bgGradient: "from-success/20 to-success/5",
      ringColor: "ring-success/30",
      children: [
        { to: "/workout", icon: Dumbbell, label: "Workout AI", iconColor: "text-success", iconBg: "bg-success/15" },
        { to: "/diet", icon: Salad, label: "Diet AI", iconColor: "text-secondary", iconBg: "bg-secondary/15" },
        { to: "/health", icon: Activity, label: "Health", iconColor: "text-primary", iconBg: "bg-primary/15" },
        { to: "/physio", icon: Activity, label: "Physio AI", iconColor: "text-success", iconBg: "bg-success/15" },
        { to: "/postpartum", icon: HeartPulse, label: "Postpartum", iconColor: "text-primary", iconBg: "bg-primary/15" },
        { to: "/mens-health", icon: Shield, label: "Men's Health", iconColor: "text-primary", iconBg: "bg-primary/15" },
      ],
    },
    {
      id: "happy",
      label: "Happy",
      icon: Sparkles,
      color: "text-warning",
      bgGradient: "from-warning/20 to-warning/5",
      ringColor: "ring-warning/30",
      children: [
        { to: "/mood", icon: Heart, label: "Mood", iconColor: "text-warning", iconBg: "bg-warning/15" },
        { to: "/memories", icon: Camera, label: "Memories", iconColor: "text-primary", iconBg: "bg-primary/15" },
        { to: "/baby-plan", icon: Baby, label: "Baby Plan", iconColor: "text-primary", iconBg: "bg-primary/15" },
        ...(!isSingle ? [{ to: "/chat", icon: MessageSquare, label: "Chat", iconColor: "text-secondary", iconBg: "bg-secondary/15" }] : []),
      ],
    },
    {
      id: "wealthy",
      label: "Wealthy",
      icon: Wallet,
      color: "text-warning",
      bgGradient: "from-warning/20 to-amber-500/5",
      ringColor: "ring-warning/30",
      children: [
        { to: "/budget", icon: Wallet, label: "Finance AI", iconColor: "text-warning", iconBg: "bg-warning/15" },
        { to: "/lists", icon: ShoppingCart, label: "Smart Lists", iconColor: "text-primary", iconBg: "bg-primary/15" },
      ],
    },
    {
      id: "successful",
      label: "Successful",
      icon: Target,
      color: "text-primary",
      bgGradient: "from-primary/20 to-primary/5",
      ringColor: "ring-primary/30",
      children: [
        { to: "/chores", icon: Check, label: "Tasks", iconColor: "text-primary", iconBg: "bg-primary/15" },
        { to: "/calendar", icon: CalendarDays, label: "Calendar", iconColor: "text-secondary", iconBg: "bg-secondary/15" },
        { to: "/event-planner", icon: PartyPopper, label: "Event AI", iconColor: "text-warning", iconBg: "bg-warning/15" },
        { to: "/safety", icon: MapPin, label: "Safety", iconColor: "text-destructive", iconBg: "bg-destructive/15" },
      ],
    },
  ];

  const activePillar = pillars.find(p => p.id === expandedPillar);

  return (
    <div className="min-h-[200px]">
      <AnimatePresence mode="wait">
        {!expandedPillar ? (
          <motion.div
            key="pillars"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-2 gap-4"
          >
            {pillars.map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <motion.button
                  key={pillar.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07, type: "spring", stiffness: 400, damping: 25 }}
                  onClick={() => setExpandedPillar(pillar.id)}
                  className={`flex flex-col items-center justify-center gap-2 py-6 px-3 rounded-[28px] bg-gradient-to-br ${pillar.bgGradient} ring-1 ${pillar.ringColor} hover:scale-[1.04] active:scale-[0.96] transition-transform shadow-soft`}
                >
                  <div className={`w-16 h-16 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-md ring-2 ${pillar.ringColor}`}>
                    <Icon size={28} className={pillar.color} />
                  </div>
                  <span className="text-sm font-bold text-foreground tracking-wide">
                    {pillar.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {pillar.children.length} features
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        ) : activePillar ? (
          <motion.div
            key="children"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {/* Header */}
            <button
              onClick={() => setExpandedPillar(null)}
              className="flex items-center gap-2 mb-5 group"
            >
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${activePillar.bgGradient} flex items-center justify-center ring-1 ${activePillar.ringColor}`}>
                <ArrowLeft size={16} className={activePillar.color} />
              </div>
              <span className="text-base font-bold text-foreground">
                Stay {activePillar.label}
              </span>
            </button>

            {/* Child bubbles */}
            <div className="grid grid-cols-3 gap-4">
              {activePillar.children.map((child, i) => {
                const ChildIcon = child.icon;
                return (
                  <motion.button
                    key={child.to}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: i * 0.06,
                      type: "spring",
                      stiffness: 500,
                      damping: 25,
                    }}
                    onClick={() => navigate(child.to)}
                    className="flex flex-col items-center gap-1.5 py-3 hover:scale-[1.06] active:scale-[0.94] transition-transform"
                  >
                    <div className={`w-14 h-14 rounded-full ${child.iconBg} flex items-center justify-center shadow-soft ring-1 ring-border/30`}>
                      <ChildIcon size={22} className={child.iconColor} />
                    </div>
                    <span className="text-xs font-semibold text-foreground text-center leading-tight">
                      {child.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HeartPulse, Sparkles, Wallet, Target, Dumbbell, Salad, Activity, Shield, Baby, Heart, Camera, MessageSquare, ShoppingCart, Check, CalendarDays, PartyPopper, MapPin, X } from "lucide-react";

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
  glowColor: string;
  children: FeatureItem[];
};

interface FeatureBubblesProps {
  isSingle: boolean;
  uncheckedGroceries: number;
  pendingChores: number;
  totalEvents: number;
}

export default function FeatureBubbles({ isSingle }: FeatureBubblesProps) {
  const navigate = useNavigate();
  const [activePillar, setActivePillar] = useState<Pillar | null>(null);

  const pillars: Pillar[] = [
    {
      id: "healthy",
      label: "Healthy",
      icon: HeartPulse,
      color: "text-success",
      bgGradient: "from-success/20 to-success/5",
      ringColor: "ring-success/30",
      glowColor: "shadow-[0_0_40px_hsla(var(--success)/0.4)]",
      children: [
        { to: "/workout", icon: Dumbbell, label: "Workout", iconColor: "text-success", iconBg: "bg-success/15" },
        { to: "/diet", icon: Salad, label: "Diet", iconColor: "text-secondary", iconBg: "bg-secondary/15" },
        { to: "/health", icon: Activity, label: "Health", iconColor: "text-primary", iconBg: "bg-primary/15" },
        { to: "/physio", icon: Activity, label: "Physio", iconColor: "text-success", iconBg: "bg-success/15" },
        { to: "/postpartum", icon: HeartPulse, label: "Postpartum", iconColor: "text-primary", iconBg: "bg-primary/15" },
        { to: "/mens-health", icon: Shield, label: "Men's", iconColor: "text-primary", iconBg: "bg-primary/15" },
      ],
    },
    {
      id: "happy",
      label: "Happy",
      icon: Sparkles,
      color: "text-warning",
      bgGradient: "from-warning/20 to-warning/5",
      ringColor: "ring-warning/30",
      glowColor: "shadow-[0_0_40px_hsla(var(--warning)/0.4)]",
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
      glowColor: "shadow-[0_0_40px_hsla(var(--warning)/0.4)]",
      children: [
        { to: "/budget", icon: Wallet, label: "Finance", iconColor: "text-warning", iconBg: "bg-warning/15" },
        { to: "/lists", icon: ShoppingCart, label: "Lists", iconColor: "text-primary", iconBg: "bg-primary/15" },
      ],
    },
    {
      id: "successful",
      label: "Successful",
      icon: Target,
      color: "text-primary",
      bgGradient: "from-primary/20 to-primary/5",
      ringColor: "ring-primary/30",
      glowColor: "shadow-[0_0_40px_hsla(var(--primary)/0.4)]",
      children: [
        { to: "/chores", icon: Check, label: "Tasks", iconColor: "text-primary", iconBg: "bg-primary/15" },
        { to: "/calendar", icon: CalendarDays, label: "Calendar", iconColor: "text-secondary", iconBg: "bg-secondary/15" },
        { to: "/event-planner", icon: PartyPopper, label: "Events", iconColor: "text-warning", iconBg: "bg-warning/15" },
        { to: "/safety", icon: MapPin, label: "Safety", iconColor: "text-destructive", iconBg: "bg-destructive/15" },
      ],
    },
  ];

  const getMoonPosition = (index: number, total: number, radius: number) => {
    const angle = ((index / total) * 360 - 90) * (Math.PI / 180);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  return (
    <>
      {/* 4 circular pillar buttons */}
      <div className="flex justify-between px-2">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <motion.button
              key={pillar.id}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.08 }}
              onClick={() => setActivePillar(pillar)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${pillar.bgGradient} ring-2 ${pillar.ringColor} flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                <Icon size={24} className={pillar.color} />
              </div>
              <span className="text-[11px] font-bold text-foreground leading-tight">
                {pillar.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Orbit overlay */}
      <AnimatePresence>
        {activePillar && (() => {
          const PlanetIcon = activePillar.icon;
          const moons = activePillar.children;
          const radius = 140;

          return (
            <motion.div
              key="orbit-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] flex items-center justify-center"
              onClick={() => setActivePillar(null)}
            >
              {/* Blurred backdrop */}
              <div className="absolute inset-0 bg-background/60 backdrop-blur-md" />

              {/* Content container */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                {/* Orbit ring */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.15 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground/20"
                  style={{ width: radius * 2 + 56, height: radius * 2 + 56 }}
                />

                {/* Planet center */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`w-20 h-20 rounded-full bg-gradient-to-br ${activePillar.bgGradient} ring-2 ${activePillar.ringColor} flex items-center justify-center ${activePillar.glowColor}`}
                >
                  <PlanetIcon size={36} className={activePillar.color} />
                </motion.div>

                {/* Label below planet */}
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.15 }}
                  className="absolute left-1/2 -translate-x-1/2 mt-2 text-sm font-bold text-foreground whitespace-nowrap"
                >
                  {activePillar.label}
                </motion.p>

                {/* Moons */}
                {moons.map((moon, i) => {
                  const MoonIcon = moon.icon;
                  const pos = getMoonPosition(i, moons.length, radius);
                  return (
                    <motion.button
                      key={moon.to}
                      initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                      animate={{ scale: 1, x: pos.x, y: pos.y, opacity: 1 }}
                      exit={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                      transition={{
                        delay: 0.08 + i * 0.06,
                        type: "spring",
                        stiffness: 350,
                        damping: 22,
                      }}
                      onClick={() => {
                        setActivePillar(null);
                        navigate(moon.to);
                      }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 hover:scale-110 active:scale-90 transition-transform"
                    >
                      <div className={`w-14 h-14 rounded-full ${moon.iconBg} flex items-center justify-center shadow-lg ring-1 ring-border/30 backdrop-blur-sm bg-card/80`}>
                        <MoonIcon size={22} className={moon.iconColor} />
                      </div>
                      <span className="text-[10px] font-semibold text-foreground whitespace-nowrap">
                        {moon.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Close button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.2 }}
                onClick={() => setActivePillar(null)}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-card/90 ring-1 ring-border/30 flex items-center justify-center shadow-lg backdrop-blur-sm"
              >
                <X size={18} className="text-muted-foreground" />
              </motion.button>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </>
  );
}

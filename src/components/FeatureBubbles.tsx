import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HeartPulse, Sparkles, Wallet, Target, Dumbbell, Salad, Activity, Shield, Baby, Heart, Camera, MessageSquare, ShoppingCart, Check, CalendarDays, PartyPopper, MapPin } from "lucide-react";

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

export default function FeatureBubbles({ isSingle }: FeatureBubblesProps) {
  const navigate = useNavigate();
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());

  const togglePillar = (id: string) => {
    setExpandedPillars(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const pillars: Pillar[] = [
    {
      id: "healthy",
      label: "Healthy",
      icon: HeartPulse,
      color: "text-success",
      bgGradient: "from-success/20 to-success/5",
      ringColor: "ring-success/30",
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
      children: [
        { to: "/chores", icon: Check, label: "Tasks", iconColor: "text-primary", iconBg: "bg-primary/15" },
        { to: "/calendar", icon: CalendarDays, label: "Calendar", iconColor: "text-secondary", iconBg: "bg-secondary/15" },
        { to: "/event-planner", icon: PartyPopper, label: "Events", iconColor: "text-warning", iconBg: "bg-warning/15" },
        { to: "/safety", icon: MapPin, label: "Safety", iconColor: "text-destructive", iconBg: "bg-destructive/15" },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {pillars.map((pillar) => {
        const Icon = pillar.icon;
        const isOpen = expandedPillars.has(pillar.id);

        return (
          <div key={pillar.id}>
            {/* Pillar row */}
            <button
              onClick={() => togglePillar(pillar.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r ${pillar.bgGradient} ring-1 ${pillar.ringColor} hover:scale-[1.01] active:scale-[0.98] transition-transform`}
            >
              <div className={`w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-sm ring-1 ${pillar.ringColor}`}>
                <Icon size={20} className={pillar.color} />
              </div>
              <span className="text-sm font-bold text-foreground flex-1 text-left">
                Stay {pillar.label}
              </span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={18} className="text-muted-foreground" />
              </motion.div>
            </button>

            {/* Child bubbles dropdown */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-3 overflow-x-auto py-3 px-2 scrollbar-hide">
                    {pillar.children.map((child, i) => {
                      const ChildIcon = child.icon;
                      return (
                        <motion.button
                          key={child.to}
                          initial={{ opacity: 0, scale: 0, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{
                            delay: i * 0.05,
                            type: "spring",
                            stiffness: 500,
                            damping: 25,
                          }}
                          onClick={() => navigate(child.to)}
                          className="flex flex-col items-center gap-1 min-w-[60px] hover:scale-[1.08] active:scale-[0.92] transition-transform"
                        >
                          <div className={`w-12 h-12 rounded-full ${child.iconBg} flex items-center justify-center shadow-soft ring-1 ring-border/30`}>
                            <ChildIcon size={20} className={child.iconColor} />
                          </div>
                          <span className="text-[10px] font-semibold text-foreground text-center leading-tight whitespace-nowrap">
                            {child.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

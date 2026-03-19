import { useState } from "react";
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
  const [open, setOpen] = useState<string | null>(null);

  const pillars: Pillar[] = [
    {
      id: "healthy", label: "Healthy", icon: HeartPulse, color: "text-success",
      children: [
        { to: "/workout", icon: Dumbbell, label: "Workout" },
        { to: "/diet", icon: Salad, label: "Diet" },
        { to: "/health", icon: Activity, label: "Health" },
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

  return (
    <div className="space-y-1">
      <p className="text-sm font-bold text-foreground px-1">Life Pillars</p>
      <div className="space-y-1">
        {pillars.map((pillar) => {
          const PillarIcon = pillar.icon;
          const isOpen = open === pillar.id;
          return (
            <div key={pillar.id}>
              <button
                onClick={() => setOpen(isOpen ? null : pillar.id)}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <PillarIcon size={14} className={pillar.color} />
                <span className={`text-xs font-semibold ${pillar.color} flex-1 text-left`}>{pillar.label}</span>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-3 px-2 py-2">
                      {pillar.children.map((feat) => {
                        const Icon = feat.icon;
                        return (
                          <button
                            key={feat.to}
                            onClick={() => navigate(feat.to)}
                            className="flex flex-col items-center gap-1 w-[60px] active:scale-95 transition-transform"
                          >
                            <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center">
                              <Icon size={18} className="text-foreground" />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground leading-tight text-center">
                              {feat.label}
                            </span>
                          </button>
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
    </div>
  );
}

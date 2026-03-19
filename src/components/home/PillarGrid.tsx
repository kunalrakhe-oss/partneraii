import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { HeartPulse, Sparkles, Wallet, Target, Dumbbell, Salad, Activity, Shield, Baby, Heart, Camera, MessageSquare, ShoppingCart, Check, CalendarDays, PartyPopper, MapPin, ChevronDown } from "lucide-react";

interface PillarGridProps {
  isSingle: boolean;
}

type FeatureItem = { to: string; icon: typeof Heart; label: string };
type Pillar = { id: string; label: string; icon: typeof Heart; color: string; children: FeatureItem[] };

export default function PillarGrid({ isSingle }: PillarGridProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);

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

  const VISIBLE_COUNT = 3;

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-bold text-foreground px-1">Life Pillars</p>
      <div className="space-y-2">
        {pillars.map((pillar) => {
          const PillarIcon = pillar.icon;
          const isExpanded = expanded === pillar.id;
          const hasOverflow = pillar.children.length > VISIBLE_COUNT;
          const visible = isExpanded ? pillar.children : pillar.children.slice(0, VISIBLE_COUNT);
          const hiddenCount = pillar.children.length - VISIBLE_COUNT;

          return (
            <div key={pillar.id} className="rounded-xl bg-card/60 border border-border/30 px-2.5 py-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <PillarIcon size={14} className={pillar.color} />
                <span className={`text-xs font-semibold ${pillar.color}`}>{pillar.label}</span>
              </div>

              <div className={`flex gap-2 items-center ${isExpanded ? "flex-wrap" : "overflow-hidden"}`}>
                {visible.map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <button
                      key={feat.to}
                      onClick={() => navigate(feat.to)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 hover:bg-muted/80 active:scale-95 transition-all shrink-0"
                    >
                      <Icon size={14} className="text-foreground" />
                      <span className="text-[11px] font-medium text-foreground whitespace-nowrap">{feat.label}</span>
                    </button>
                  );
                })}
                {hasOverflow && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : pillar.id)}
                    className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors shrink-0"
                  >
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {isExpanded ? "Less" : `+${hiddenCount}`}
                    </span>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={12} className="text-muted-foreground" />
                    </motion.div>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

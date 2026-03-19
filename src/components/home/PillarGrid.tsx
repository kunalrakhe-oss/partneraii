import { useNavigate } from "react-router-dom";
import { HeartPulse, Sparkles, Wallet, Target, Dumbbell, Salad, Activity, Shield, Baby, Heart, Camera, MessageSquare, ShoppingCart, Check, CalendarDays, PartyPopper, MapPin } from "lucide-react";

interface PillarGridProps {
  isSingle: boolean;
}

type FeatureItem = {
  to: string;
  icon: typeof Heart;
  label: string;
};

type Pillar = {
  label: string;
  icon: typeof Heart;
  color: string;
  children: FeatureItem[];
};

export default function PillarGrid({ isSingle }: PillarGridProps) {
  const navigate = useNavigate();

  const pillars: Pillar[] = [
    {
      label: "Healthy",
      icon: HeartPulse,
      color: "text-success",
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
      label: "Happy",
      icon: Sparkles,
      color: "text-warning",
      children: [
        { to: "/mood", icon: Heart, label: "Mood" },
        { to: "/memories", icon: Camera, label: "Memories" },
        { to: "/baby-plan", icon: Baby, label: "Baby Plan" },
        ...(!isSingle ? [{ to: "/chat", icon: MessageSquare, label: "Chat" }] : []),
      ],
    },
    {
      label: "Wealthy",
      icon: Wallet,
      color: "text-warning",
      children: [
        { to: "/budget", icon: Wallet, label: "Finance" },
        { to: "/lists", icon: ShoppingCart, label: "Lists" },
      ],
    },
    {
      label: "Successful",
      icon: Target,
      color: "text-primary",
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
      <div className="space-y-3">
        {pillars.map((pillar) => {
          const PillarIcon = pillar.icon;
          return (
            <div key={pillar.label}>
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <PillarIcon size={14} className={pillar.color} />
                <span className={`text-xs font-semibold ${pillar.color}`}>{pillar.label}</span>
              </div>
              <div className="flex flex-wrap gap-3 px-1">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

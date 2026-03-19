import { Link } from "react-router-dom";
import { Activity, Salad, Dumbbell, ChevronRight } from "lucide-react";

type Plan = {
  id?: string;
  plan_type: string;
  title: string;
  started_at: string;
};

const PLAN_ICON: Record<string, typeof Activity> = {
  physio: Activity,
  diet: Salad,
  workout: Dumbbell,
};

interface ActivePlansStripProps {
  plans: Plan[];
}

export default function ActivePlansStrip({ plans }: ActivePlansStripProps) {
  if (!plans.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-foreground px-1">Active Plans</p>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
        {plans.map((plan, i) => {
          const Icon = PLAN_ICON[plan.plan_type] || Activity;
          const day = Math.max(1, Math.floor((Date.now() - new Date(plan.started_at).getTime()) / (1000 * 60 * 60 * 24)) + 1);
          const route = plan.plan_type === "diet" ? "/diet" : "/physio";

          return (
            <Link
              key={plan.id || i}
              to={route}
              className="snap-start shrink-0 flex items-center gap-3 rounded-2xl bg-card/60 backdrop-blur-glass border border-border/40 px-4 py-3 shadow-card hover:shadow-elevated transition-all"
              style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)", backdropFilter: "blur(40px) saturate(1.8)" }}
            >
              <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate max-w-[140px]">{plan.title}</p>
                <p className="text-[10px] text-muted-foreground">Day {day}</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

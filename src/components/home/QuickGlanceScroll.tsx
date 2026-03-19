import { Link } from "react-router-dom";
import { CalendarDays, CheckSquare, ShoppingCart, Flame } from "lucide-react";

interface QuickGlanceScrollProps {
  nextEvent: { title: string; event_date: string } | null;
  pendingChores: number;
  uncheckedGroceries: number;
  daysTogether: number;
}

export default function QuickGlanceScroll({ nextEvent, pendingChores, uncheckedGroceries, daysTogether }: QuickGlanceScrollProps) {
  const cards = [
    nextEvent
      ? { to: "/calendar", icon: CalendarDays, label: nextEvent.title, sub: nextEvent.event_date, color: "text-primary", bg: "bg-primary/10" }
      : { to: "/calendar", icon: CalendarDays, label: "No upcoming", sub: "Add event", color: "text-muted-foreground", bg: "bg-muted" },
    { to: "/chores", icon: CheckSquare, label: `${pendingChores} tasks`, sub: "Pending", color: "text-warning", bg: "bg-warning/10" },
    { to: "/lists", icon: ShoppingCart, label: `${uncheckedGroceries} items`, sub: "Grocery", color: "text-secondary", bg: "bg-secondary/10" },
    { to: "/health", icon: Flame, label: `Day ${daysTogether}`, sub: "Streak", color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-foreground px-1">At a Glance</p>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
        {cards.map((card, i) => (
          <Link
            key={i}
            to={card.to}
            className="snap-start shrink-0 w-[130px] rounded-2xl bg-card/60 backdrop-blur-glass border border-border/40 p-3 shadow-card hover:shadow-elevated transition-all"
            style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)", backdropFilter: "blur(40px) saturate(1.8)" }}
          >
            <div className={`w-8 h-8 rounded-full ${card.bg} flex items-center justify-center mb-2`}>
              <card.icon size={16} className={card.color} />
            </div>
            <p className="text-sm font-bold text-foreground truncate">{card.label}</p>
            <p className="text-[10px] text-muted-foreground">{card.sub}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

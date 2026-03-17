import { useState } from "react";
import { Plus, Settings, Check, Clock, ChevronRight, Sparkles, Droplets, HelpCircle, UtensilsCrossed } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorage, generateId, type Chore } from "@/lib/store";
import PageTransition from "@/components/PageTransition";

const DEFAULT_CHORES: Partial<Chore>[] = [
  { name: "Deep Clean Kitchen", instructions: ["Clear all countertops", "Scrub sink and faucet", "Clean oven and microwave", "Mop the floor"], frequency: "weekly" },
  { name: "Water the Plants", instructions: ["Check soil moisture; if top inch is dry, it's time.", "Use filtered water for the Monstera in the corner.", "Mist the ferns gently to maintain humidity."], frequency: "weekly" },
  { name: "Vacuum Living Room", instructions: ["Clear floor of small items", "Vacuum all areas", "Move furniture edges"], frequency: "weekly" },
];

const CHORE_ICONS: Record<string, any> = {
  "Deep Clean Kitchen": UtensilsCrossed,
  "Water the Plants": Droplets,
  "Vacuum Living Room": HelpCircle,
};

type FilterMode = "all" | "me" | "pending";

export default function ChoresPage() {
  const [chores, setChores] = useLocalStorage<Chore[]>("lovelist-chores", []);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");

  const completedCount = chores.filter(c => c.completed).length;
  const totalCount = chores.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const addChore = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newChore: Chore = {
      id: generateId(),
      name: fd.get("name") as string,
      instructions: (fd.get("instructions") as string).split("\n").filter(Boolean),
      frequency: fd.get("frequency") as Chore["frequency"],
      assignedTo: fd.get("assignedTo") as Chore["assignedTo"],
      completed: false,
    };
    setChores([...chores, newChore]);
    setShowAdd(false);
  };

  const toggleComplete = (id: string) => {
    setChores(chores.map(c => c.id === id ? { ...c, completed: !c.completed, lastCompleted: new Date().toISOString() } : c));
  };

  const addDefaults = () => {
    const newChores = DEFAULT_CHORES.map(c => ({
      ...c,
      id: generateId(),
      assignedTo: "rotating" as const,
      completed: false,
    })) as Chore[];
    setChores([...chores, ...newChores]);
  };

  const filteredChores = chores.filter(c => {
    if (filter === "me") return c.assignedTo === "partner1";
    if (filter === "pending") return !c.completed;
    return true;
  });

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Chore Manager</h1>
            <p className="text-xs text-muted-foreground">Keeping our home cozy, together</p>
          </div>
          <button className="w-9 h-9 rounded-full bg-card shadow-card flex items-center justify-center border border-border">
            <Settings size={16} className="text-foreground" />
          </button>
        </div>

        {/* Weekly Progress */}
        <div className="bg-[hsl(100,20%,72%)] rounded-2xl p-4 mt-5 mb-5 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Weekly Progress</p>
            <p className="text-xs text-foreground/70 mb-2">{completedCount} of {totalCount} chores completed</p>
            <div className="h-1.5 bg-foreground/20 rounded-full overflow-hidden">
              <div className="h-full bg-foreground/70 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(100,20%,62%)" strokeWidth="3" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(20,20%,15%)" strokeWidth="3"
                strokeDasharray={`${progressPct * 1.256} 125.6`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">{progressPct}%</span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {([["all", "All Chores"], ["me", "Assigned to Me"], ["pending", "Pending"]] as [FilterMode, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                filter === key
                  ? "bg-[hsl(100,20%,72%)] text-foreground"
                  : "bg-card shadow-card text-muted-foreground border border-border"
              }`}
            >
              {filter === key && <Check size={12} />}
              {label}
            </button>
          ))}
        </div>

        {/* Chores list */}
        {chores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🧹</p>
            <p className="text-sm text-muted-foreground mb-3">No chores yet</p>
            <button onClick={addDefaults} className="text-sm text-primary font-medium">Add default chores →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChores.map(chore => {
              const isExpanded = expandedId === chore.id;
              const IconComp = CHORE_ICONS[chore.name] || HelpCircle;
              return (
                <motion.div key={chore.id} layout className="bg-card rounded-2xl shadow-card overflow-hidden border border-border">
                  <div className="px-4 py-3.5 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <IconComp size={18} className="text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-bold ${chore.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{chore.name}</p>
                        {chore.completed ? (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                            <Check size={10} /> Done
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                            <Clock size={10} /> Today
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {chore.frequency === "weekly" ? "Every Saturday" : chore.frequency === "daily" ? "Every day" : chore.frequency}
                      </p>
                    </div>
                  </div>

                  {/* Assignee avatars + View Steps toggle */}
                  {!isExpanded && (
                    <div className="px-4 pb-3 flex items-center justify-between">
                      <div className="flex -space-x-1">
                        <div className="w-7 h-7 rounded-full bg-[hsl(100,20%,72%)] flex items-center justify-center text-[10px] font-bold text-foreground border-2 border-card">K</div>
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground border-2 border-card">A</div>
                      </div>
                      <button
                        onClick={() => setExpandedId(chore.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground font-medium"
                      >
                        <Sparkles size={12} /> View Steps
                      </button>
                    </div>
                  )}

                  {/* Expanded instructions */}
                  <AnimatePresence>
                    {isExpanded && chore.instructions.length > 0 && (
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mx-4 mb-3 bg-muted rounded-xl p-4">
                          <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                            <Sparkles size={12} /> AI-Generated Instructions
                          </p>
                          <div className="space-y-2.5">
                            {chore.instructions.map((step, i) => (
                              <div key={i} className="flex gap-3 items-start">
                                <span className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">{i + 1}</span>
                                <p className="text-xs text-foreground leading-relaxed">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="px-4 pb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">A</div>
                            <span className="text-xs text-muted-foreground">Assigned to Anna</span>
                          </div>
                          <button
                            onClick={() => toggleComplete(chore.id)}
                            className="px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold"
                          >
                            Mark Done
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* New Chore FAB */}
        <div className="flex justify-end mt-6">
          <button
            onClick={() => setShowAdd(true)}
            className="bg-foreground text-background px-5 py-3 rounded-full flex items-center gap-2 shadow-elevated text-sm font-semibold"
          >
            <Plus size={16} /> New Chore
          </button>
        </div>

        {/* Add Chore Modal */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/30 z-50 flex items-end justify-center"
              onClick={() => setShowAdd(false)}
            >
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="bg-card w-full max-w-lg rounded-t-2xl p-5 shadow-elevated"
              >
                <h3 className="text-lg font-bold text-foreground mb-4">New Chore</h3>
                <form onSubmit={addChore} className="space-y-3">
                  <input name="name" required placeholder="Chore name" className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <textarea name="instructions" placeholder="Instructions (one per line)" rows={3} className="w-full px-4 py-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <select name="frequency" className="h-11 px-4 rounded-xl bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="once">One-time</option>
                    </select>
                    <select name="assignedTo" className="h-11 px-4 rounded-xl bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="rotating">Rotating</option>
                      <option value="partner1">Me</option>
                      <option value="partner2">Partner</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full h-12 rounded-xl love-gradient text-primary-foreground font-semibold text-sm shadow-soft">
                    Add Chore
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

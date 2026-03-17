import { useState, useEffect, useCallback } from "react";
import { Plus, Settings, Check, Clock, Sparkles, Droplets, HelpCircle, UtensilsCrossed, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useToast } from "@/hooks/use-toast";
import PageTransition from "@/components/PageTransition";
import type { Tables } from "@/integrations/supabase/types";

type ChoreRow = Tables<"chores">;

const DEFAULT_CHORES = [
  { title: "Deep Clean Kitchen", recurrence: "weekly" as const },
  { title: "Water the Plants", recurrence: "weekly" as const },
  { title: "Vacuum Living Room", recurrence: "weekly" as const },
];

const CHORE_ICONS: Record<string, any> = {
  "Deep Clean Kitchen": UtensilsCrossed,
  "Water the Plants": Droplets,
  "Vacuum Living Room": HelpCircle,
};

type FilterMode = "all" | "me" | "pending";

export default function ChoresPage() {
  const { partnerPair, loading: pairLoading, userId } = usePartnerPair();
  const { toast } = useToast();
  const [chores, setChores] = useState<ChoreRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchChores = useCallback(async () => {
    if (!partnerPair) return;
    const { data } = await supabase
      .from("chores")
      .select("*")
      .eq("partner_pair", partnerPair)
      .order("created_at", { ascending: true });
    if (data) setChores(data);
    setLoading(false);
  }, [partnerPair]);

  useEffect(() => {
    if (pairLoading) return;
    if (!partnerPair) { setLoading(false); return; }
    fetchChores();
  }, [partnerPair, pairLoading, fetchChores]);

  // Realtime
  useEffect(() => {
    if (!partnerPair) return;
    const channel = supabase
      .channel("chores-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "chores" }, () => {
        fetchChores();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [partnerPair, fetchChores]);

  const completedCount = chores.filter(c => c.is_completed).length;
  const totalCount = chores.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const addChore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId || !partnerPair) return;
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("chores").insert({
      title: fd.get("name") as string,
      recurrence: (fd.get("frequency") as string) || null,
      assigned_to: fd.get("assignedTo") === "me" ? userId : null,
      user_id: userId,
      partner_pair: partnerPair,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setShowAdd(false);
      fetchChores();
    }
    setSubmitting(false);
  };

  const toggleComplete = async (id: string, current: boolean) => {
    await supabase.from("chores").update({ is_completed: !current }).eq("id", id);
    fetchChores();
  };

  const addDefaults = async () => {
    if (!userId || !partnerPair) return;
    const rows = DEFAULT_CHORES.map(c => ({
      title: c.title,
      recurrence: c.recurrence,
      user_id: userId,
      partner_pair: partnerPair,
    }));
    await supabase.from("chores").insert(rows);
    fetchChores();
  };

  const filteredChores = chores.filter(c => {
    if (filter === "me") return c.assigned_to === userId;
    if (filter === "pending") return !c.is_completed;
    return true;
  });

  if (pairLoading || loading) {
    return (
      <PageTransition>
        <div className="px-5 pt-10 pb-6 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  // partnerPair is always set now (solo mode uses 'solo:uid')

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
              const IconComp = CHORE_ICONS[chore.title] || HelpCircle;
              return (
                <motion.div key={chore.id} layout className="bg-card rounded-2xl shadow-card overflow-hidden border border-border">
                  <div className="px-4 py-3.5 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <IconComp size={18} className="text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-bold ${chore.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{chore.title}</p>
                        {chore.is_completed ? (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                            <Check size={10} /> Done
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                            <Clock size={10} /> {chore.due_date ? "Due" : "Today"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {chore.recurrence === "weekly" ? "Every Saturday" : chore.recurrence === "daily" ? "Every day" : chore.recurrence || "One-time"}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 pb-3 flex items-center justify-between">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : chore.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground font-medium"
                    >
                      <Sparkles size={12} /> {isExpanded ? "Collapse" : "Details"}
                    </button>
                    <button
                      onClick={() => toggleComplete(chore.id, chore.is_completed)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
                        chore.is_completed
                          ? "bg-muted text-muted-foreground"
                          : "bg-foreground text-background"
                      }`}
                    >
                      {chore.is_completed ? "Undo" : "Mark Done"}
                    </button>
                  </div>
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
              className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/30 pb-20 sm:pb-0"
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
                  <div className="grid grid-cols-2 gap-3">
                    <select name="frequency" className="h-11 px-4 rounded-xl bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="">One-time</option>
                    </select>
                    <select name="assignedTo" className="h-11 px-4 rounded-xl bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Unassigned</option>
                      <option value="me">Me</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 rounded-xl love-gradient text-primary-foreground font-semibold text-sm shadow-soft flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : "Add Chore"}
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

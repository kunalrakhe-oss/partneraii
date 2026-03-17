import { useState, useEffect, useCallback } from "react";
import { Plus, Settings, Check, Clock, Sparkles, Droplets, HelpCircle, UtensilsCrossed, Loader2, CheckCircle2, X } from "lucide-react";
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

const RECURRENCE_LABEL: Record<string, string> = {
  daily: "Every day",
  weekly: "Every Saturday",
  monthly: "Once a month",
  "": "One-time",
};

type FilterMode = "all" | "me" | "pending";

type ProfileInfo = { user_id: string; display_name: string | null; avatar_url: string | null };

function getInitial(name: string | null) {
  return name ? name.trim().charAt(0).toUpperCase() : "?";
}

function AvatarCircle({ profile, size = "w-7 h-7", className = "" }: { profile: ProfileInfo | null; size?: string; className?: string }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt={profile.display_name || ""} className={`${size} rounded-full object-cover ${className}`} />;
  }
  return (
    <span className={`${size} rounded-full bg-secondary/20 text-secondary text-[11px] font-bold flex items-center justify-center ${className}`}>
      {getInitial(profile?.display_name ?? null)}
    </span>
  );
}

export default function ChoresPage() {
  const { partnerPair, loading: pairLoading, userId } = usePartnerPair();
  const { toast } = useToast();
  const [chores, setChores] = useState<ChoreRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stepsCache, setStepsCache] = useState<Record<string, string[]>>({});
  const [loadingSteps, setLoadingSteps] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});

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
    const title = (fd.get("name") as string).trim();
    if (!title) { setSubmitting(false); return; }
    const { error } = await supabase.from("chores").insert({
      title,
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

  const fetchSteps = async (chore: ChoreRow) => {
    if (stepsCache[chore.id]) return;
    setLoadingSteps(chore.id);
    try {
      const { data, error } = await supabase.functions.invoke("chore-steps", {
        body: { choreTitle: chore.title, recurrence: chore.recurrence },
      });
      if (error) throw error;
      setStepsCache(prev => ({ ...prev, [chore.id]: data.steps || [] }));
    } catch {
      toast({ title: "Couldn't load steps", description: "Try again later", variant: "destructive" });
    } finally {
      setLoadingSteps(null);
    }
  };

  const handleToggleExpand = (chore: ChoreRow) => {
    if (expandedId === chore.id) {
      setExpandedId(null);
    } else {
      setExpandedId(chore.id);
      fetchSteps(chore);
    }
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

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Chore Manager</h1>
            <p className="text-xs text-muted-foreground">Keeping our home cozy, together</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-card shadow-card flex items-center justify-center border border-border transition-transform active:scale-95">
            <Settings size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Weekly Progress */}
        <div className="bg-primary/30 rounded-2xl p-5 mt-5 mb-6 flex items-center gap-4 shadow-soft">
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Weekly Progress</p>
            <p className="text-xs text-foreground/60 mb-3">{completedCount} of {totalCount} chores completed</p>
            <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-foreground/50 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className="relative w-14 h-14 shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="19" fill="none" className="stroke-primary/40" strokeWidth="3.5" />
              <motion.circle
                cx="24" cy="24" r="19" fill="none"
                className="stroke-foreground/60"
                strokeWidth="3.5"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 119.4" }}
                animate={{ strokeDasharray: `${progressPct * 1.194} 119.4` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">{progressPct}%</span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
          {([["all", "All Chores"], ["me", "Assigned to Me"], ["pending", "Pending"]] as [FilterMode, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                filter === key
                  ? "bg-primary/35 text-foreground shadow-soft"
                  : "bg-card text-muted-foreground border border-border hover:border-primary/30"
              }`}
            >
              {filter === key && <Check size={12} />}
              {label}
            </button>
          ))}
        </div>

        {/* Chores list */}
        {chores.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🧹</p>
            <p className="text-sm text-muted-foreground mb-1">No chores yet</p>
            <p className="text-xs text-muted-foreground/60 mb-4">Start organizing your home together</p>
            <button onClick={addDefaults} className="text-sm text-primary font-semibold hover:underline">Add default chores →</button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredChores.map(chore => {
                const isExpanded = expandedId === chore.id;
                const IconComp = CHORE_ICONS[chore.title] || HelpCircle;
                const steps = stepsCache[chore.id];
                const isLoadingThis = loadingSteps === chore.id;

                return (
                  <motion.div
                    key={chore.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className={`bg-card rounded-2xl overflow-hidden border transition-shadow duration-200 ${
                      isExpanded ? "border-primary/20 shadow-elevated" : "border-border shadow-card"
                    } ${chore.is_completed && !isExpanded ? "opacity-70" : ""}`}
                  >
                    {/* Top section */}
                    <button
                      onClick={() => handleToggleExpand(chore)}
                      className="w-full px-4 py-4 flex items-start gap-3 text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        chore.is_completed ? "bg-success/10" : "bg-muted"
                      }`}>
                        <IconComp size={18} className={chore.is_completed ? "text-success" : "text-foreground/70"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-bold leading-tight ${
                            chore.is_completed ? "line-through text-muted-foreground" : "text-foreground"
                          }`}>
                            {chore.title}
                          </p>
                          {isExpanded ? (
                            <div
                              onClick={(e) => { e.stopPropagation(); toggleComplete(chore.id, chore.is_completed); }}
                              className="shrink-0"
                            >
                              <CheckCircle2
                                size={24}
                                className={`transition-colors ${chore.is_completed ? "text-success fill-success/20" : "text-border hover:text-primary/50"}`}
                              />
                            </div>
                          ) : chore.is_completed ? (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full shrink-0">
                              <Check size={10} /> Done
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full shrink-0">
                              <Clock size={10} /> Today
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {RECURRENCE_LABEL[chore.recurrence || ""] || chore.recurrence || "One-time"}
                        </p>
                      </div>
                    </button>

                    {/* AI Steps expandable */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="mx-4 mb-3 rounded-xl bg-accent/40 p-4">
                            <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-3">
                              <Sparkles size={13} className="text-secondary" /> AI-Generated Instructions
                            </p>
                            {isLoadingThis ? (
                              <div className="flex items-center gap-2 py-4 justify-center">
                                <Loader2 size={16} className="animate-spin text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Generating steps…</span>
                              </div>
                            ) : steps && steps.length > 0 ? (
                              <ol className="space-y-3">
                                {steps.map((step, i) => (
                                  <li key={i} className="flex items-start gap-3">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-secondary/15 text-secondary text-[11px] font-bold shrink-0 mt-0.5">
                                      {i + 1}
                                    </span>
                                    <span className="text-xs text-foreground/80 leading-relaxed">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            ) : (
                              <p className="text-xs text-muted-foreground">No steps available.</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Bottom bar */}
                    <div className="border-t border-border/40 mx-4" />
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {chore.assigned_to ? (
                          <>
                            <span className="w-7 h-7 rounded-full bg-secondary/20 text-secondary text-[11px] font-bold flex items-center justify-center">
                              {chore.assigned_to === userId ? "Y" : "P"}
                            </span>
                            {isExpanded && (
                              <span className="text-xs text-muted-foreground">
                                Assigned to {chore.assigned_to === userId ? "You" : "Partner"}
                              </span>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center">
                            <span className="w-7 h-7 rounded-full bg-muted text-muted-foreground text-[11px] font-bold flex items-center justify-center">K</span>
                            <span className="w-7 h-7 rounded-full bg-muted text-muted-foreground text-[11px] font-bold flex items-center justify-center -ml-2 border-2 border-card">A</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {!isExpanded && (
                          <button
                            onClick={() => handleToggleExpand(chore)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors"
                          >
                            <Sparkles size={12} className="text-secondary/70" />
                            View Steps
                          </button>
                        )}
                        {isExpanded && (
                          <button
                            onClick={() => toggleComplete(chore.id, chore.is_completed)}
                            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                              chore.is_completed
                                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                : "bg-primary/80 text-primary-foreground hover:bg-primary shadow-soft"
                            }`}
                          >
                            {chore.is_completed ? "Undo" : "Mark Done"}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* FAB */}
        <div className="fixed bottom-24 left-0 right-0 flex justify-center z-30 pointer-events-none">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAdd(true)}
            className="pointer-events-auto love-gradient text-primary-foreground px-6 py-3.5 rounded-full flex items-center gap-2 shadow-elevated text-sm font-bold"
          >
            <Plus size={16} strokeWidth={2.5} /> New Chore
          </motion.button>
        </div>

        {/* Add Chore Modal */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/25 backdrop-blur-sm"
              onClick={() => setShowAdd(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="bg-card w-full max-w-lg rounded-t-3xl p-6 shadow-elevated"
              >
                {/* Drag handle */}
                <div className="flex justify-center mb-4">
                  <div className="w-10 h-1 rounded-full bg-border" />
                </div>

                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-foreground font-heading">New Chore</h3>
                  <button
                    onClick={() => setShowAdd(false)}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  >
                    <X size={14} className="text-muted-foreground" />
                  </button>
                </div>

                <form onSubmit={addChore} className="space-y-4">
                  {/* Chore name */}
                  <div>
                    <label className="text-xs font-semibold text-foreground/70 mb-1.5 block">Chore Name</label>
                    <input
                      name="name"
                      required
                      placeholder="e.g. Mop the floors"
                      className="w-full h-12 px-4 rounded-xl bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                    />
                  </div>

                  {/* Frequency & Assignment */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground/70 mb-1.5 block">Frequency</label>
                      <select
                        name="frequency"
                        className="w-full h-12 px-4 rounded-xl bg-muted/60 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all appearance-none"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="daily">Daily</option>
                        <option value="monthly">Monthly</option>
                        <option value="">One-time</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground/70 mb-1.5 block">Assign To</label>
                      <select
                        name="assignedTo"
                        className="w-full h-12 px-4 rounded-xl bg-muted/60 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all appearance-none"
                      >
                        <option value="">Both of us</option>
                        <option value="me">Just me</option>
                      </select>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 rounded-xl love-gradient text-primary-foreground font-bold text-sm shadow-soft flex items-center justify-center gap-2 disabled:opacity-60 transition-all active:scale-[0.98]"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : (
                      <>
                        <Plus size={16} /> Add Chore
                      </>
                    )}
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

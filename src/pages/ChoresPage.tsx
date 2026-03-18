import { useState, useEffect, useCallback, forwardRef, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Settings, Check, Clock, Sparkles, Loader2, CheckCircle2, X, Trash2, Home, Shirt, Utensils, Droplets, Brush, SprayCan, Dog, Baby, Car, Wrench, Leaf, ShoppingBag, HelpCircle, CalendarIcon, Repeat, User, Users, ArrowDownAZ, CheckCheck, Trash, Pencil, Save, Lock, ClipboardList, Link2 } from "lucide-react";
import { MediaPicker, uploadAttachment } from "@/components/MediaPicker";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import PageTransition from "@/components/PageTransition";
import ProfileButton from "@/components/ProfileButton";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import type { Tables } from "@/integrations/supabase/types";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_CHORES, DEMO_PARTNER1, DEMO_PARTNER2 } from "@/lib/demoData";
import { useNavigate } from "react-router-dom";

type GroceryRow = Tables<"grocery_items">;

const LIST_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  grocery: { label: "Grocery", emoji: "🛒" },
  todo: { label: "To-Do", emoji: "📋" },
  gift: { label: "Gift Ideas", emoji: "🎁" },
  travel: { label: "Travel Pack", emoji: "✈️" },
  date: { label: "Date Ideas", emoji: "💕" },
};

type ChoreRow = Tables<"chores">;

const RECURRENCE_LABEL: Record<string, string> = {
  daily: "Every day",
  weekly: "Every week",
  monthly: "Once a month",
  "": "One-time",
};

// Dynamic icon matching based on chore title keywords
function getChoreIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("kitchen") || t.includes("cook") || t.includes("dish")) return Utensils;
  if (t.includes("water") || t.includes("plant")) return Droplets;
  if (t.includes("vacuum") || t.includes("clean") || t.includes("mop") || t.includes("sweep")) return Brush;
  if (t.includes("laundry") || t.includes("iron") || t.includes("fold") || t.includes("cloth")) return Shirt;
  if (t.includes("spray") || t.includes("sanitize") || t.includes("disinfect")) return SprayCan;
  if (t.includes("dog") || t.includes("cat") || t.includes("pet") || t.includes("feed")) return Dog;
  if (t.includes("baby") || t.includes("kid") || t.includes("child")) return Baby;
  if (t.includes("car") || t.includes("garage") || t.includes("drive")) return Car;
  if (t.includes("fix") || t.includes("repair") || t.includes("tool")) return Wrench;
  if (t.includes("garden") || t.includes("lawn") || t.includes("yard") || t.includes("leaf")) return Leaf;
  if (t.includes("shop") || t.includes("grocer") || t.includes("buy")) return ShoppingBag;
  return Home;
}

// Determine chore status label based on due_date, recurrence, completion
function getStatusInfo(chore: ChoreRow): { label: string; color: "success" | "secondary" | "muted" } {
  if (chore.is_completed) return { label: "Done", color: "success" };

  if (chore.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(chore.due_date + "T00:00:00");
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: "Overdue", color: "secondary" };
    if (diffDays === 0) return { label: "Today", color: "secondary" };
    if (diffDays === 1) return { label: "Tomorrow", color: "muted" };
    return { label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "muted" };
  }

  // No due_date — show recurrence-based label
  if (chore.recurrence === "daily") return { label: "Today", color: "secondary" };
  if (chore.recurrence === "weekly") return { label: "This week", color: "secondary" };
  if (chore.recurrence === "monthly") return { label: "This month", color: "muted" };
  return { label: "Pending", color: "secondary" };
}

type FilterMode = "all" | "me" | "pending";

type ProfileInfo = { user_id: string; display_name: string | null; avatar_url: string | null };

function getInitial(name: string | null) {
  return name ? name.trim().charAt(0).toUpperCase() : "?";
}

const AvatarCircle = forwardRef<HTMLSpanElement, { profile: ProfileInfo | null; size?: string; className?: string }>(
  ({ profile, size = "w-7 h-7", className = "" }, ref) => {
    if (profile?.avatar_url) {
      return <img src={profile.avatar_url} alt={profile.display_name || ""} className={`${size} rounded-full object-cover ${className}`} />;
    }
    return (
      <span ref={ref} className={`${size} rounded-full bg-secondary/20 text-secondary text-[11px] font-bold flex items-center justify-center ${className}`}>
        {getInitial(profile?.display_name ?? null)}
      </span>
    );
  }
);
AvatarCircle.displayName = "AvatarCircle";

export default function ChoresPage() {
  const { partnerPair, loading: pairLoading, userId } = usePartnerPair();
  const { toast } = useToast();
  const { isDemoMode } = useDemo();
  const { t } = useLanguage();
  const [chores, setChores] = useState<ChoreRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stepsCache, setStepsCache] = useState<Record<string, string[]>>({});
  const [loadingSteps, setLoadingSteps] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [sortBy, setSortBy] = useState<"created" | "due">("created");
  const settingsRef = useRef<HTMLDivElement>(null);
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editFrequency, setEditFrequency] = useState("");
  const [editAssign, setEditAssign] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Close settings on outside click
  useEffect(() => {
    if (!showSettings) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSettings]);

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

  // Inject demo chores
  useEffect(() => {
    if (isDemoMode && !pairLoading && chores.length === 0) {
      const demoProfiles: Record<string, ProfileInfo> = {
        "demo-kunal": { user_id: "demo-kunal", display_name: DEMO_PARTNER1, avatar_url: null },
        "demo-neelam": { user_id: "demo-neelam", display_name: DEMO_PARTNER2, avatar_url: null },
      };
      setProfiles(demoProfiles);
      setChores(DEMO_CHORES.map(c => ({
        ...c,
        assigned_to: c.assigned_to === "me" ? "demo-kunal" : c.assigned_to === "partner" ? "demo-neelam" : null,
      })) as any);
      setLoading(false);
    }
  }, [isDemoMode, pairLoading, chores.length]);

  // Fetch profiles for user + partner
  useEffect(() => {
    if (!userId) return;
    const fetchProfiles = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url");
      if (data) {
        const map: Record<string, ProfileInfo> = {};
        data.forEach(p => { map[p.user_id] = p; });
        setProfiles(map);
      }
    };
    fetchProfiles();
  }, [userId]);

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

  const myProfile = userId ? profiles[userId] : null;
  const partnerProfile = Object.values(profiles).find(p => p.user_id !== userId) || null;

  // New chore form state
  const [newTitle, setNewTitle] = useState("");
  const [newFrequency, setNewFrequency] = useState("weekly");
  const [newAssign, setNewAssign] = useState("");
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);
  const [hasDueDate, setHasDueDate] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFilePreview, setNewFilePreview] = useState("");

  const resetForm = () => {
    setNewTitle("");
    setNewFrequency("weekly");
    setNewAssign("");
    setNewDueDate(undefined);
    setHasDueDate(false);
    setShowCalendar(true);
    setNewFile(null);
    setNewFilePreview("");
  };

  const addChore = async () => {
    if (!userId || !partnerPair) return;
    const title = newTitle.trim();
    if (!title) return;

    // Free tier: cap at 5 active chores
    if (!canAccess("unlimited-chores")) {
      const { count } = await supabase
        .from("chores")
        .select("id", { count: "exact", head: true })
        .eq("partner_pair", partnerPair)
        .eq("is_completed", false);
      if ((count ?? 0) >= 5) {
        toast({ title: "Free plan limit reached", description: "Upgrade to Pro for unlimited chores!", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);

    let assignedTo: string | null = null;
    if (newAssign === "me") assignedTo = userId;
    else if (newAssign === "partner" && partnerProfile) assignedTo = partnerProfile.user_id;

    let imageUrl: string | null = null;
    if (newFile && userId) {
      imageUrl = await uploadAttachment(newFile, userId);
      if (!imageUrl) {
        toast({ title: "Upload failed", variant: "destructive" });
        setSubmitting(false);
        return;
      }
    }

    const { error } = await supabase.from("chores").insert({
      title,
      recurrence: newFrequency || null,
      assigned_to: assignedTo,
      user_id: userId,
      partner_pair: partnerPair,
      due_date: hasDueDate && newDueDate ? format(newDueDate, "yyyy-MM-dd") : null,
      image_url: imageUrl,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setShowAdd(false);
      resetForm();
      fetchChores();
    }
    setSubmitting(false);
  };

  const toggleComplete = async (id: string, current: boolean) => {
    await supabase.from("chores").update({ is_completed: !current }).eq("id", id);
    fetchChores();
  };

  const deleteChore = async (id: string) => {
    await supabase.from("chores").delete().eq("id", id);
    if (expandedId === id) setExpandedId(null);
    fetchChores();
  };

  const clearCompleted = async () => {
    if (!partnerPair) return;
    const completed = chores.filter(c => c.is_completed);
    if (completed.length === 0) {
      toast({ title: "No completed chores to clear" });
      return;
    }
    await supabase.from("chores").delete().eq("partner_pair", partnerPair).eq("is_completed", true);
    setShowSettings(false);
    fetchChores();
    toast({ title: `Cleared ${completed.length} completed chore${completed.length > 1 ? "s" : ""}` });
  };

  const deleteAllChores = async () => {
    if (!partnerPair) return;
    if (chores.length === 0) {
      toast({ title: "No chores to delete" });
      return;
    }
    await supabase.from("chores").delete().eq("partner_pair", partnerPair);
    setShowSettings(false);
    setExpandedId(null);
    fetchChores();
    toast({ title: "All chores deleted" });
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

  const startEditing = (chore: ChoreRow) => {
    setEditingId(chore.id);
    setEditTitle(chore.title);
    setEditFrequency(chore.recurrence || "");
    setEditAssign(
      chore.assigned_to === userId ? "me" : chore.assigned_to ? "partner" : ""
    );
    setEditDueDate(chore.due_date || "");
  };

  const saveEdit = async (choreId: string) => {
    if (!editTitle.trim()) return;
    setSavingEdit(true);
    let assignedTo: string | null = null;
    if (editAssign === "me" && userId) assignedTo = userId;
    else if (editAssign === "partner" && partnerProfile) assignedTo = partnerProfile.user_id;

    const { error } = await supabase.from("chores").update({
      title: editTitle.trim(),
      recurrence: editFrequency || null,
      assigned_to: assignedTo,
      due_date: editDueDate || null,
    }).eq("id", choreId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Chore updated ✏️" });
      setEditingId(null);
      fetchChores();
    }
    setSavingEdit(false);
  };

  const { canAccess } = useSubscriptionContext();
  const choreNavigate = useNavigate();

  const handleToggleExpand = (chore: ChoreRow) => {
    if (!canAccess("ai-chore-steps")) {
      choreNavigate("/upgrade");
      return;
    }
    if (expandedId === chore.id) {
      setExpandedId(null);
      setEditingId(null);
    } else {
      setExpandedId(chore.id);
      fetchSteps(chore);
    }
  };

  const filteredChores = chores.filter(c => {
    if (filter === "me") return c.assigned_to === userId;
    if (filter === "pending") return !c.is_completed;
    return true;
  }).sort((a, b) => {
    if (sortBy === "due") {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    }
    return 0; // default: DB order (created_at)
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
      <div className="px-5 pb-28">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background -mx-5 px-5 pt-10 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProfileButton />
            <div>
              <h1 className="text-2xl font-bold text-foreground font-heading">{t("chores.choreManager")}</h1>
              <p className="text-xs text-muted-foreground">{t("chores.keepingCozy")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(s => !s)}
              className="w-10 h-10 rounded-full bg-card shadow-card flex items-center justify-center border border-border transition-transform active:scale-95"
            >
              <Settings size={16} className="text-muted-foreground" />
            </button>
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 z-50 w-52 bg-card border border-border rounded-2xl shadow-elevated overflow-hidden"
                >
                  <button
                    onClick={() => { setSortBy(s => s === "created" ? "due" : "created"); setShowSettings(false); }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-accent/50 transition-colors"
                  >
                    <ArrowDownAZ size={15} className="text-primary" />
                    <span className="text-sm text-foreground">Sort by {sortBy === "created" ? "Due Date" : "Created"}</span>
                  </button>
                  <div className="h-px bg-border/50" />
                  <button
                    onClick={clearCompleted}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-accent/50 transition-colors"
                  >
                    <CheckCheck size={15} className="text-success" />
                    <span className="text-sm text-foreground">Clear Completed</span>
                  </button>
                  <div className="h-px bg-border/50" />
                  <button
                    onClick={deleteAllChores}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-accent/50 transition-colors"
                  >
                    <Trash size={15} className="text-destructive" />
                    <span className="text-sm text-destructive">Delete All</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>
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
            <button
              onClick={() => setShowAdd(true)}
              className="text-sm text-primary font-semibold hover:underline"
            >
              Add your first chore →
            </button>
          </div>
        ) : filteredChores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No chores match this filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredChores.map(chore => {
                const isExpanded = expandedId === chore.id;
                const IconComp = getChoreIcon(chore.title);
                const steps = stepsCache[chore.id];
                const isLoadingThis = loadingSteps === chore.id;
                const status = getStatusInfo(chore);
                const assignedProfile = chore.assigned_to ? profiles[chore.assigned_to] || null : null;
                const assignedName = chore.assigned_to === userId
                  ? "You"
                  : (assignedProfile?.display_name || "Partner");

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
                          ) : (
                            <span className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                              status.color === "success"
                                ? "text-success bg-success/10"
                                : status.color === "secondary"
                                  ? "text-secondary bg-secondary/10"
                                  : "text-muted-foreground bg-muted"
                            }`}>
                              {status.label === "Done" ? <Check size={10} /> : <Clock size={10} />}
                              {status.label}
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

                          {/* Edit form */}
                          {editingId === chore.id && (
                            <div className="mx-4 mb-3 rounded-xl bg-muted/60 p-4 space-y-3">
                              <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                                <Pencil size={12} className="text-primary" /> Edit Chore
                              </p>
                              <input
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Chore title"
                              />
                              <div className="flex gap-2">
                                <select
                                  value={editFrequency}
                                  onChange={e => setEditFrequency(e.target.value)}
                                  className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                  <option value="">One-time</option>
                                  <option value="daily">Daily</option>
                                  <option value="weekly">Weekly</option>
                                  <option value="monthly">Monthly</option>
                                </select>
                                <select
                                  value={editAssign}
                                  onChange={e => setEditAssign(e.target.value)}
                                  className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                  <option value="">Both</option>
                                  <option value="me">Me</option>
                                  <option value="partner">Partner</option>
                                </select>
                              </div>
                              <input
                                type="date"
                                value={editDueDate}
                                onChange={e => setEditDueDate(e.target.value)}
                                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-4 py-2 rounded-full bg-muted text-xs font-medium text-muted-foreground"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => saveEdit(chore.id)}
                                  disabled={savingEdit || !editTitle.trim()}
                                  className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                  Save
                                </button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Bottom bar */}
                    <div className="border-t border-border/40 mx-4" />
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {chore.assigned_to ? (
                          <>
                            <AvatarCircle profile={assignedProfile} />
                            {isExpanded && (
                              <span className="text-xs text-muted-foreground">
                                Assigned to {assignedName}
                              </span>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center">
                            <AvatarCircle profile={myProfile} />
                            {partnerProfile && (
                              <AvatarCircle profile={partnerProfile} className="-ml-2 border-2 border-card" />
                            )}
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
                          <>
                            <button
                              onClick={() => startEditing(chore)}
                              className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                            >
                              <Pencil size={14} className="text-primary" />
                            </button>
                            <button
                              onClick={() => deleteChore(chore.id)}
                              className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                            >
                              <Trash2 size={14} className="text-destructive" />
                            </button>
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
                          </>
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
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAdd(true)}
          className="fixed bottom-above-nav right-5 z-30 w-14 h-14 rounded-full love-gradient text-primary-foreground shadow-elevated flex items-center justify-center"
        >
          <Plus size={24} strokeWidth={2.5} />
        </motion.button>

        {/* Add Chore Modal — Apple Calendar style */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/25 backdrop-blur-sm"
              onClick={() => { setShowAdd(false); resetForm(); }}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={0.2}
                onDragEnd={(_e: any, info: any) => {
                  if (info.offset.y > 100 || info.velocity.y > 500) { setShowAdd(false); resetForm(); }
                }}
                onClick={e => e.stopPropagation()}
                className="bg-background w-full max-w-lg rounded-t-3xl shadow-elevated max-h-[72vh] flex flex-col overflow-hidden"
              >
                {/* Drag handle + close */}
                <div className="shrink-0 flex flex-col items-center pt-3 pb-1 bg-background z-10">
                  <div className="w-10 h-1 rounded-full bg-border cursor-grab active:cursor-grabbing" />
                </div>

                {/* Header with X close / Add */}
                <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-background z-10">
                  <button
                    onClick={() => { setShowAdd(false); resetForm(); }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <X size={16} className="text-muted-foreground" />
                  </button>
                  <h3 className="text-base font-bold text-foreground">New Chore</h3>
                  <button
                    onClick={addChore}
                    disabled={submitting || !newTitle.trim()}
                    className="text-sm font-bold text-primary disabled:text-muted-foreground disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : "Add"}
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 px-5 pb-8 space-y-4">
                  {/* Title input — full-width, prominent */}
                  <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    <input
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="Chore name"
                      autoFocus
                      className="w-full px-4 py-3.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none font-medium"
                    />
                    <div className="border-t border-border/50 mx-4" />
                    <textarea
                      placeholder="Notes (optional)"
                      rows={2}
                      className="w-full px-4 py-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Grouped rows — iOS Settings style */}
                  <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border/50">
                    {/* Due Date toggle */}
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center">
                          <CalendarIcon size={16} className="text-secondary" />
                        </div>
                        <span className="text-sm text-foreground font-medium">Due Date</span>
                      </div>
                      <Switch
                        checked={hasDueDate}
                        onCheckedChange={(checked) => {
                          setHasDueDate(checked);
                          setShowCalendar(true);
                          if (checked && !newDueDate) setNewDueDate(new Date());
                        }}
                      />
                    </div>

                    {/* Due Date picker — inline calendar, collapses after selection */}
                    <AnimatePresence>
                      {hasDueDate && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => setShowCalendar(!showCalendar)}
                              className="w-full flex items-center justify-between py-1.5 text-sm"
                            >
                              <span className="text-primary font-medium">
                                {newDueDate ? format(newDueDate, "EEE, MMM d, yyyy") : "Select date"}
                              </span>
                              <span className="text-xs text-muted-foreground">{showCalendar ? "Done" : "Change"}</span>
                            </button>
                          </div>
                          <AnimatePresence>
                            {showCalendar && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden flex justify-center"
                              >
                                <Calendar
                                  mode="single"
                                  selected={newDueDate}
                                  onSelect={(date) => {
                                    setNewDueDate(date);
                                    setShowCalendar(false);
                                  }}
                                  className="p-2 pointer-events-auto"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Repeat / Frequency */}
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                          <Repeat size={16} className="text-primary" />
                        </div>
                        <span className="text-sm text-foreground font-medium">Repeat</span>
                      </div>
                      <select
                        value={newFrequency}
                        onChange={e => setNewFrequency(e.target.value)}
                        className="text-sm text-primary font-medium bg-transparent text-right appearance-none focus:outline-none cursor-pointer pr-0"
                      >
                        <option value="daily">Every Day</option>
                        <option value="weekly">Every Week</option>
                        <option value="monthly">Every Month</option>
                        <option value="">Never</option>
                      </select>
                    </div>
                  </div>

                  {/* Assignment section */}
                  <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border/50">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/60 flex items-center justify-center">
                          <Users size={16} className="text-foreground/70" />
                        </div>
                        <span className="text-sm text-foreground font-medium">Assign To</span>
                      </div>
                      <select
                        value={newAssign}
                        onChange={e => setNewAssign(e.target.value)}
                        className="text-sm text-primary font-medium bg-transparent text-right appearance-none focus:outline-none cursor-pointer pr-0"
                      >
                        <option value="">Both</option>
                        <option value="me">{myProfile?.display_name || "Me"}</option>
                        {partnerProfile && (
                          <option value="partner">{partnerProfile.display_name || "Partner"}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Photo attachment */}
                  <div className="bg-card rounded-2xl border border-border overflow-hidden p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Photo (optional)</p>
                    <MediaPicker
                      imageUrl={null}
                      preview={newFilePreview}
                      onFileSelect={(file, url) => { setNewFile(file); setNewFilePreview(url); }}
                      onClear={() => { setNewFile(null); setNewFilePreview(""); }}
                    />
                  </div>

                  {/* Add button (secondary, for users who scroll) */}
                  <button
                    onClick={addChore}
                    disabled={submitting || !newTitle.trim()}
                    className="w-full h-12 rounded-2xl love-gradient text-primary-foreground font-bold text-sm shadow-soft flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : (
                      <>
                        <Plus size={16} /> Add Chore
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

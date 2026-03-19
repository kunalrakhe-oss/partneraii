import { useState, useEffect, useCallback } from "react";
import { Plus, Minus, Loader2, Check, Flame, BarChart3, Trash2, Sparkles, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, eachDayOfInterval } from "date-fns";
import PageTransition from "@/components/PageTransition";

const colorMap: Record<string, { bg: string; text: string; ring: string; fill: string; gradient: string }> = {
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", ring: "ring-cyan-500/40", fill: "bg-cyan-500", gradient: "from-cyan-500/20 to-cyan-600/5" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", ring: "ring-violet-500/40", fill: "bg-violet-500", gradient: "from-violet-500/20 to-violet-600/5" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-400", ring: "ring-rose-500/40", fill: "bg-rose-500", gradient: "from-rose-500/20 to-rose-600/5" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/40", fill: "bg-amber-500", gradient: "from-amber-500/20 to-amber-600/5" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/40", fill: "bg-emerald-500", gradient: "from-emerald-500/20 to-emerald-600/5" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", ring: "ring-blue-500/40", fill: "bg-blue-500", gradient: "from-blue-500/20 to-blue-600/5" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", ring: "ring-orange-500/40", fill: "bg-orange-500", gradient: "from-orange-500/20 to-orange-600/5" },
  pink: { bg: "bg-pink-500/10", text: "text-pink-400", ring: "ring-pink-500/40", fill: "bg-pink-500", gradient: "from-pink-500/20 to-pink-600/5" },
};

const PRESET_TEMPLATES = [
  { name: "Drink Water", icon: "💧", color: "cyan", target_per_day: 8, desc: "Stay hydrated" },
  { name: "Exercise", icon: "🏋️", color: "emerald", target_per_day: 1, desc: "Move your body" },
  { name: "Meditate", icon: "🧘", color: "violet", target_per_day: 1, desc: "Calm your mind" },
  { name: "Read", icon: "📖", color: "amber", target_per_day: 1, desc: "Feed your brain" },
  { name: "Sleep 8hrs", icon: "😴", color: "blue", target_per_day: 1, desc: "Rest well" },
  { name: "No Sugar", icon: "🍎", color: "rose", target_per_day: 1, desc: "Eat clean" },
  { name: "Walk 10K", icon: "🚶", color: "orange", target_per_day: 1, desc: "Keep moving" },
  { name: "Vitamins", icon: "💊", color: "pink", target_per_day: 1, desc: "Daily dose" },
  { name: "Journal", icon: "✍️", color: "amber", target_per_day: 1, desc: "Reflect daily" },
  { name: "Stretch", icon: "🤸", color: "emerald", target_per_day: 1, desc: "Stay flexible" },
  { name: "Cold Shower", icon: "🚿", color: "cyan", target_per_day: 1, desc: "Build grit" },
  { name: "No Phone 1hr", icon: "📵", color: "violet", target_per_day: 1, desc: "Digital detox" },
];

type Habit = {
  id: string; user_id: string; partner_pair: string; name: string;
  icon: string; color: string; frequency: string; target_per_day: number; is_active: boolean;
};
type HabitLog = { id: string; habit_id: string; user_id: string; log_date: string; count: number };
type AISuggestion = { name: string; icon: string; color: string; target_per_day: number };

export default function HealthPage() {
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);

  // AI prompt drawer
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    if (!partnerPair) return;
    setLoading(true);
    const since = format(subDays(new Date(), 30), "yyyy-MM-dd");
    const [habitsRes, logsRes] = await Promise.all([
      supabase.from("habits").select("*").eq("partner_pair", partnerPair).eq("is_active", true).order("created_at"),
      supabase.from("habit_logs").select("*").eq("partner_pair", partnerPair).gte("log_date", since),
    ]);
    if (habitsRes.data) setHabits(habitsRes.data as Habit[]);
    if (logsRes.data) setLogs(logsRes.data as HabitLog[]);
    setLoading(false);
  }, [partnerPair]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const todayLog = (habitId: string) => logs.find(l => l.habit_id === habitId && l.log_date === today && l.user_id === user?.id);

  const incrementHabit = async (habit: Habit) => {
    if (!user || !partnerPair) return;
    const existing = todayLog(habit.id);
    if (existing) {
      const newCount = existing.count + 1;
      await supabase.from("habit_logs").update({ count: newCount }).eq("id", existing.id);
      setLogs(prev => prev.map(l => l.id === existing.id ? { ...l, count: newCount } : l));
    } else {
      const { data } = await supabase.from("habit_logs").insert({
        habit_id: habit.id, user_id: user.id, partner_pair: partnerPair, log_date: today, count: 1,
      }).select().single();
      if (data) setLogs(prev => [...prev, data as HabitLog]);
    }
  };

  const decrementHabit = async (habit: Habit) => {
    const existing = todayLog(habit.id);
    if (!existing || existing.count <= 0) return;
    if (existing.count === 1) {
      await supabase.from("habit_logs").delete().eq("id", existing.id);
      setLogs(prev => prev.filter(l => l.id !== existing.id));
    } else {
      const newCount = existing.count - 1;
      await supabase.from("habit_logs").update({ count: newCount }).eq("id", existing.id);
      setLogs(prev => prev.map(l => l.id === existing.id ? { ...l, count: newCount } : l));
    }
  };

  const quickAddHabit = async (template: AISuggestion) => {
    if (!user || !partnerPair) return;
    if (habits.some(h => h.name === template.name)) { toast.info("Already tracking this!"); return; }
    const { error } = await supabase.from("habits").insert({
      user_id: user.id, partner_pair: partnerPair, name: template.name,
      icon: template.icon, color: template.color, target_per_day: template.target_per_day,
    });
    if (error) toast.error("Failed to add habit");
    else { toast.success(`"${template.name}" added!`); fetchData(); }
  };

  const deleteHabit = async (id: string) => {
    await supabase.from("habits").update({ is_active: false }).eq("id", id);
    setHabits(prev => prev.filter(h => h.id !== id));
    toast.success("Habit removed");
  };

  const askAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/habit-suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (resp.status === 429) { toast.error("Rate limited, try again shortly."); setAiLoading(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); setAiLoading(false); return; }
      if (!resp.ok) throw new Error("AI error");
      const data = await resp.json();
      setAiSuggestions(data.habits || []);
    } catch {
      toast.error("Failed to get suggestions");
    }
    setAiLoading(false);
  };

  const getStreak = (habitId: string) => {
    const habitLogs = logs.filter(l => l.habit_id === habitId && l.user_id === user?.id && l.count > 0);
    const dates = new Set(habitLogs.map(l => l.log_date));
    let streak = 0;
    let d = new Date();
    if (!dates.has(format(d, "yyyy-MM-dd"))) d = subDays(d, 1);
    while (dates.has(format(d, "yyyy-MM-dd"))) { streak++; d = subDays(d, 1); }
    return streak;
  };

  const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
  const getCompletionForDay = (habitId: string, date: string) => {
    const log = logs.find(l => l.habit_id === habitId && l.log_date === date && l.user_id === user?.id);
    return log?.count || 0;
  };
  const c = (color: string) => colorMap[color] || colorMap.cyan;

  // Circular progress ring SVG
  const CircularProgress = ({ pct, color, size = 44, stroke = 4 }: { pct: number; color: string; size?: number; stroke?: number }) => {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
    const cols = colorMap[color] || colorMap.cyan;
    return (
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-muted/40" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeLinecap="round"
          className={cols.text.replace("text-", "stroke-")}
          style={{ strokeDasharray: circumference, strokeDashoffset: offset, transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
    );
  };

  const availableTemplates = PRESET_TEMPLATES.filter(t => !habits.some(h => h.name === t.name));

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 pb-28 space-y-5">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl -mx-4 px-4 pt-6 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
              <Check size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Habits</h1>
              <p className="text-[11px] text-muted-foreground">Build consistency daily</p>
            </div>
          </div>
          {/* Add Habit button opens AI prompt */}
          <Button size="sm" className="rounded-full gap-1.5 shadow-lg" onClick={() => setAiOpen(true)}>
            <Plus size={15} /> Add Habit
          </Button>
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid grid-cols-2 w-full rounded-2xl h-11">
            <TabsTrigger value="today" className="rounded-xl">✅ Today</TabsTrigger>
            <TabsTrigger value="stats" className="rounded-xl">📊 Stats</TabsTrigger>
          </TabsList>

          {/* TODAY TAB */}
          <TabsContent value="today" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
            ) : (
              <>
                {/* Active habits */}
                {habits.length > 0 && (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {habits.map((habit, idx) => {
                        const log = todayLog(habit.id);
                        const count = log?.count || 0;
                        const target = habit.target_per_day;
                        const pct = Math.min((count / target) * 100, 100);
                        const done = count >= target;
                        const cols = c(habit.color);
                        const streak = getStreak(habit.id);

                        return (
                          <motion.div
                            key={habit.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ delay: idx * 0.04 }}
                          >
                            <div className={`relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-r ${cols.gradient} backdrop-blur-sm p-4 ${done ? "ring-2 " + cols.ring : ""}`}>
                              <div className="flex items-center gap-3">
                                {/* Circular progress with emoji */}
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => incrementHabit(habit)}
                                  className="relative shrink-0"
                                >
                                  <CircularProgress pct={pct} color={habit.color} size={52} stroke={4} />
                                  <span className="absolute inset-0 flex items-center justify-center text-xl">
                                    {done ? <Check size={20} className={cols.text} /> : habit.icon}
                                  </span>
                                </motion.button>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold truncate ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                      {habit.name}
                                    </span>
                                    {streak > 0 && (
                                      <span className="text-[10px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                                        <Flame size={10} />{streak}d
                                      </span>
                                    )}
                                  </div>
                                  {/* Progress dots or bar */}
                                  {target <= 10 ? (
                                    <div className="flex items-center gap-1 mt-2">
                                      {Array.from({ length: target }).map((_, i) => (
                                        <motion.div
                                          key={i}
                                          initial={false}
                                          animate={{ scale: i < count ? 1 : 0.6, opacity: i < count ? 1 : 0.3 }}
                                          className={`h-2 rounded-full transition-colors ${i < count ? cols.fill : "bg-muted-foreground/20"}`}
                                          style={{ width: `${Math.min(100 / target, 20)}%`, maxWidth: 28 }}
                                        />
                                      ))}
                                    </div>
                                  ) : (
                                    <Progress value={pct} className="h-1.5 mt-2" />
                                  )}
                                </div>

                                {/* Count + controls */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={count <= 0} onClick={() => decrementHabit(habit)}>
                                    <Minus size={14} />
                                  </Button>
                                  <span className={`text-sm font-bold tabular-nums min-w-[2.5rem] text-center ${done ? cols.text : "text-foreground"}`}>
                                    {count}/{target}
                                  </span>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => incrementHabit(habit)}>
                                    <Plus size={14} />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}

                {/* Template suggestions on main screen */}
                {availableTemplates.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {habits.length === 0 ? "🎯 Pick a habit to start" : "Suggested habits"}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {availableTemplates.slice(0, habits.length === 0 ? 12 : 6).map((template, idx) => {
                        const cols = c(template.color);
                        return (
                          <motion.button
                            key={template.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => quickAddHabit(template)}
                            className={`flex items-center gap-2.5 p-3 rounded-2xl border border-border/20 bg-gradient-to-r ${cols.gradient} hover:shadow-md active:shadow-sm transition-all text-left group`}
                          >
                            <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${cols.bg} shadow-sm`}>
                              {template.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-foreground block truncate">{template.name}</span>
                              <span className="text-[10px] text-muted-foreground">{template.desc}</span>
                            </div>
                            <Plus size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {habits.length === 0 && (
                  <div className="text-center pt-2">
                    <Button variant="outline" className="rounded-full gap-2" onClick={() => setAiOpen(true)}>
                      <Sparkles size={14} /> Or ask AI for ideas
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* STATS TAB */}
          <TabsContent value="stats" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : habits.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Add habits to see stats.</p>
            ) : (
              <>
                <Card className="p-4 rounded-2xl">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <BarChart3 size={16} className="text-primary" /> Today's Progress
                  </p>
                  {(() => {
                    const completed = habits.filter(h => (todayLog(h.id)?.count || 0) >= h.target_per_day).length;
                    const pct = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{completed}/{habits.length} done</span><span>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-2.5 rounded-full" />
                      </div>
                    );
                  })()}
                </Card>

                {habits.map(habit => {
                  const cols = c(habit.color);
                  const streak = getStreak(habit.id);
                  return (
                    <Card key={habit.id} className="p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{habit.icon}</span>
                          <span className="text-sm font-bold text-foreground">{habit.name}</span>
                          {streak > 0 && (
                            <span className="text-[10px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                              <Flame size={10} />{streak}d
                            </span>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteHabit(habit.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <div className="flex gap-1.5">
                        {last7.map(day => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const cnt = getCompletionForDay(habit.id, dateStr);
                          const filled = cnt >= habit.target_per_day;
                          const partial = cnt > 0 && !filled;
                          return (
                            <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
                              <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-[10px] font-bold transition-all ${
                                filled ? cols.fill + " text-white shadow-sm" : partial ? cols.bg + " " + cols.text : "bg-muted/50 text-muted-foreground"
                              }`}>
                                {cnt > 0 ? cnt : ""}
                              </div>
                              <span className="text-[9px] text-muted-foreground">{format(day, "EEE")}</span>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* AI Prompt Drawer */}
        <Drawer open={aiOpen} onOpenChange={(o) => { setAiOpen(o); if (!o) { setAiSuggestions([]); setAiPrompt(""); } }}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Sparkles size={18} className="text-primary" /> AI Habit Suggestions
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <p className="text-sm text-muted-foreground">
                Describe your goals and AI will suggest personalized habits for you.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. I want to lose weight and sleep better"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && askAI()}
                  className="flex-1"
                  autoFocus
                />
                <Button size="icon" onClick={askAI} disabled={aiLoading || !aiPrompt.trim()} className="shrink-0 rounded-xl">
                  {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </Button>
              </div>

              {/* Quick prompt chips */}
              {aiSuggestions.length === 0 && !aiLoading && (
                <div className="flex flex-wrap gap-2">
                  {["Get fit & healthy", "Better sleep routine", "More productive mornings", "Reduce stress"].map(q => (
                    <button
                      key={q}
                      onClick={() => { setAiPrompt(q); }}
                      className="text-xs px-3 py-1.5 rounded-full border border-border/30 bg-muted/30 text-muted-foreground hover:bg-muted/60 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* AI Suggestions */}
              <AnimatePresence>
                {aiSuggestions.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Tap to add:</p>
                    {aiSuggestions.map((s, i) => {
                      const cols = c(s.color);
                      const alreadyAdded = habits.some(h => h.name === s.name);
                      return (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          disabled={alreadyAdded}
                          onClick={() => { quickAddHabit(s); setAiSuggestions(prev => prev.filter((_, j) => j !== i)); }}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl border border-border/20 bg-gradient-to-r ${cols.gradient} transition-all text-left ${alreadyAdded ? "opacity-40" : "hover:shadow-md active:scale-[0.98]"}`}
                        >
                          <span className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${cols.bg} shadow-sm`}>{s.icon}</span>
                          <div className="flex-1">
                            <span className="text-sm font-bold text-foreground">{s.name}</span>
                            <span className="text-xs text-muted-foreground block">{s.target_per_day}× daily</span>
                          </div>
                          {alreadyAdded ? <Check size={16} className="text-muted-foreground" /> : <Plus size={16} className="text-primary" />}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {aiLoading && (
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </PageTransition>
  );
}

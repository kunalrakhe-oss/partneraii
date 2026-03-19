import { useState, useEffect, useCallback } from "react";
import { Plus, Minus, Loader2, Check, Flame, BarChart3, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, eachDayOfInterval, differenceInCalendarDays } from "date-fns";
import PageTransition from "@/components/PageTransition";

const EMOJI_OPTIONS = ["✅", "💧", "🏃", "📖", "🧘", "💪", "🍎", "😴", "🎯", "🧹", "💊", "🚶"];
const COLOR_OPTIONS = ["cyan", "violet", "rose", "amber", "emerald", "blue", "orange", "pink"];

const colorMap: Record<string, { bg: string; text: string; ring: string; fill: string }> = {
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-500", ring: "ring-cyan-500/40", fill: "bg-cyan-500" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-500", ring: "ring-violet-500/40", fill: "bg-violet-500" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-500", ring: "ring-rose-500/40", fill: "bg-rose-500" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-500", ring: "ring-amber-500/40", fill: "bg-amber-500" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", ring: "ring-emerald-500/40", fill: "bg-emerald-500" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-500", ring: "ring-blue-500/40", fill: "bg-blue-500" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-500", ring: "ring-orange-500/40", fill: "bg-orange-500" },
  pink: { bg: "bg-pink-500/10", text: "text-pink-500", ring: "ring-pink-500/40", fill: "bg-pink-500" },
};

type Habit = {
  id: string;
  user_id: string;
  partner_pair: string;
  name: string;
  icon: string;
  color: string;
  frequency: string;
  target_per_day: number;
  is_active: boolean;
};

type HabitLog = {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string;
  count: number;
};

export default function HealthPage() {
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: "", icon: "✅", color: "cyan", target_per_day: 1 });

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

  const addHabit = async () => {
    if (!user || !partnerPair || !newHabit.name.trim()) return;
    const { error } = await supabase.from("habits").insert({
      user_id: user.id, partner_pair: partnerPair, name: newHabit.name.trim(),
      icon: newHabit.icon, color: newHabit.color, target_per_day: Math.max(1, newHabit.target_per_day),
    });
    if (error) toast.error("Failed to add habit");
    else { toast.success("Habit added!"); setAddOpen(false); setNewHabit({ name: "", icon: "✅", color: "cyan", target_per_day: 1 }); fetchData(); }
  };

  const deleteHabit = async (id: string) => {
    await supabase.from("habits").update({ is_active: false }).eq("id", id);
    setHabits(prev => prev.filter(h => h.id !== id));
    toast.success("Habit removed");
  };

  // Streak calculation
  const getStreak = (habitId: string) => {
    const habitLogs = logs.filter(l => l.habit_id === habitId && l.user_id === user?.id && l.count > 0);
    const dates = new Set(habitLogs.map(l => l.log_date));
    let streak = 0;
    let d = new Date();
    // If not logged today, start from yesterday
    if (!dates.has(format(d, "yyyy-MM-dd"))) {
      d = subDays(d, 1);
    }
    while (dates.has(format(d, "yyyy-MM-dd"))) {
      streak++;
      d = subDays(d, 1);
    }
    return streak;
  };

  // Stats: last 7 days
  const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });

  const getCompletionForDay = (habitId: string, date: string) => {
    const log = logs.find(l => l.habit_id === habitId && l.log_date === date && l.user_id === user?.id);
    return log?.count || 0;
  };

  const colors = (c: string) => colorMap[c] || colorMap.cyan;

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 pb-28 space-y-5">
        <div className="sticky top-0 z-20 bg-background -mx-4 px-4 pt-6 pb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Check size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Habit Tracker</h1>
            <p className="text-xs text-muted-foreground">Build consistency, one tap at a time</p>
          </div>
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="today">✅ Today</TabsTrigger>
            <TabsTrigger value="stats">📊 Stats</TabsTrigger>
          </TabsList>

          {/* TODAY TAB */}
          <TabsContent value="today" className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : habits.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-muted-foreground">No habits yet. Add your first one!</p>
              </div>
            ) : (
              <AnimatePresence>
                {habits.map(habit => {
                  const log = todayLog(habit.id);
                  const count = log?.count || 0;
                  const target = habit.target_per_day;
                  const pct = Math.min((count / target) * 100, 100);
                  const done = count >= target;
                  const c = colors(habit.color);
                  const streak = getStreak(habit.id);

                  return (
                    <motion.div
                      key={habit.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Card className={`p-4 transition-all ${done ? "ring-2 " + c.ring : ""}`}>
                        <div className="flex items-center gap-3">
                          {/* Tap area */}
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => incrementHabit(habit)}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${c.bg} ${done ? "ring-2 " + c.ring : ""}`}
                          >
                            {habit.icon}
                          </motion.button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-foreground truncate">{habit.name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {streak > 0 && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                    <Flame size={12} className="text-orange-500" />{streak}d
                                  </span>
                                )}
                                <span className={`text-xs font-bold ${done ? c.text : "text-muted-foreground"}`}>
                                  {count}/{target}
                                </span>
                              </div>
                            </div>

                            {/* Progress dots */}
                            <div className="flex items-center gap-1 mt-1.5">
                              {Array.from({ length: target }).map((_, i) => (
                                <motion.div
                                  key={i}
                                  initial={false}
                                  animate={{ scale: i < count ? 1 : 0.8 }}
                                  className={`w-3 h-3 rounded-full ${i < count ? c.fill : "bg-muted"}`}
                                />
                              ))}
                              {target > 8 && <span className="text-[10px] text-muted-foreground ml-1">{Math.round(pct)}%</span>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => incrementHabit(habit)}>
                              <Plus size={14} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={count <= 0} onClick={() => decrementHabit(habit)}>
                              <Minus size={14} />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {/* Add Habit Button */}
            <Drawer open={addOpen} onOpenChange={setAddOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus size={16} className="mr-2" /> Add Habit
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader><DrawerTitle>New Habit</DrawerTitle></DrawerHeader>
                <div className="space-y-4 px-4 pb-6">
                  <Input
                    placeholder="Habit name (e.g. Drink Water)"
                    value={newHabit.name}
                    onChange={e => setNewHabit(p => ({ ...p, name: e.target.value }))}
                  />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Icon</p>
                    <div className="flex flex-wrap gap-2">
                      {EMOJI_OPTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => setNewHabit(p => ({ ...p, icon: emoji }))}
                          className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center border transition-all ${newHabit.icon === emoji ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border/30 hover:bg-muted/40"}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Color</p>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewHabit(p => ({ ...p, color: c }))}
                          className={`w-8 h-8 rounded-full ${colorMap[c].fill} transition-all ${newHabit.color === c ? "ring-2 ring-offset-2 ring-primary" : "opacity-60 hover:opacity-100"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Daily target</p>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setNewHabit(p => ({ ...p, target_per_day: Math.max(1, p.target_per_day - 1) }))}>
                        <Minus size={14} />
                      </Button>
                      <span className="text-lg font-bold w-8 text-center">{newHabit.target_per_day}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setNewHabit(p => ({ ...p, target_per_day: Math.min(20, p.target_per_day + 1) }))}>
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                  <Button onClick={addHabit} disabled={!newHabit.name.trim()} className="w-full">Create Habit</Button>
                </div>
              </DrawerContent>
            </Drawer>
          </TabsContent>

          {/* STATS TAB */}
          <TabsContent value="stats" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : habits.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Add habits to see stats.</p>
            ) : (
              <>
                {/* Overall today summary */}
                <Card className="p-4">
                  <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <BarChart3 size={16} className="text-primary" /> Today's Progress
                  </p>
                  {(() => {
                    const completed = habits.filter(h => {
                      const log = todayLog(h.id);
                      return (log?.count || 0) >= h.target_per_day;
                    }).length;
                    const pct = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{completed}/{habits.length} habits done</span>
                          <span>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })()}
                </Card>

                {/* 7-day grid per habit */}
                {habits.map(habit => {
                  const c = colors(habit.color);
                  const streak = getStreak(habit.id);
                  return (
                    <Card key={habit.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{habit.icon}</span>
                          <span className="text-sm font-semibold text-foreground">{habit.name}</span>
                          {streak > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Flame size={12} className="text-orange-500" />{streak}d streak
                            </span>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteHabit(habit.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>

                      {/* 7 day heatmap */}
                      <div className="flex gap-1.5">
                        {last7.map(day => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const count = getCompletionForDay(habit.id, dateStr);
                          const filled = count >= habit.target_per_day;
                          const partial = count > 0 && !filled;
                          return (
                            <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className={`w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                  filled ? c.fill + " text-white" : partial ? c.bg + " " + c.text : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {count > 0 ? count : ""}
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
      </div>
    </PageTransition>
  );
}

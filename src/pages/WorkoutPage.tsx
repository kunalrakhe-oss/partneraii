import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Dumbbell, Plus, Flame, Clock, Trash2, Trophy, Send, Bot, User, Sparkles, X, ChevronDown, Zap, Target, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const WORKOUT_TYPES = [
  { label: "Running", emoji: "🏃" },
  { label: "Gym", emoji: "🏋️" },
  { label: "Yoga", emoji: "🧘" },
  { label: "Swimming", emoji: "🏊" },
  { label: "Cycling", emoji: "🚴" },
  { label: "Walking", emoji: "🚶" },
  { label: "HIIT", emoji: "⚡" },
  { label: "Dance", emoji: "💃" },
  { label: "Sports", emoji: "⚽" },
  { label: "Other", emoji: "🏆" },
];

const QUICK_PROMPTS = [
  { label: "Today's Workout", emoji: "🔥", prompt: "Generate a quick 30-minute workout for me today" },
  { label: "Couple Workout", emoji: "💑", prompt: "Suggest a fun workout my partner and I can do together" },
  { label: "Stretch Routine", emoji: "🧘", prompt: "Give me a 10-minute stretching routine" },
  { label: "HIIT Session", emoji: "⚡", prompt: "Create a 20-minute HIIT workout" },
];

interface Workout {
  id: string;
  user_id: string;
  type: string;
  duration_minutes: number;
  notes: string | null;
  workout_date: string;
  created_at: string;
}

type ChatMsg = { role: "user" | "assistant"; content: string };

const FITBOT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fitbot-chat`;

async function streamFitbot({
  messages,
  workoutHistory,
  stats,
  onDelta,
  onDone,
  onError,
}: {
  messages: ChatMsg[];
  workoutHistory: Workout[];
  stats: any;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(FITBOT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, workoutHistory, stats }),
  });

  if (!resp.ok) {
    if (resp.status === 429) { onError("Rate limited — try again in a moment"); return; }
    if (resp.status === 402) { onError("AI credits exhausted"); return; }
    onError("Failed to connect to FitBot"); return;
  }

  if (!resp.body) { onError("No response body"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}

export default function WorkoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState("Running");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [partnerName, setPartnerName] = useState("Partner");
  const [activeTab, setActiveTab] = useState<"chat" | "log" | "history">("chat");

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!partnerPair) return;
    supabase.from("workouts").select("*").eq("partner_pair", partnerPair)
      .order("workout_date", { ascending: false }).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setWorkouts(data as Workout[]); });
  }, [partnerPair]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("partner_id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.partner_id) {
          supabase.from("profiles").select("display_name").eq("id", data.partner_id).maybeSingle()
            .then(({ data: p }) => { if (p?.display_name) setPartnerName(p.display_name.split(" ")[0]); });
        }
      });
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const myWorkouts = workouts.filter(w => w.user_id === user?.id);
  const partnerWorkouts = workouts.filter(w => w.user_id !== user?.id);
  const today = format(new Date(), "yyyy-MM-dd");
  const todayCount = myWorkouts.filter(w => w.workout_date === today).length;
  const totalMinutes = myWorkouts.reduce((s, w) => s + w.duration_minutes, 0);
  const getEmoji = (t: string) => WORKOUT_TYPES.find(wt => wt.label === t)?.emoji || "🏆";

  const stats = {
    totalWorkouts: myWorkouts.length,
    totalMinutes,
    todayCount,
    partnerWorkouts: partnerWorkouts.length,
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: ChatMsg = { role: "user", content: text.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsStreaming(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setChatMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamFitbot({
        messages: [...chatMessages, userMsg],
        workoutHistory: myWorkouts.slice(0, 5),
        stats,
        onDelta: upsertAssistant,
        onDone: () => setIsStreaming(false),
        onError: (msg) => {
          setChatMessages(prev => [...prev, { role: "assistant", content: `❌ ${msg}` }]);
          setIsStreaming(false);
        },
      });
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "❌ Something went wrong. Try again!" }]);
      setIsStreaming(false);
    }
  }, [chatMessages, isStreaming, myWorkouts, stats]);

  const addWorkout = async () => {
    if (!user || !partnerPair || saving) return;
    setSaving(true);
    const { data, error } = await supabase.from("workouts").insert({
      user_id: user.id, partner_pair: partnerPair, type, duration_minutes: duration,
      notes: notes.trim() || null, workout_date: today,
    }).select().single();
    if (!error && data) {
      setWorkouts(prev => [data as Workout, ...prev]);
      setShowAdd(false); setType("Running"); setDuration(30); setNotes("");
      setActiveTab("history");
    }
    setSaving(false);
  };

  const deleteWorkout = async (id: string) => {
    await supabase.from("workouts").delete().eq("id", id);
    setWorkouts(prev => prev.filter(w => w.id !== id));
  };

  return (
    <PageTransition>
      <div className="flex flex-col h-screen max-w-lg mx-auto bg-background">
        {/* Header */}
        <div className="px-5 pt-10 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <ArrowLeft size={18} className="text-foreground" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Bot size={18} className="text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground leading-tight">FitBot</h1>
                  <p className="text-[10px] text-muted-foreground">AI Fitness Coach</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Mini Stats */}
              <div className="flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full">
                <Flame size={12} className="text-primary" />
                <span className="text-[11px] font-bold text-primary">{todayCount}</span>
              </div>
              <div className="flex items-center gap-1 bg-secondary/10 px-2.5 py-1 rounded-full">
                <Trophy size={12} className="text-secondary" />
                <span className="text-[11px] font-bold text-secondary">{myWorkouts.length}</span>
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex bg-muted rounded-xl p-1 gap-1">
            {([
              { key: "chat", label: "AI Coach", icon: Sparkles },
              { key: "log", label: "Log", icon: Plus },
              { key: "history", label: "History", icon: Clock },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* === AI COACH TAB === */}
            {activeTab === "chat" && (
              <motion.div key="chat" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-8">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary flex items-center justify-center mb-4 shadow-elevated"
                      >
                        <Bot size={36} className="text-primary-foreground" />
                      </motion.div>
                      <h2 className="text-xl font-bold text-foreground mb-1">Hey! I'm FitBot 💪</h2>
                      <p className="text-sm text-muted-foreground text-center mb-6 max-w-[260px]">
                        Your AI fitness coach. Ask me for workouts, tips, or fitness advice!
                      </p>

                      {/* Quick Prompts */}
                      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                        {QUICK_PROMPTS.map(qp => (
                          <button
                            key={qp.label}
                            onClick={() => sendMessage(qp.prompt)}
                            className="bg-card border border-border rounded-2xl p-3 text-left hover:border-primary/40 active:scale-[0.98] transition-all shadow-sm"
                          >
                            <span className="text-lg mb-1 block">{qp.emoji}</span>
                            <p className="text-xs font-semibold text-foreground">{qp.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            msg.role === "assistant"
                              ? "bg-gradient-to-br from-primary to-secondary"
                              : "bg-muted"
                          }`}>
                            {msg.role === "assistant" ? (
                              <Bot size={14} className="text-primary-foreground" />
                            ) : (
                              <User size={14} className="text-muted-foreground" />
                            )}
                          </div>
                          <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-tr-md"
                              : "bg-card border border-border shadow-sm rounded-tl-md"
                          }`}>
                            {msg.role === "assistant" ? (
                              <div className="prose prose-sm max-w-none text-foreground [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_strong]:text-foreground [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_ul]:my-1 [&_ol]:my-1 [&_p]:my-1">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-sm">{msg.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {isStreaming && chatMessages[chatMessages.length - 1]?.role === "user" && (
                        <div className="flex gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
                            <Bot size={14} className="text-primary-foreground" />
                          </div>
                          <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </>
                  )}
                </div>

                {/* Chat Input */}
                <div className="px-5 pb-5 pt-2 border-t border-border bg-background">
                  {chatMessages.length > 0 && (
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                      {QUICK_PROMPTS.map(qp => (
                        <button
                          key={qp.label}
                          onClick={() => sendMessage(qp.prompt)}
                          disabled={isStreaming}
                          className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-full text-[11px] font-medium text-muted-foreground whitespace-nowrap shrink-0 hover:bg-muted/80 disabled:opacity-40"
                        >
                          {qp.emoji} {qp.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(chatInput)}
                      placeholder="Ask FitBot anything..."
                      disabled={isStreaming}
                      className="flex-1 h-11 bg-muted rounded-xl px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                    <button
                      onClick={() => sendMessage(chatInput)}
                      disabled={!chatInput.trim() || isStreaming}
                      className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 shrink-0"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* === LOG TAB === */}
            {activeTab === "log" && (
              <motion.div key="log" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="overflow-y-auto px-5 py-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: "Today", value: todayCount, icon: Flame, gradient: "from-destructive/20 to-destructive/5", color: "text-destructive" },
                    { label: "Minutes", value: totalMinutes, icon: Clock, gradient: "from-primary/20 to-primary/5", color: "text-primary" },
                    { label: "Total", value: myWorkouts.length, icon: Trophy, gradient: "from-secondary/20 to-secondary/5", color: "text-secondary" },
                  ].map(s => (
                    <div key={s.label} className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-3.5 text-center border border-border/30`}>
                      <s.icon size={20} className={`${s.color} mx-auto mb-1.5`} />
                      <p className="text-xl font-bold text-foreground">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Log Form */}
                <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Dumbbell size={16} className="text-primary" />
                    <p className="text-sm font-bold text-foreground">Log Workout</p>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {WORKOUT_TYPES.map(wt => (
                      <button key={wt.label} onClick={() => setType(wt.label)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-all ${type === wt.label ? "bg-primary/20 ring-2 ring-primary" : "bg-muted"}`}>
                        <span className="text-lg">{wt.emoji}</span>
                        <span className="text-[10px] text-foreground">{wt.label}</span>
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Duration (min)</label>
                    <div className="flex gap-2">
                      {[15, 30, 45, 60, 90].map(d => (
                        <button key={d} onClick={() => setDuration(d)}
                          className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all ${duration === d ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-foreground"}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
                    className="w-full h-11 bg-muted rounded-xl px-4 text-sm text-foreground placeholder:text-muted-foreground border-none focus:outline-none focus:ring-2 focus:ring-ring" />
                  <button onClick={addWorkout} disabled={saving}
                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-soft">
                    <Plus size={16} />
                    {saving ? "Saving..." : "Log Workout"}
                  </button>
                </div>

                {/* AI Suggestion */}
                <button
                  onClick={() => { setActiveTab("chat"); sendMessage("Suggest a workout based on my recent activity"); }}
                  className="w-full mt-4 bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 rounded-2xl p-4 border border-primary/20 flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Need ideas?</p>
                    <p className="text-xs text-muted-foreground">Ask FitBot for a personalized workout</p>
                  </div>
                </button>
              </motion.div>
            )}

            {/* === HISTORY TAB === */}
            {activeTab === "history" && (
              <motion.div key="history" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="overflow-y-auto px-5 py-4 space-y-6">
                {/* My Workouts */}
                <div>
                  <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <User size={14} className="text-primary" /> My Workouts
                  </p>
                  {myWorkouts.length === 0 ? (
                    <div className="bg-card rounded-2xl p-6 shadow-card text-center border border-border">
                      <Dumbbell size={28} className="text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium text-muted-foreground">No workouts yet</p>
                      <button onClick={() => setActiveTab("log")} className="text-xs text-primary font-semibold mt-2">Log your first workout →</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myWorkouts.map(w => (
                        <motion.div key={w.id} layout className="bg-card rounded-2xl px-4 py-3 shadow-card flex items-center gap-3 border border-border/50">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                            <span className="text-xl">{getEmoji(w.type)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{w.type}</p>
                            <p className="text-xs text-muted-foreground">{w.duration_minutes} min · {format(new Date(w.workout_date), "MMM d")}</p>
                            {w.notes && <p className="text-xs text-muted-foreground/70 truncate">{w.notes}</p>}
                          </div>
                          <button onClick={() => deleteWorkout(w.id)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 transition-colors">
                            <Trash2 size={14} className="text-muted-foreground" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Partner Workouts */}
                <div>
                  <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <Heart size={14} className="text-secondary" /> {partnerName}'s Workouts
                  </p>
                  {partnerWorkouts.length === 0 ? (
                    <div className="bg-card rounded-2xl p-4 shadow-card text-center border border-border">
                      <p className="text-sm text-muted-foreground">No workouts from {partnerName} yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {partnerWorkouts.map(w => (
                        <div key={w.id} className="bg-card rounded-2xl px-4 py-3 shadow-card flex items-center gap-3 border border-border/50">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                            <span className="text-xl">{getEmoji(w.type)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{w.type}</p>
                            <p className="text-xs text-muted-foreground">{w.duration_minutes} min · {format(new Date(w.workout_date), "MMM d")}</p>
                            {w.notes && <p className="text-xs text-muted-foreground/70 truncate">{w.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}

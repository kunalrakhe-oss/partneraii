import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Dumbbell, Plus, Flame, Clock, Trash2, Trophy, Send, Bot, User,
  Sparkles, Play, Square, Check, ChevronRight, Timer, RotateCcw, Zap,
  Target, Heart, MessageCircle, X, Pause, SkipForward
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Exercise {
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
  icon: string;
  completedSets: number[];
}

interface WorkoutPlan {
  title: string;
  focus: string;
  level: string;
  estimatedMinutes: number;
  estimatedCalories: number;
  warmup?: string;
  cooldown?: string;
  exercises: Exercise[];
}

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

// ─── Constants ───────────────────────────────────────────────────────────────

const FOCUS_OPTIONS = [
  { label: "Full Body", emoji: "💪", value: "full body strength" },
  { label: "Upper Body", emoji: "🏋️", value: "upper body" },
  { label: "Lower Body", emoji: "🦵", value: "lower body and legs" },
  { label: "Core", emoji: "🎯", value: "core and abs" },
  { label: "Cardio", emoji: "🏃", value: "cardio and conditioning" },
  { label: "Yoga", emoji: "🧘", value: "yoga and flexibility" },
  { label: "Kegel", emoji: "🫀", value: "kegel exercises for pelvic floor" },
  { label: "Meditation", emoji: "🧠", value: "meditation and breathing" },
  { label: "Walking", emoji: "🚶", value: "walking and light movement" },
];

const MUSCLE_COLORS: Record<string, string> = {
  Chest: "bg-primary/20 text-primary",
  Back: "bg-secondary/20 text-secondary-foreground",
  Legs: "bg-success/20 text-success",
  Shoulders: "bg-warning/20 text-warning",
  Arms: "bg-accent/20 text-accent-foreground",
  Core: "bg-destructive/20 text-destructive",
};

const FITBOT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fitbot-chat`;

// ─── Streaming helper ────────────────────────────────────────────────────────

async function streamFitbot({
  messages, workoutHistory, stats, onDelta, onDone, onError,
}: {
  messages: ChatMsg[]; workoutHistory: Workout[]; stats: any;
  onDelta: (t: string) => void; onDone: () => void; onError: (m: string) => void;
}) {
  const language = localStorage.getItem("lovelist-language") || "en";
  const resp = await fetch(FITBOT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, workoutHistory, stats, language }),
  });
  if (!resp.ok) {
    if (resp.status === 429) { onError("Rate limited — try again"); return; }
    if (resp.status === 402) { onError("AI credits exhausted"); return; }
    onError("Connection failed"); return;
  }
  if (!resp.body) { onError("No response"); return; }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const p = JSON.parse(json);
        const c = p.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch { buf = line + "\n" + buf; break; }
    }
  }
  onDone();
}

// ─── Rest Timer Component ────────────────────────────────────────────────────

function RestTimer({ seconds, onComplete }: { seconds: number; onComplete: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || remaining <= 0) {
      if (remaining <= 0) onComplete();
      return;
    }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, paused, onComplete]);

  const pct = ((seconds - remaining) / seconds) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center"
    >
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Rest Timer</p>
      <div className="relative w-40 h-40 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" strokeWidth="4" className="stroke-muted" />
          <circle cx="50" cy="50" r="45" fill="none" strokeWidth="4" className="stroke-primary"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-foreground tabular-nums">{remaining}s</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => setPaused(p => !p)}
          className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          {paused ? <Play size={18} className="text-foreground" /> : <Pause size={18} className="text-foreground" />}
        </button>
        <button onClick={onComplete}
          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
          <SkipForward size={18} className="text-primary-foreground" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Exercise Detail Sheet ───────────────────────────────────────────────────

function ExerciseDetail({ exercise, index, onComplete, onClose }: {
  exercise: Exercise; index: number;
  onComplete: (idx: number, setIdx: number) => void; onClose: () => void;
}) {
  const badge = MUSCLE_COLORS[exercise.muscleGroup] || "bg-muted text-muted-foreground";
  const [showTimer, setShowTimer] = useState(false);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/50 z-[60]" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 max-h-[75vh] bg-card rounded-t-3xl z-[60] overflow-y-auto safe-bottom"
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />
        <div className="px-6 pb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{exercise.icon}</span>
              <div>
                <h3 className="text-lg font-bold text-foreground">{exercise.name}</h3>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${badge}`}>
                  {exercise.muscleGroup}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>

          {exercise.notes && (
            <div className="bg-muted/50 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs text-muted-foreground">💡 {exercise.notes}</p>
            </div>
          )}

          {/* Sets Grid */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Sets · {exercise.reps} reps · {exercise.restSeconds}s rest
          </p>
          <div className="space-y-2 mb-5">
            {Array.from({ length: exercise.sets }).map((_, si) => {
              const done = exercise.completedSets.includes(si);
              return (
                <div key={si} className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                  done ? "bg-success/10 border border-success/30" : "bg-muted/50 border border-transparent"
                }`}>
                  <button
                    onClick={() => { if (!done) { onComplete(index, si); if (si < exercise.sets - 1) setShowTimer(true); } }}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      done ? "bg-success" : "border-2 border-border"
                    }`}
                  >
                    {done && <Check size={14} className="text-success-foreground" />}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      Set {si + 1}
                    </p>
                    <p className="text-xs text-muted-foreground">{exercise.reps} reps</p>
                  </div>
                  {done && <span className="text-xs text-success font-semibold">Done ✓</span>}
                </div>
              );
            })}
          </div>

          <button onClick={() => setShowTimer(true)}
            className="w-full h-11 rounded-xl bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-2">
            <Timer size={16} /> Start {exercise.restSeconds}s Rest
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showTimer && <RestTimer seconds={exercise.restSeconds} onComplete={() => setShowTimer(false)} />}
      </AnimatePresence>
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WorkoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();

  // Data
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [partnerName, setPartnerName] = useState("Partner");

  // Workout plan
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState<number | null>(null);

  // AI recommendation
  const [recommendation, setRecommendation] = useState("");

  // Chat
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!partnerPair) return;
    supabase.from("workouts").select("*").eq("partner_pair", partnerPair)
      .order("workout_date", { ascending: false }).limit(20)
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

  // AI Recommendation
  useEffect(() => {
    if (!partnerPair) return;
    const myW = workouts.filter(w => w.user_id === user?.id);
    supabase.functions.invoke("fitbot-chat", {
      body: {
        type: "recommend",
        workoutHistory: myW.slice(0, 5),
        stats: { totalWorkouts: myW.length, totalMinutes: myW.reduce((s, w) => s + w.duration_minutes, 0) },
        language: localStorage.getItem("lovelist-language") || "en",
      },
    }).then(({ data }) => { if (data?.recommendation) setRecommendation(data.recommendation); });
  }, [partnerPair, workouts, user]);

  // Workout timer
  useEffect(() => {
    if (!workoutStarted) return;
    const i = setInterval(() => setWorkoutTimer(t => t + 1), 1000);
    return () => clearInterval(i);
  }, [workoutStarted]);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const myWorkouts = workouts.filter(w => w.user_id === user?.id);
  const today = format(new Date(), "yyyy-MM-dd");
  const todayCount = myWorkouts.filter(w => w.workout_date === today).length;

  const totalCompletedSets = plan?.exercises.reduce((s, e) => s + e.completedSets.length, 0) || 0;
  const totalSets = plan?.exercises.reduce((s, e) => s + e.sets, 0) || 1;
  const progress = Math.round((totalCompletedSets / totalSets) * 100);
  const completedExercises = plan?.exercises.filter(e => e.completedSets.length === e.sets).length || 0;

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ─── Actions ───────────────────────────────────────────────────────────────

  const generatePlan = async (focus: string) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("fitbot-chat", {
        body: {
          type: "generate-plan",
          context: { focus, level: "intermediate", duration: 45 },
          language: localStorage.getItem("lovelist-language") || "en",
        },
      });
      if (error) throw error;
      if (data?.plan) {
        const exercises = data.plan.exercises.map((e: any) => ({ ...e, completedSets: [] }));
        setPlan({ ...data.plan, exercises });
        setWorkoutStarted(false);
        setWorkoutTimer(0);
      }
    } catch (e) {
      console.error("Generate error:", e);
    } finally {
      setGenerating(false);
    }
  };

  const completeSet = (exIdx: number, setIdx: number) => {
    if (!plan) return;
    setPlan(prev => {
      if (!prev) return prev;
      const exercises = prev.exercises.map((e, i) => {
        if (i !== exIdx) return e;
        if (e.completedSets.includes(setIdx)) return e;
        return { ...e, completedSets: [...e.completedSets, setIdx] };
      });
      return { ...prev, exercises };
    });
  };

  const finishWorkout = async () => {
    if (!user || !partnerPair || !plan) return;
    await supabase.from("workouts").insert({
      user_id: user.id,
      partner_pair: partnerPair,
      type: plan.focus,
      duration_minutes: Math.round(workoutTimer / 60) || plan.estimatedMinutes,
      notes: `${plan.title} — ${completedExercises}/${plan.exercises.length} exercises`,
      workout_date: today,
    });
    setWorkouts(prev => [{
      id: crypto.randomUUID(), user_id: user.id, type: plan.focus,
      duration_minutes: Math.round(workoutTimer / 60) || plan.estimatedMinutes,
      notes: `${plan.title}`, workout_date: today, created_at: new Date().toISOString(),
    }, ...prev]);
    setPlan(null);
    setWorkoutStarted(false);
    setWorkoutTimer(0);
  };

  const sendChat = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: ChatMsg = { role: "user", content: text.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsStreaming(true);
    let soFar = "";
    const upsert = (chunk: string) => {
      soFar += chunk;
      setChatMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: soFar } : m);
        return [...prev, { role: "assistant", content: soFar }];
      });
    };
    try {
      await streamFitbot({
        messages: [...chatMessages, userMsg],
        workoutHistory: myWorkouts.slice(0, 5),
        stats: { totalWorkouts: myWorkouts.length, todayCount },
        onDelta: upsert,
        onDone: () => setIsStreaming(false),
        onError: (m) => { setChatMessages(prev => [...prev, { role: "assistant", content: `❌ ${m}` }]); setIsStreaming(false); },
      });
    } catch { setIsStreaming(false); }
  }, [chatMessages, isStreaming, myWorkouts, todayCount]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="flex flex-col h-[100dvh] max-w-lg mx-auto bg-background relative">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="px-5 pt-10 pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <ArrowLeft size={18} className="text-foreground" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Workout</h1>
                <p className="text-xs text-muted-foreground">
                  {plan ? plan.title : "AI-Powered Fitness"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowChat(c => !c)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  showChat ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}>
                <MessageCircle size={18} />
              </button>
              <div className="flex items-center gap-1 bg-primary/10 px-2.5 py-1.5 rounded-full">
                <Flame size={13} className="text-primary" />
                <span className="text-xs font-bold text-primary">{todayCount}</span>
              </div>
            </div>
          </div>

          {/* Progress bar when plan active */}
          {plan && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  {completedExercises}/{plan.exercises.length} exercises
                </p>
                <p className="text-[11px] font-bold text-primary">{progress}%</p>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full bg-primary rounded-full"
                  animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
              </div>
              {workoutStarted && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Timer size={12} className="text-muted-foreground" />
                  <span className="text-xs font-bold text-foreground tabular-nums">{formatTimer(workoutTimer)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ── AI Chat Overlay ─────────────────────────────────────────── */}
            {showChat && (
              <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-3 shadow-elevated">
                        <Bot size={28} className="text-primary-foreground" />
                      </div>
                      <p className="text-sm font-bold text-foreground mb-1">Ask FitBot</p>
                      <p className="text-xs text-muted-foreground text-center max-w-[220px]">Get form tips, exercise alternatives, or workout advice</p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        msg.role === "assistant" ? "bg-gradient-to-br from-primary to-secondary" : "bg-muted"
                      }`}>
                        {msg.role === "assistant" ? <Bot size={12} className="text-primary-foreground" /> : <User size={12} className="text-muted-foreground" />}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                        msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm"
                      }`}>
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none text-foreground [&_p]:text-xs [&_p]:leading-relaxed [&_li]:text-xs [&_strong]:text-foreground">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-xs">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="px-5 pb-5 pt-2 border-t border-border">
                  <div className="flex gap-2">
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendChat(chatInput)}
                      placeholder="Ask FitBot..." disabled={isStreaming}
                      className="flex-1 h-10 bg-muted rounded-xl px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50" />
                    <button onClick={() => sendChat(chatInput)} disabled={!chatInput.trim() || isStreaming}
                      className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40">
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Plan Picker (no plan yet) ───────────────────────────────── */}
            {!showChat && !plan && (
              <motion.div key="picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="px-5 py-4 pb-24 space-y-5">

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Today", value: todayCount, icon: Flame, gradient: "from-destructive/15 to-destructive/5", color: "text-destructive" },
                    { label: "Total Min", value: myWorkouts.reduce((s, w) => s + w.duration_minutes, 0), icon: Clock, gradient: "from-primary/15 to-primary/5", color: "text-primary" },
                    { label: "Workouts", value: myWorkouts.length, icon: Trophy, gradient: "from-secondary/15 to-secondary/5", color: "text-secondary-foreground" },
                  ].map(s => (
                    <div key={s.label} className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-3 text-center border border-border/30`}>
                      <s.icon size={18} className={`${s.color} mx-auto mb-1`} />
                      <p className="text-lg font-bold text-foreground">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* AI Recommendation */}
                {recommendation && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-primary/10 via-card to-secondary/10 rounded-2xl p-4 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <Sparkles size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">AI Recommendation</p>
                        <p className="text-xs text-foreground leading-relaxed">{recommendation}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Focus Picker */}
                <div>
                  <p className="text-sm font-bold text-foreground mb-3">Choose Your Focus</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {FOCUS_OPTIONS.map(f => (
                      <button key={f.label} onClick={() => generatePlan(f.value)} disabled={generating}
                        className="bg-card rounded-2xl p-4 border border-border/50 flex flex-col items-center gap-2 hover:border-primary/40 active:scale-[0.97] transition-all shadow-card disabled:opacity-50">
                        <span className="text-2xl">{f.emoji}</span>
                        <p className="text-xs font-semibold text-foreground">{f.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {generating && (
                  <div className="flex flex-col items-center py-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-3 animate-pulse">
                      <Bot size={22} className="text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Generating your plan...</p>
                    <p className="text-xs text-muted-foreground">FitBot is crafting the perfect workout</p>
                  </div>
                )}

                {/* Recent History */}
                {myWorkouts.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-foreground mb-3">Recent Workouts</p>
                    <div className="space-y-2">
                      {myWorkouts.slice(0, 3).map(w => (
                        <div key={w.id} className="bg-card rounded-xl px-4 py-3 border border-border/50 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                            <Dumbbell size={16} className="text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{w.type}</p>
                            <p className="text-[11px] text-muted-foreground">{w.duration_minutes}m · {format(new Date(w.workout_date), "MMM d")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Partner Workouts */}
                {workouts.filter(w => w.user_id !== user?.id).length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <Heart size={13} className="text-secondary" /> {partnerName}'s Workouts
                    </p>
                    <div className="space-y-2">
                      {workouts.filter(w => w.user_id !== user?.id).slice(0, 2).map(w => (
                        <div key={w.id} className="bg-card rounded-xl px-4 py-3 border border-border/50 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                            <Dumbbell size={16} className="text-secondary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{w.type}</p>
                            <p className="text-[11px] text-muted-foreground">{w.duration_minutes}m · {format(new Date(w.workout_date), "MMM d")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Active Workout Plan ─────────────────────────────────────── */}
            {!showChat && plan && (
              <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="px-5 py-4 space-y-4 pb-28">

                {/* Plan Header Card */}
                <div className="bg-gradient-to-br from-primary/15 via-card to-secondary/15 rounded-2xl p-5 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{plan.level}</span>
                    <span className="text-[10px] font-bold text-muted-foreground">{plan.focus}</span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-2">{plan.title}</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{plan.estimatedMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Flame size={13} className="text-destructive" />
                      <span className="text-xs text-muted-foreground">~{plan.estimatedCalories} cal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Target size={13} className="text-primary" />
                      <span className="text-xs text-muted-foreground">{plan.exercises.length} exercises</span>
                    </div>
                  </div>
                </div>

                {/* Warmup */}
                {plan.warmup && (
                  <div className="bg-warning/10 rounded-xl px-4 py-3 border border-warning/20">
                    <p className="text-[10px] font-bold text-warning uppercase mb-0.5">Warmup</p>
                    <p className="text-xs text-foreground">{plan.warmup}</p>
                  </div>
                )}

                {/* Exercise List */}
                <div className="space-y-2">
                  {plan.exercises.map((ex, idx) => {
                    const done = ex.completedSets.length === ex.sets;
                    const badge = MUSCLE_COLORS[ex.muscleGroup] || "bg-muted text-muted-foreground";
                    return (
                      <motion.button
                        key={idx}
                        layout
                        onClick={() => setSelectedExercise(idx)}
                        className={`w-full text-left bg-card rounded-2xl px-4 py-3.5 border flex items-center gap-3.5 transition-all active:scale-[0.98] ${
                          done ? "border-success/30 bg-success/5" : "border-border/50"
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                          done ? "bg-success/20" : "bg-muted"
                        }`}>
                          {done ? <Check size={18} className="text-success" /> : ex.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={`text-sm font-semibold ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                              {ex.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${badge}`}>
                              {ex.muscleGroup}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {ex.sets} × {ex.reps}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {ex.completedSets.length}/{ex.sets}
                          </span>
                          <ChevronRight size={14} className="text-muted-foreground" />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Cooldown */}
                {plan.cooldown && (
                  <div className="bg-primary/10 rounded-xl px-4 py-3 border border-primary/20">
                    <p className="text-[10px] font-bold text-primary uppercase mb-0.5">Cooldown</p>
                    <p className="text-xs text-foreground">{plan.cooldown}</p>
                  </div>
                )}

                {/* Regenerate */}
                <button onClick={() => { setPlan(null); setWorkoutStarted(false); setWorkoutTimer(0); }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground font-medium">
                  <RotateCcw size={13} /> Generate New Plan
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom Action Button ────────────────────────────────────────── */}
        {plan && !showChat && (
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-3 bg-gradient-to-t from-background via-background to-transparent safe-bottom">
            {!workoutStarted ? (
              <button onClick={() => setWorkoutStarted(true)}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-elevated active:scale-[0.98] transition-transform">
                <Play size={18} /> Start Workout
              </button>
            ) : progress < 100 ? (
              <div className="flex gap-3">
                <button onClick={() => { setWorkoutStarted(false); setWorkoutTimer(0); }}
                  className="h-14 px-5 rounded-2xl bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-2">
                  <Square size={14} /> Stop
                </button>
                <button onClick={finishWorkout}
                  className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-elevated">
                  <Zap size={16} /> Finish Workout
                </button>
              </div>
            ) : (
              <button onClick={finishWorkout}
                className="w-full h-14 rounded-2xl bg-success text-success-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-elevated">
                <Trophy size={18} /> Complete Workout! 🎉
              </button>
            )}
          </div>
        )}

        {/* ── Exercise Detail Sheet ───────────────────────────────────────── */}
        <AnimatePresence>
          {selectedExercise !== null && plan && (
            <ExerciseDetail
              exercise={plan.exercises[selectedExercise]}
              index={selectedExercise}
              onComplete={completeSet}
              onClose={() => setSelectedExercise(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

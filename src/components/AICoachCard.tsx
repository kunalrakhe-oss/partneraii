import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2, X, ArrowRight, Activity, Salad, Dumbbell, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type CoachMessage = { role: "user" | "assistant"; content: string };
type CoachAction = {
  action: string;
  data: any;
};

const ROUTE_MAP: Record<string, string> = {
  physio: "/physio",
  diet: "/diet",
  workout: "/workout",
  health: "/health",
  budget: "/budget",
  calendar: "/calendar",
  mood: "/mood",
  chat: "/chat",
};

const PLAN_ICON: Record<string, typeof Activity> = {
  physio: Activity,
  diet: Salad,
  workout: Dumbbell,
};

interface AICoachCardProps {
  preferences: { priorities: string[]; morning_routine: string | null; life_goals: string[]; daily_goals: string[] } | null;
  activePlans: { id?: string; plan_type: string; title: string; started_at: string }[];
}

export default function AICoachCard({ preferences, activePlans }: AICoachCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<CoachAction | null>(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("partnerai-coach-dismissed") === "true");
  const inputRef = useRef<HTMLInputElement>(null);

  // Personalized greeting based on goals
  const getGreeting = () => {
    const hour = new Date().getHours();
    const timeGreet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    if (preferences?.life_goals?.length) {
      return `${timeGreet}! How are you feeling today? 💫`;
    }
    return `${timeGreet}! What's on your mind today? ✨`;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    const userMsg: CoachMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setLastAction(null);

    try {
      const planSummary = activePlans.map(p => ({
        id: p.id,
        plan_type: p.plan_type,
        title: p.title,
        started_at: p.started_at,
        day: Math.max(1, Math.floor((Date.now() - new Date(p.started_at).getTime()) / (1000 * 60 * 60 * 24)) + 1),
      }));

      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: {
          message: text,
          history: messages.slice(-6), // last 6 messages for context
          preferences: preferences ? {
            priorities: preferences.priorities,
            life_goals: preferences.life_goals,
            morning_routine: preferences.morning_routine,
          } : undefined,
          activePlans: planSummary.length ? planSummary : undefined,
          language: localStorage.getItem("lovelist-language") || "en",
        },
      });

      if (error) throw error;

      const action = data as CoachAction;
      setLastAction(action);

      if (action.action === "chat_response") {
        const msg = action.data.message;
        const followUp = action.data.follow_up_question;
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: followUp ? `${msg}\n\n${followUp}` : msg },
        ]);
      } else if (action.action === "navigate_to") {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `Let me take you there! 🚀` },
        ]);
        setTimeout(() => {
          const route = ROUTE_MAP[action.data.page] || "/";
          navigate(action.data.context ? `${route}?context=${encodeURIComponent(action.data.context)}` : route);
        }, 800);
      } else if (action.action === "create_plan") {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `I've created your "${action.data.title}" plan! It's been added to your home screen. Tap below to get started. 🎯` },
        ]);
      } else if (action.action === "modify_plan") {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `Done! I've updated your plan. ${action.data.modifications} ✅` },
        ]);
      }
    } catch (err: any) {
      console.error("Coach error:", err);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I had trouble processing that. Try again? 🤔" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (dismissed && messages.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
            <Sparkles size={14} className="text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground">AI Coach</p>
        </div>
        {messages.length === 0 && (
          <button
            onClick={() => { sessionStorage.setItem("partnerai-coach-dismissed", "true"); setDismissed(true); }}
            className="w-6 h-6 rounded-full bg-muted/60 flex items-center justify-center"
          >
            <X size={10} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="px-4 pb-2 space-y-2 max-h-[240px] overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground leading-relaxed">{getGreeting()}</p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-3 py-2">
              <Loader2 size={12} className="animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Created plan action */}
      {lastAction?.action === "create_plan" && (
        <div className="px-4 pb-2">
          <button
            onClick={() => {
              const route = lastAction.data.plan_type === "diet" ? "/diet" : "/physio";
              navigate(route);
            }}
            className="w-full flex items-center gap-3 bg-success/10 border border-success/20 rounded-xl px-3 py-2.5"
          >
            {(() => {
              const Icon = PLAN_ICON[lastAction.data.plan_type] || Activity;
              return <Icon size={16} className="text-success shrink-0" />;
            })()}
            <span className="text-xs font-semibold text-foreground flex-1 text-left">{lastAction.data.title}</span>
            <ChevronRight size={14} className="text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Tell me what's on your mind…"
            className="flex-1 h-9 bg-muted rounded-xl px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring border-0"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center disabled:opacity-40"
          >
            <Send size={14} className="text-primary-foreground" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

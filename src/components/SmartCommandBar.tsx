import { useState, useRef } from "react";
import { Sparkles, Send, Loader2, X, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type SmartAction = {
  action: string;
  data: Record<string, string | null>;
};

type Suggestion = {
  emoji: string;
  label: string;
  prompt: string;
};

const ACTION_LABELS: Record<string, { label: string; link: string }> = {
  create_calendar_event: { label: "Calendar event", link: "/calendar" },
  create_chore: { label: "Chore", link: "/chores" },
  create_grocery_item: { label: "List item", link: "/lists" },
  create_memory: { label: "Memory", link: "/memories" },
  create_mood_log: { label: "Mood log", link: "/mood" },
};

export default function SmartCommandBar() {
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-suggestions");
      if (error) throw new Error(error.message);
      if (data?.suggestions) setSuggestions(data.suggestions);
    } catch (err: any) {
      toast.error("Couldn't load suggestions", { description: err.message });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleExpand = () => {
    setExpanded(true);
    setShowInput(false);
    setSuggestions([]);
    fetchSuggestions();
  };

  const handleClose = () => {
    setExpanded(false);
    setShowInput(false);
    setInput("");
    setSuggestions([]);
  };

  const executePrompt = async (prompt: string) => {
    if (loading || !user || !partnerPair) return;
    setLoading(true);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("smart-create", {
        body: { prompt },
      });

      if (fnError) throw new Error(fnError.message);
      if (fnData?.error) throw new Error(fnData.error);

      const { action, data } = fnData as SmartAction;
      await insertItem(action, data);

      const meta = ACTION_LABELS[action] || { label: "Item", link: "/" };
      toast.success(`${meta.label} created!`, {
        description: data.title || data.name || data.mood || "Done",
        action: {
          label: "View",
          onClick: () => navigate(meta.link),
        },
      });

      handleClose();
    } catch (err: any) {
      toast.error("Couldn't create that", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    executePrompt(input.trim());
  };

  const insertItem = async (action: string, data: Record<string, string | null>) => {
    if (!user || !partnerPair) return;
    const base = { user_id: user.id, partner_pair: partnerPair };

    switch (action) {
      case "create_calendar_event":
        await supabase.from("calendar_events").insert({
          ...base,
          title: data.title!,
          event_date: data.event_date!,
          event_time: data.event_time || null,
          category: data.category || "other",
          description: data.description || null,
          reminder: data.reminder || "none",
        });
        break;
      case "create_chore":
        await supabase.from("chores").insert({
          ...base,
          title: data.title!,
          due_date: data.due_date || null,
          recurrence: data.recurrence || null,
        });
        break;
      case "create_grocery_item":
        await supabase.from("grocery_items").insert({
          ...base,
          name: data.name!,
          list_type: data.list_type || "grocery",
          category: data.category || "other",
          notes: data.notes || null,
          priority: data.priority || "none",
        });
        break;
      case "create_memory":
        await supabase.from("memories").insert({
          ...base,
          title: data.title!,
          description: data.description || null,
          type: data.type!,
          memory_date: data.memory_date || new Date().toISOString().split("T")[0],
        });
        break;
      case "create_mood_log":
        await supabase.from("mood_logs").insert({
          ...base,
          mood: data.mood!,
          note: data.note || null,
        });
        break;
      default:
        throw new Error("Unknown action: " + action);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+4px)] left-3 right-3 z-50">
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="rounded-2xl bg-card/95 backdrop-blur-lg border border-border/60 shadow-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                <span className="text-xs font-bold text-foreground tracking-wide">Quick Add</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchSuggestions}
                  disabled={loadingSuggestions}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw size={14} className={loadingSuggestions ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={handleClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Suggestions */}
            <div className="px-3 pb-2">
              {loadingSuggestions && suggestions.length === 0 ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 size={16} className="text-primary animate-spin" />
                  <span className="text-xs text-muted-foreground">Thinking of suggestions...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {suggestions.map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => executePrompt(s.prompt)}
                      disabled={loading}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/60 hover:bg-muted text-left transition-colors active:scale-[0.97] disabled:opacity-50"
                    >
                      <span className="text-base shrink-0">{s.emoji}</span>
                      <span className="text-xs font-medium text-foreground leading-tight line-clamp-2">{s.label}</span>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom input toggle & field */}
            <div className="px-3 pb-3">
              {showInput ? (
                <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="Type your own..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    autoFocus
                    disabled={loading}
                  />
                  {loading ? (
                    <Loader2 size={16} className="text-primary animate-spin" />
                  ) : input.trim() ? (
                    <button onClick={handleSubmit} className="text-primary hover:text-primary/80">
                      <Send size={16} />
                    </button>
                  ) : null}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setShowInput(true);
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}
                  className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground py-1.5 transition-colors"
                >
                  Or type something custom...
                </button>
              )}
            </div>

            {/* Loading overlay for executing */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-card/80 backdrop-blur-sm flex items-center justify-center rounded-2xl"
                >
                  <div className="flex items-center gap-2">
                    <Loader2 size={18} className="text-primary animate-spin" />
                    <span className="text-sm font-medium text-foreground">Creating...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.button
            key="fab"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={handleExpand}
            className="mr-auto flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2.5 shadow-lg text-sm font-medium active:scale-95 transition-transform"
          >
            <Sparkles size={16} />
            <span>Quick Add</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

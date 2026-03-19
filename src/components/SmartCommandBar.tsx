import { useState, useRef } from "react";
import { Sparkles, Send, Loader2, Check, X } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!input.trim() || loading || !user || !partnerPair) return;
    setLoading(true);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("smart-create", {
        body: { prompt: input.trim() },
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

      setInput("");
      setExpanded(false);
    } catch (err: any) {
      toast.error("Couldn't create that", { description: err.message });
    } finally {
      setLoading(false);
    }
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
      <AnimatePresence>
        {expanded ? (
          <motion.div
            key="bar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 rounded-2xl bg-card/95 backdrop-blur-lg border border-border/60 shadow-lg px-3 py-2"
          >
            <Sparkles size={18} className="text-primary shrink-0" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Add a chore, reminder, memory..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              autoFocus
              disabled={loading}
            />
            {loading ? (
              <Loader2 size={18} className="text-primary animate-spin" />
            ) : input.trim() ? (
              <button onClick={handleSubmit} className="text-primary hover:text-primary/80">
                <Send size={18} />
              </button>
            ) : (
              <button onClick={() => setExpanded(false)} className="text-muted-foreground">
                <X size={18} />
              </button>
            )}
          </motion.div>
        ) : (
          <motion.button
            key="fab"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => {
              setExpanded(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2.5 shadow-lg text-sm font-medium active:scale-95 transition-transform"
          >
            <Sparkles size={16} />
            <span>Quick Add</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

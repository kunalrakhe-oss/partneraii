import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { format, subDays } from "date-fns";
import { Heart, Sparkles, Lightbulb, Users, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const MOODS = [
  { key: "happy", emoji: "😊", label: "Happy" },
  { key: "tired", emoji: "😵‍💫", label: "Tired" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "angry", emoji: "😫", label: "Stressed" },
  { key: "neutral", emoji: "🥰", label: "Loved" },
] as const;

interface MoodLog {
  id: string;
  user_id: string;
  partner_pair: string;
  mood: string;
  note: string | null;
  log_date: string;
  created_at: string;
}

export default function MoodPage() {
  const { user } = useAuth();
  const { partnerPair, loading: ppLoading } = usePartnerPair();
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [note, setNote] = useState("");
  const [displayName, setDisplayName] = useState("there");

  const today = format(new Date(), "yyyy-MM-dd");
  const todayLog = logs.find(l => l.log_date === today && l.user_id === user?.id);
  const partnerLog = logs.find(l => l.log_date === today && l.user_id !== user?.id);

  useEffect(() => {
    if (!partnerPair) return;
    supabase.from("mood_logs").select("*").eq("partner_pair", partnerPair)
      .then(({ data }) => { if (data) setLogs(data); });
  }, [partnerPair]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        const name = data?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "there";
        setDisplayName(name.split(" ")[0]);
      });
  }, [user]);

  const logMood = async (mood: string) => {
    if (!user || !partnerPair) return;
    if (todayLog) {
      // Update existing
      const { data, error } = await supabase.from("mood_logs").update({ mood, note: note || null }).eq("id", todayLog.id).select().single();
      if (error) { toast.error("Failed to update mood"); return; }
      setLogs(prev => prev.map(l => l.id === todayLog.id ? data : l));
    } else {
      const { data, error } = await supabase.from("mood_logs").insert({
        user_id: user.id, partner_pair: partnerPair, mood, note: note || null, log_date: today,
      }).select().single();
      if (error) { toast.error("Failed to log mood"); return; }
      setLogs(prev => [...prev, data]);
    }
  };

  const updateNote = async () => {
    if (!todayLog) return;
    const { data, error } = await supabase.from("mood_logs").update({ note: note || null }).eq("id", todayLog.id).select().single();
    if (error) { toast.error("Failed to update note"); return; }
    setLogs(prev => prev.map(l => l.id === todayLog.id ? data : l));
    toast.success("Mood updated!");
  };

  // Last 7 days for chart
  const moodToHeight: Record<string, number> = { happy: 90, neutral: 75, tired: 50, sad: 35, angry: 25 };
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    return {
      day: format(subDays(new Date(), 6 - i), "EEEEE"),
      me: logs.find(l => l.log_date === date && l.user_id === user?.id),
    };
  });

  if (ppLoading) return <PageTransition><div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div></PageTransition>;

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">How are you, {displayName}?</h1>
            <p className="text-sm text-muted-foreground">Share your vibe with your partner</p>
          </div>
          <button className="w-10 h-10 rounded-btn bg-secondary/20 flex items-center justify-center">
            <Heart size={18} className="text-secondary" fill="currentColor" />
          </button>
        </div>

        <p className="text-sm font-bold text-foreground text-center mb-4">Current Mood</p>
        <div className="flex justify-center gap-3 mb-6 flex-wrap">
          {MOODS.map(mood => (
            <motion.button key={mood.key} whileTap={{ scale: 0.9 }} onClick={() => logMood(mood.key)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all min-w-[60px] ${todayLog?.mood === mood.key ? "bg-primary/25 shadow-soft ring-2 ring-primary/40" : "hover:bg-muted"}`}>
              <span className="text-3xl">{mood.emoji}</span>
              <span className="text-[10px] font-medium text-muted-foreground">{mood.label}</span>
            </motion.button>
          ))}
        </div>

        <p className="text-sm font-semibold text-foreground mb-2">Add a note (optional)</p>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What's on your mind?" rows={3}
          className="w-full px-4 py-3 rounded-2xl bg-card shadow-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none border border-border mb-4" />
        <button onClick={updateNote} className="w-full h-12 rounded-btn love-gradient text-primary-foreground font-semibold text-sm shadow-soft mb-6">Update My Mood</button>

        {/* Partner's Status */}
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-foreground" />
          <p className="text-sm font-bold text-foreground">Partner's Status</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-6 flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center"><span className="text-sm font-bold text-muted-foreground">P</span></div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              Partner is feeling {partnerLog ? partnerLog.mood.charAt(0).toUpperCase() + partnerLog.mood.slice(1) : "—"}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{partnerLog?.note || "No mood logged yet today"}</p>
          </div>
        </div>

        {/* Weekly Harmony */}
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-foreground">Weekly Harmony</p>
            <Sparkles size={16} className="text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mb-4">Your mood over the last 7 days</p>
          <div className="flex items-end justify-between h-24 gap-1 px-1">
            {last7.map((day, i) => {
              const h = day.me ? moodToHeight[day.me.mood] || 50 : 30;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-lg bg-primary/30 transition-all" style={{ height: `${h}%` }} />
                  <span className="text-[10px] text-muted-foreground">{day.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        <AiMoodTip
          myMood={todayLog?.mood || null}
          partnerMood={partnerLog?.mood || null}
          weekHistory={last7.map(d => d.me?.mood || "none").join(", ")}
        />
      </div>
    </PageTransition>
  );
}
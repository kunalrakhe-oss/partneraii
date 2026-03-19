import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { format } from "date-fns";
import { Heart, Lightbulb, Users, RefreshCw, Loader2, X, Send, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useAuth } from "@/contexts/AuthContext";
import { useAppMode } from "@/hooks/useAppMode";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const MOODS = [
  { key: "happy", emoji: "😊", label: "Happy" },
  { key: "excited", emoji: "🤩", label: "Excited" },
  { key: "neutral", emoji: "🥰", label: "Loved" },
  { key: "calm", emoji: "😌", label: "Calm" },
  { key: "grateful", emoji: "🙏", label: "Grateful" },
  { key: "silly", emoji: "🤪", label: "Silly" },
  { key: "tired", emoji: "😵‍💫", label: "Tired" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "stressed", emoji: "😫", label: "Stressed" },
  { key: "anxious", emoji: "😰", label: "Anxious" },
  { key: "angry", emoji: "😠", label: "Angry" },
  { key: "furious", emoji: "🤬", label: "Furious" },
  { key: "lonely", emoji: "🥺", label: "Lonely" },
  { key: "hopeful", emoji: "🌟", label: "Hopeful" },
  { key: "confused", emoji: "😕", label: "Confused" },
] as const;

const MOOD_GROUPS = [
  {
    label: "Positive",
    moods: MOODS.filter(m => ["happy", "excited", "neutral", "calm", "grateful", "hopeful", "silly"].includes(m.key)),
  },
  {
    label: "Tough",
    moods: MOODS.filter(m => ["tired", "sad", "stressed", "anxious", "lonely", "confused"].includes(m.key)),
  },
  {
    label: "Intense",
    moods: MOODS.filter(m => ["angry", "furious"].includes(m.key)),
  },
];
const MOOD_EMOJI_MAP: Record<string, string> = Object.fromEntries(MOODS.map(m => [m.key, m.emoji]));


interface MoodLog {
  id: string;
  user_id: string;
  partner_pair: string;
  mood: string;
  note: string | null;
  log_date: string;
  created_at: string;
}

function AiMoodTip({ myMood, partnerMood, weekHistory }: { myMood: string | null; partnerMood: string | null; weekHistory: string }) {
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTip = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mood-tip", {
        body: { myMood, partnerMood, weekHistory, language: localStorage.getItem("lovelist-language") || "en" },
      });
      if (error) throw error;
      if (data?.tip) setTip(data.tip);
    } catch {
      setTip("Check in with your partner's mood daily to stay connected! 💕");
    } finally {
      setLoading(false);
    }
  }, [myMood, partnerMood, weekHistory]);

  useEffect(() => { fetchTip(); }, []);

  return (
    <div className="love-gradient-soft border border-border rounded-2xl p-4 flex items-start gap-3">
      <Lightbulb size={16} className="text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-primary font-medium text-xs">AI Tip</span>
          <button onClick={fetchTip} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        {loading && !tip ? (
          <div className="flex items-center gap-2 py-1">
            <Loader2 size={12} className="animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Generating tip…</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">{tip || "Loading…"}</p>
        )}
      </div>
    </div>
  );
}

function GatedAiMoodTip(props: { myMood: string | null; partnerMood: string | null; weekHistory: string }) {
  const { canAccess } = useSubscriptionContext();
  const navigate = useNavigate();

  if (!canAccess("mood-ai-tips")) {
    return (
      <div className="border border-border rounded-2xl p-4 flex items-start gap-3 bg-muted/50">
        <Lock size={16} className="text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-muted-foreground">AI Mood Tips</span>
          <p className="text-xs text-muted-foreground mt-0.5">Upgrade to Pro for personalized mood tips.</p>
          <button onClick={() => navigate("/upgrade")} className="text-xs font-semibold text-primary mt-1.5">Upgrade →</button>
        </div>
      </div>
    );
  }

  return <AiMoodTip {...props} />;
}

export default function MoodPage() {
  const { user } = useAuth();
  const { partnerPair, loading: ppLoading } = usePartnerPair();
  const { isSingle } = useAppMode();
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [note, setNote] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [displayName, setDisplayName] = useState("there");
  const [reactionMessage, setReactionMessage] = useState("");
  const [moodReaction, setMoodReaction] = useState("");
  const [sendingReaction, setSendingReaction] = useState(false);
  const [partnerName, setPartnerName] = useState("Partner");


  const dragY = useMotionValue(0);
  const sheetOpacity = useTransform(dragY, [0, 300], [1, 0.3]);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayLog = logs.find(l => l.log_date === today && l.user_id === user?.id);
  const partnerLog = logs.find(l => l.log_date === today && l.user_id !== user?.id);

  useEffect(() => {
    if (!partnerPair) return;
    supabase.from("mood_logs").select("*").eq("partner_pair", partnerPair)
      .then(({ data }) => { if (data) setLogs(data); });

    const channel = supabase.channel("mood-realtime-" + partnerPair)
      .on("postgres_changes", { event: "*", schema: "public", table: "mood_logs", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLogs(prev => [...prev.filter(l => l.id !== (payload.new as MoodLog).id), payload.new as MoodLog]);
          } else if (payload.eventType === "UPDATE") {
            setLogs(prev => prev.map(l => l.id === (payload.new as MoodLog).id ? payload.new as MoodLog : l));
          } else if (payload.eventType === "DELETE") {
            setLogs(prev => prev.filter(l => l.id !== (payload.old as any).id));
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [partnerPair]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        const name = data?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "there";
        setDisplayName(name.split(" ")[0]);
      });
    // Fetch partner name
    supabase.from("profiles").select("display_name, user_id").then(({ data }) => {
      if (data) {
        const partner = data.find(p => p.user_id !== user.id);
        if (partner?.display_name) setPartnerName(partner.display_name.split(" ")[0]);
      }
    });
  }, [user]);

  const logMood = async (mood: string) => {
    if (!user || !partnerPair) return;
    if (todayLog) {
      const { data, error } = await supabase.from("mood_logs").update({ mood, note: note || null }).eq("id", todayLog.id).select().single();
      if (error) { toast.error("Failed to update mood"); return; }
      setLogs(prev => prev.map(l => l.id === todayLog.id ? data : l));
      toast.success("Mood updated!");
      navigate(-1);
    } else {
      const { data, error } = await supabase.from("mood_logs").insert({
        user_id: user.id, partner_pair: partnerPair, mood, note: note || null, log_date: today,
      }).select().single();
      if (error) { toast.error("Failed to log mood"); return; }
      setLogs(prev => [...prev, data]);
      toast.success("Mood logged!");
      navigate(-1);
    }
  };

  const updateNote = async () => {
    if (!todayLog) return;
    const { data, error } = await supabase.from("mood_logs").update({ note: note || null }).eq("id", todayLog.id).select().single();
    if (error) { toast.error("Failed to update note"); return; }
    setLogs(prev => prev.map(l => l.id === todayLog.id ? data : l));
    toast.success("Mood updated!");
  };

  const sendPartnerReaction = async () => {
    if ((!moodReaction && !reactionMessage.trim()) || !user || !partnerPair || !partnerLog) return;
    setSendingReaction(true);
    const moodEmoji = MOOD_EMOJI_MAP[partnerLog.mood] || "😊";
    const parts = [
      moodReaction ? `${moodReaction} Reacted to your mood ${moodEmoji}` : "",
      reactionMessage.trim(),
    ].filter(Boolean);
    await supabase.from("chat_messages").insert({
      user_id: user.id, partner_pair: partnerPair, message: parts.join("\n"), type: "text",
    });
    setSendingReaction(false);
    setMoodReaction("");
    setReactionMessage("");
    toast.success("Reaction sent! 💕");
  };




  if (ppLoading) return <PageTransition><div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div></PageTransition>;

  return (
    <PageTransition>
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        style={{ y: dragY, opacity: sheetOpacity }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120) navigate(-1);
        }}
        className="px-5 pt-4 pb-6 min-h-screen bg-background"
      >
        {/* Swipe indicator */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="sticky top-0 z-20 bg-background pt-2 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("mood.howAreYou")} {displayName}?</h1>
            <p className="text-sm text-muted-foreground">{t("mood.shareVibe")}</p>
          </div>
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Your Check-in Card */}
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{displayName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {todayLog
                  ? `${t("mood.isFeeling")} ${MOOD_EMOJI_MAP[todayLog.mood] || ""} ${todayLog.mood.charAt(0).toUpperCase() + todayLog.mood.slice(1)}`
                  : t("mood.howFeeling")}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{todayLog?.note || t("mood.tapToSelect")}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-2">{t("mood.tapToChange")}</p>
          {MOOD_GROUPS.map((group) => (
            <div key={group.label} className="mb-2 last:mb-0">
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.moods.map(mood => (
                  <motion.button
                    key={mood.key}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => logMood(mood.key)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all ${todayLog?.mood === mood.key ? "scale-110 bg-primary/20 ring-2 ring-primary" : "bg-muted"}`}
                  >
                    {mood.emoji}
                  </motion.button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-2 mt-3">
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder={t("mood.whatsOnMind")}
              className="flex-1 bg-muted rounded-xl px-3 h-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={updateNote}
              disabled={!todayLog}
              className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40">
              <Send size={12} />
              {t("common.save") || "Save"}
            </button>
          </div>
        </div>

        {!isSingle && (
        <>
        {/* Partner's Status with Reaction */}
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-foreground" />
          <p className="text-sm font-bold text-foreground">{partnerName}{t("mood.partnerStatus")}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center"><span className="text-sm font-bold text-muted-foreground">P</span></div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {partnerName} {t("mood.isFeeling")} {partnerLog ? (MOOD_EMOJI_MAP[partnerLog.mood] || "") + " " + partnerLog.mood.charAt(0).toUpperCase() + partnerLog.mood.slice(1) : "—"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{partnerLog?.note || t("mood.noMoodLoggedYet")}</p>
            </div>
          </div>

          {partnerLog && (
            <>
              <p className="text-xs text-muted-foreground mb-2">{t("mood.reactToMood")}</p>
              <div className="flex gap-2 mb-3">
                {["❤️", "🤗", "💪", "😘", "🥺", "🔥"].map(emoji => (
                  <button key={emoji} onClick={() => setMoodReaction(prev => prev === emoji ? "" : emoji)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all ${moodReaction === emoji ? "scale-110 bg-primary/20 ring-2 ring-primary" : "bg-muted"}`}>
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={reactionMessage} onChange={e => setReactionMessage(e.target.value)}
                  placeholder={t("mood.addMessage")}
                  className="flex-1 bg-muted rounded-xl px-3 h-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={sendPartnerReaction}
                  disabled={(!moodReaction && !reactionMessage.trim()) || sendingReaction}
                  className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40">
                  <Send size={12} />
                  {t("common.send")}
                </button>
              </div>
            </>
          )}
        </div>
        </>
        )}



        <GatedAiMoodTip
          myMood={todayLog?.mood || null}
          partnerMood={partnerLog?.mood || null}
          weekHistory={todayLog?.mood || "none"}
        />
      </motion.div>
    </PageTransition>
  );
}

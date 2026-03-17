import { useLocalStorage, generateId, type MoodLog } from "@/lib/store";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useState } from "react";
import { format, subDays } from "date-fns";
import { Heart, Sparkles, Lightbulb, Users } from "lucide-react";

const MOODS = [
  { key: "happy", emoji: "😊", label: "Happy" },
  { key: "tired", emoji: "😵‍💫", label: "Tired" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "angry", emoji: "😫", label: "Stressed" },
  { key: "neutral", emoji: "🥰", label: "Loved" },
] as const;

const MOOD_MAP: Record<string, string> = {
  happy: "😊",
  tired: "😵‍💫",
  sad: "😢",
  angry: "😫",
  neutral: "🥰",
};

export default function MoodPage() {
  const [logs, setLogs] = useLocalStorage<MoodLog[]>("lovelist-moods", []);
  const [note, setNote] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");
  const todayLog = logs.find(l => l.date === today && l.user === "me");
  const partnerLog = logs.find(l => l.date === today && l.user === "partner");

  const logMood = (mood: MoodLog["mood"]) => {
    const filtered = logs.filter(l => !(l.date === today && l.user === "me"));
    setLogs([...filtered, { id: generateId(), mood, note, date: today, user: "me" }]);
  };

  const updateMood = () => {
    if (todayLog) {
      const filtered = logs.filter(l => !(l.date === today && l.user === "me"));
      setLogs([...filtered, { ...todayLog, note }]);
    }
  };

  // Last 7 days mood data for chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    return {
      day: format(subDays(new Date(), 6 - i), "EEEEE"),
      me: logs.find(l => l.date === date && l.user === "me"),
    };
  });

  const moodToHeight: Record<string, number> = { happy: 90, neutral: 75, tired: 50, sad: 35, angry: 25 };

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">How are you, Alex?</h1>
            <p className="text-sm text-muted-foreground">Share your vibe with Jordan</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Heart size={18} className="text-primary" fill="hsl(346, 77%, 60%)" />
          </button>
        </div>

        {/* Current Mood Selection */}
        <p className="text-sm font-bold text-foreground text-center mb-4">Current Mood</p>
        <div className="flex justify-center gap-3 mb-6 flex-wrap">
          {MOODS.map(mood => (
            <motion.button
              key={mood.key}
              whileTap={{ scale: 0.9 }}
              onClick={() => logMood(mood.key as MoodLog["mood"])}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all min-w-[60px] ${
                todayLog?.mood === mood.key
                  ? "bg-[hsl(100,20%,72%)] shadow-soft ring-2 ring-[hsl(100,20%,60%)]"
                  : "hover:bg-muted"
              }`}
            >
              <span className="text-3xl">{mood.emoji}</span>
              <span className="text-[10px] font-medium text-muted-foreground">{mood.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Note input */}
        <p className="text-sm font-semibold text-foreground mb-2">Add a note (optional)</p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What's on your mind? Jordan will see this..."
          rows={3}
          className="w-full px-4 py-3 rounded-2xl bg-card shadow-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none border border-border mb-4"
        />
        <button
          onClick={updateMood}
          className="w-full h-12 rounded-2xl bg-[hsl(100,20%,72%)] text-foreground font-semibold text-sm shadow-soft mb-6"
        >
          Update My Mood
        </button>

        {/* Partner's Status */}
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-foreground" />
          <p className="text-sm font-bold text-foreground">Partner's Status</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-6 flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm font-bold text-muted-foreground">J</span>
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              Jordan is feeling {partnerLog ? partnerLog.mood.charAt(0).toUpperCase() + partnerLog.mood.slice(1) : "Tired"}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              {partnerLog?.note || "Long day at the office, looking forward to our movie night later! 🍿"}
            </p>
            <p className="text-xs text-primary mt-1">Updated 2h ago</p>
          </div>
        </div>

        {/* Weekly Harmony */}
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-foreground">Weekly Harmony</p>
            <Sparkles size={16} className="text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mb-4">You both felt 'Loved' most often this week.</p>
          <div className="flex items-end justify-between h-24 gap-1 px-1">
            {last7.map((day, i) => {
              const h = day.me ? moodToHeight[day.me.mood] || 50 : 30;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-lg bg-[hsl(100,25%,78%)] transition-all"
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{day.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pro-tip */}
        <div className="love-gradient-soft border border-border rounded-2xl p-4 flex items-start gap-3">
          <Lightbulb size={16} className="text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-primary font-medium">Pro-tip:</span> Jordan is feeling tired today. Maybe surprise them by handling the dishes?
          </p>
        </div>
      </div>
    </PageTransition>
  );
}

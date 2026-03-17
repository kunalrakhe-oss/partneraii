import { useLocalStorage, generateId, MOOD_EMOJIS, type MoodLog } from "@/lib/store";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useState } from "react";
import { format, subDays } from "date-fns";

const moods = ["happy", "neutral", "sad", "angry", "tired"] as const;

export default function MoodPage() {
  const [logs, setLogs] = useLocalStorage<MoodLog[]>("lovelist-moods", []);
  const [note, setNote] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");
  const todayLog = logs.find(l => l.date === today && l.user === "me");

  const logMood = (mood: typeof moods[number]) => {
    const filtered = logs.filter(l => !(l.date === today && l.user === "me"));
    setLogs([...filtered, { id: generateId(), mood, note, date: today, user: "me" }]);
    setNote("");
  };

  // Last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    return {
      date,
      day: format(subDays(new Date(), 6 - i), "EEE"),
      me: logs.find(l => l.date === date && l.user === "me"),
      partner: logs.find(l => l.date === date && l.user === "partner"),
    };
  });

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-xl font-bold text-foreground mb-6">Mood Check-in</h1>

        {/* Today's check-in */}
        <div className="love-gradient-soft rounded-2xl p-5 shadow-soft mb-6">
          <p className="text-sm font-medium text-foreground mb-1">How are you feeling today?</p>
          <p className="text-xs text-muted-foreground mb-4">
            {todayLog ? `You're feeling ${todayLog.mood} ${MOOD_EMOJIS[todayLog.mood]}` : "Tap an emoji to log your mood"}
          </p>
          <div className="flex justify-between mb-4">
            {moods.map(mood => (
              <motion.button
                key={mood}
                whileTap={{ scale: 0.9 }}
                onClick={() => logMood(mood)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                  todayLog?.mood === mood ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"
                }`}
              >
                <span className="text-2xl">{MOOD_EMOJIS[mood]}</span>
                <span className="text-[10px] font-medium text-muted-foreground capitalize">{mood}</span>
              </motion.button>
            ))}
          </div>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            className="w-full h-10 px-3 rounded-lg bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Weekly overview */}
        <h2 className="text-sm font-semibold text-foreground mb-3">This Week</h2>
        <div className="grid grid-cols-7 gap-2">
          {last7.map(day => (
            <div key={day.date} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{day.day}</span>
              <div className="text-lg">{day.me ? MOOD_EMOJIS[day.me.mood] : "·"}</div>
              <div className="text-sm">{day.partner ? MOOD_EMOJIS[day.partner.mood] : ""}</div>
            </div>
          ))}
        </div>

        {/* Recent logs */}
        <h2 className="text-sm font-semibold text-foreground mt-6 mb-3">Recent Logs</h2>
        <div className="space-y-2">
          {logs.filter(l => l.user === "me").slice(-5).reverse().map(log => (
            <div key={log.id} className="bg-card rounded-xl px-4 py-3 shadow-card flex items-center gap-3">
              <span className="text-xl">{MOOD_EMOJIS[log.mood]}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground capitalize">{log.mood}</p>
                {log.note && <p className="text-xs text-muted-foreground">{log.note}</p>}
              </div>
              <span className="text-xs text-muted-foreground">{log.date}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No mood logs yet</p>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

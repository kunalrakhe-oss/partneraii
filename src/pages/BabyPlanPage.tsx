import { useState, useEffect, useRef, useCallback } from "react";
import { Baby, CalendarDays, Plus, Send, Loader2, Trash2, Sparkles, ArrowLeft, MessageCircle, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageTransition from "@/components/PageTransition";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type PeriodLog = {
  id: string;
  period_start: string;
  period_end: string | null;
  cycle_length: number;
  period_duration: number;
  symptoms: string[] | null;
  notes: string | null;
  created_at: string;
};

type Msg = { role: "user" | "assistant"; content: string };

const SYMPTOMS = ["Cramps", "Headache", "Bloating", "Fatigue", "Mood swings", "Back pain", "Nausea", "Breast tenderness"];

function FertilityCalendar({ logs }: { logs: PeriodLog[] }) {
  if (logs.length === 0) return null;

  const latest = logs[0];
  const cycleLen = latest.cycle_length || 28;
  const periodStart = parseISO(latest.period_start);
  const ovulationDay = addDays(periodStart, cycleLen - 14);
  const fertileStart = addDays(ovulationDay, -5);
  const fertileEnd = addDays(ovulationDay, 1);
  const nextPeriod = addDays(periodStart, cycleLen);
  const today = new Date();
  const daysUntilOvulation = differenceInDays(ovulationDay, today);
  const daysUntilPeriod = differenceInDays(nextPeriod, today);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 love-gradient-soft">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays size={18} className="text-primary" />
          Fertility Window
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/10 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Ovulation</p>
            <p className="text-lg font-bold text-primary">{format(ovulationDay, "MMM d")}</p>
            <p className="text-[10px] text-muted-foreground">
              {daysUntilOvulation > 0 ? `${daysUntilOvulation} days away` : daysUntilOvulation === 0 ? "Today!" : "Passed"}
            </p>
          </div>
          <div className="bg-secondary/10 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Next Period</p>
            <p className="text-lg font-bold text-secondary">{format(nextPeriod, "MMM d")}</p>
            <p className="text-[10px] text-muted-foreground">
              {daysUntilPeriod > 0 ? `${daysUntilPeriod} days away` : "Expected today"}
            </p>
          </div>
        </div>
        <div className="bg-success/10 rounded-xl p-3">
          <p className="text-xs font-semibold text-success flex items-center gap-1">
            <Sparkles size={12} /> Best days to try
          </p>
          <p className="text-sm font-bold text-foreground mt-1">
            {format(fertileStart, "MMM d")} – {format(fertileEnd, "MMM d")}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            6-day fertile window around ovulation
          </p>
        </div>
        <div className="text-[10px] text-muted-foreground text-center">
          Based on {cycleLen}-day cycle • Last period: {format(periodStart, "MMM d")}
        </div>
      </CardContent>
    </Card>
  );
}

function LogPeriodForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");
  const [cycleLength, setCycleLength] = useState(28);
  const [duration, setDuration] = useState(5);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleSymptom = (s: string) => {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSave = async () => {
    if (!user || !partnerPair) return;
    setSaving(true);
    const { error } = await supabase.from("period_logs").insert({
      user_id: user.id,
      partner_pair: partnerPair,
      period_start: startDate,
      period_end: endDate || null,
      cycle_length: cycleLength,
      period_duration: duration,
      symptoms: symptoms.length ? symptoms : null,
      notes: notes || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Period logged ✓" });
      onSaved();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Log Period</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-border bg-background" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-border bg-background" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Cycle Length</label>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setCycleLength(Math.max(20, cycleLength - 1))} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold">-</button>
              <span className="text-sm font-bold w-8 text-center">{cycleLength}</span>
              <button onClick={() => setCycleLength(Math.min(45, cycleLength + 1))} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold">+</button>
              <span className="text-[10px] text-muted-foreground">days</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Period Duration</label>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setDuration(Math.max(1, duration - 1))} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold">-</button>
              <span className="text-sm font-bold w-8 text-center">{duration}</span>
              <button onClick={() => setDuration(Math.min(10, duration + 1))} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold">+</button>
              <span className="text-[10px] text-muted-foreground">days</span>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Symptoms</label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {SYMPTOMS.map(s => (
              <button key={s} onClick={() => toggleSymptom(s)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${symptoms.includes(s) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-border bg-background resize-none h-16" />
        </div>
        <Button onClick={handleSave} disabled={saving || !startDate} className="w-full">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Save Period Log
        </Button>
      </CardContent>
    </Card>
  );
}

function AIChatSection({ lang }: { lang: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fertility-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ messages: allMessages, lang }),
        }
      );

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to get response");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast({ title: "AI Error", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl love-gradient flex items-center justify-center">
              <Baby size={28} className="text-primary-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground">Baby Planning AI</p>
            <p className="text-xs text-muted-foreground max-w-[260px]">
              Ask me about fertility windows, ovulation timing, lifestyle tips, or anything about planning your baby journey 💕
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
              {["When is my fertile window?", "Tips to improve fertility", "What foods help conception?"].map(q => (
                <button key={q} onClick={() => { setInput(q); }}
                  className="px-3 py-1.5 rounded-full bg-primary/10 text-[11px] font-medium text-primary">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              m.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            }`}>
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : m.content}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 size={16} className="animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-border px-4 py-3 safe-bottom">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask about fertility, ovulation..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm"
          />
          <Button size="icon" onClick={send} disabled={!input.trim() || loading}>
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BabyPlanPage() {
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"tracker" | "chat">("tracker");
  const [logs, setLogs] = useState<PeriodLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!partnerPair) return;
    setLoading(true);
    const { data } = await supabase
      .from("period_logs")
      .select("*")
      .eq("partner_pair", partnerPair)
      .order("period_start", { ascending: false });
    if (data) setLogs(data as PeriodLog[]);
    setLoading(false);
  }, [partnerPair]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const deleteLog = async (id: string) => {
    await supabase.from("period_logs").delete().eq("id", id);
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  return (
    <PageTransition className="min-h-[100dvh] pb-nav">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 pt-safe">
        <div className="flex items-center justify-between h-12">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground flex items-center gap-1.5">
            <Baby size={18} className="text-primary" /> Baby Planning
          </h1>
          <div className="w-8" />
        </div>
        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-2">
          <button
            onClick={() => setTab("tracker")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
              tab === "tracker" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
            }`}
          >
            <BarChart3 size={14} /> Tracker
          </button>
          <button
            onClick={() => setTab("chat")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
              tab === "chat" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
            }`}
          >
            <MessageCircle size={14} /> AI Chat
          </button>
        </div>
      </div>

      {tab === "tracker" ? (
        <div className="px-4 py-4 space-y-4">
          <FertilityCalendar logs={logs} />

          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <LogPeriodForm onSaved={() => { setShowForm(false); fetchLogs(); }} />
              </motion.div>
            )}
          </AnimatePresence>

          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
              <Plus size={16} /> Log New Period
            </Button>
          )}

          {/* History */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</p>
              {logs.map(log => (
                <div key={log.id} className="flex items-center gap-3 bg-card rounded-2xl p-3 border border-border/50">
                  <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                    <CalendarDays size={16} className="text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {format(parseISO(log.period_start), "MMM d")}
                      {log.period_end ? ` – ${format(parseISO(log.period_end), "MMM d")}` : ""}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {log.cycle_length}-day cycle • {log.period_duration} days
                      {log.symptoms?.length ? ` • ${log.symptoms.join(", ")}` : ""}
                    </p>
                  </div>
                  <button onClick={() => deleteLog(log.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Baby size={40} className="text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No periods logged yet</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Start tracking to see fertility insights</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1" style={{ height: "calc(100dvh - var(--nav-total) - 7.5rem)" }}>
          <AIChatSection lang={lang} />
        </div>
      )}
    </PageTransition>
  );
}

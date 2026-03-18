import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Loader2, FileText, MessageCircle, ClipboardList, ChevronRight, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mens-health-chat`;

// ── Health Assessment Questions ──
const QUESTIONS = [
  { id: "age", label: "What is your age?", type: "select" as const, options: ["18-25", "26-35", "36-45", "46-55", "55+"] },
  { id: "frequency", label: "How often do you experience difficulty?", type: "select" as const, options: ["Rarely", "Sometimes", "Often", "Almost always"] },
  { id: "duration", label: "How long has this been a concern?", type: "select" as const, options: ["Less than 1 month", "1-6 months", "6-12 months", "Over 1 year"] },
  { id: "exercise", label: "How would you describe your current activity level?", type: "select" as const, options: ["Sedentary", "Light (1-2x/week)", "Moderate (3-4x/week)", "Active (5+/week)"] },
  { id: "sleep", label: "How many hours of sleep do you typically get?", type: "select" as const, options: ["Less than 5", "5-6 hours", "7-8 hours", "More than 8"] },
  { id: "stress", label: "How would you rate your stress levels?", type: "select" as const, options: ["Low", "Moderate", "High", "Very High"] },
  { id: "smoking", label: "Do you smoke or use tobacco?", type: "select" as const, options: ["No", "Occasionally", "Regularly", "Former smoker"] },
  { id: "alcohol", label: "How often do you consume alcohol?", type: "select" as const, options: ["Never", "Occasionally", "Moderate (few/week)", "Daily"] },
  { id: "conditions", label: "Do you have any of these conditions?", type: "multi" as const, options: ["Diabetes", "High blood pressure", "Heart disease", "Obesity", "Depression/anxiety", "None"] },
  { id: "goals", label: "What are your primary goals?", type: "multi" as const, options: ["Improve performance", "Build fitness", "Reduce stress", "Better diet", "Better sleep", "Overall wellness"] },
];

async function streamChat(body: Record<string, unknown>, onDelta: (t: string) => void, onDone: () => void, onError: (e: string) => void) {
  const language = localStorage.getItem("lovelist-language") || "en";
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify({ ...body, language }),
  });
  if (!resp.ok) { const d = await resp.json().catch(() => ({})); onError(d.error || `Error ${resp.status}`); return; }
  if (!resp.body) { onError("No response body"); return; }
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
      try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) onDelta(c); }
      catch { buf = line + "\n" + buf; break; }
    }
  }
  onDone();
}

// ── Tabs ──
type Tab = "assess" | "report" | "chat";

export default function MensHealthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("assess");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [multiSelections, setMultiSelections] = useState<string[]>([]);

  // Report
  const [report, setReport] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // Chat
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatLoading, report]);

  const currentQ = QUESTIONS[step];
  const isMulti = currentQ?.type === "multi";

  const selectOption = (opt: string) => {
    if (isMulti) {
      setMultiSelections(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);
    } else {
      const newAnswers = { ...answers, [currentQ.id]: opt };
      setAnswers(newAnswers);
      if (step < QUESTIONS.length - 1) { setStep(step + 1); }
      else { generateReport(newAnswers); }
    }
  };

  const confirmMulti = () => {
    if (multiSelections.length === 0) return;
    const newAnswers = { ...answers, [currentQ.id]: multiSelections };
    setAnswers(newAnswers);
    setMultiSelections([]);
    if (step < QUESTIONS.length - 1) { setStep(step + 1); }
    else { generateReport(newAnswers); }
  };

  const generateReport = async (ans: Record<string, string | string[]>) => {
    setTab("report");
    setReportLoading(true);
    setReport("");
    let soFar = "";
    try {
      await streamChat(
        { type: "generate-report", answers: ans },
        (chunk) => { soFar += chunk; setReport(soFar); },
        () => setReportLoading(false),
        (err) => { setReport(`⚠️ ${err}`); setReportLoading(false); },
      );
    } catch { setReport("⚠️ Something went wrong."); setReportLoading(false); }
  };

  const sendChat = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || chatLoading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    let soFar = "";
    const upsert = (chunk: string) => {
      soFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: soFar } : m);
        return [...prev, { role: "assistant", content: soFar }];
      });
    };
    try {
      await streamChat({ messages: [...messages, userMsg] }, upsert, () => setChatLoading(false), (err) => {
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err}` }]);
        setChatLoading(false);
      });
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Something went wrong." }]); setChatLoading(false); }
  };

  const resetAssessment = () => { setStep(0); setAnswers({}); setMultiSelections([]); setReport(""); setTab("assess"); };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "assess", label: "Assessment", icon: <ClipboardList size={16} /> },
    { id: "report", label: "Report", icon: <FileText size={16} /> },
    { id: "chat", label: "Ask AI", icon: <MessageCircle size={16} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Shield size={18} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">Men's Wellness</h1>
            <p className="text-[11px] text-muted-foreground">Private & Confidential</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          {/* ── ASSESSMENT TAB ── */}
          {tab === "assess" && (
            <motion.div key="assess" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="px-4 py-4">
              {step < QUESTIONS.length ? (
                <div>
                  {/* Progress */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{step + 1}/{QUESTIONS.length}</span>
                  </div>

                  <p className="text-sm font-semibold text-foreground mb-4">{currentQ.label}</p>

                  <div className="space-y-2">
                    {currentQ.options.map(opt => {
                      const selected = isMulti ? multiSelections.includes(opt) : answers[currentQ.id] === opt;
                      return (
                        <button key={opt} onClick={() => selectOption(opt)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                            selected ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400" : "bg-card border-border text-foreground hover:border-blue-300"
                          }`}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {isMulti && (
                    <button onClick={confirmMulti} disabled={multiSelections.length === 0}
                      className="mt-4 w-full bg-blue-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                      Continue <ChevronRight size={16} />
                    </button>
                  )}

                  {step > 0 && (
                    <button onClick={() => setStep(step - 1)} className="mt-3 text-xs text-muted-foreground hover:text-foreground">← Back</button>
                  )}

                  {/* Privacy notice */}
                  <div className="mt-6 p-3 bg-muted/50 rounded-xl">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">🔒 Your answers are private and never stored. They're only used to generate your personalized report in this session.</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="animate-spin mx-auto text-blue-500 mb-3" size={32} />
                  <p className="text-sm text-muted-foreground">Generating your wellness report...</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── REPORT TAB ── */}
          {tab === "report" && (
            <motion.div key="report" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="px-4 py-4">
              {!report && !reportLoading ? (
                <div className="text-center py-12">
                  <FileText size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Complete the health assessment first to get your personalized wellness report.</p>
                  <button onClick={() => setTab("assess")} className="bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-semibold">Start Assessment</button>
                </div>
              ) : (
                <div>
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_p]:text-sm [&_li]:text-sm leading-relaxed">
                    <ReactMarkdown>{report}</ReactMarkdown>
                  </div>
                  {reportLoading && <Loader2 className="animate-spin text-blue-500 mt-4" size={20} />}
                  {!reportLoading && report && (
                    <div className="mt-6 flex gap-2">
                      <button onClick={resetAssessment} className="flex-1 bg-muted text-foreground rounded-xl py-2.5 text-sm font-medium">Retake Assessment</button>
                      <button onClick={() => setTab("chat")} className="flex-1 bg-blue-500 text-white rounded-xl py-2.5 text-sm font-semibold">Ask Follow-up</button>
                    </div>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </motion.div>
          )}

          {/* ── CHAT TAB ── */}
          {tab === "chat" && (
            <motion.div key="chat" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-full bg-blue-500/10 mx-auto flex items-center justify-center mb-3">
                      <Shield size={24} className="text-blue-500" />
                    </div>
                    <p className="text-sm font-bold text-foreground mb-1">Private Health Chat 🔒</p>
                    <p className="text-xs text-muted-foreground mb-4">Ask any questions about men's wellness, exercises, diet, or lifestyle changes.</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {["🏋️ Kegel exercises guide", "🥗 Foods for better health", "😴 Sleep optimization", "🧘 Stress management tips"].map(s => (
                        <button key={s} onClick={() => sendChat(s.replace(/^[^\s]+ /, ""))}
                          className="text-[11px] px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-500/20 transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      msg.role === "user" ? "bg-blue-500 text-white rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 text-sm leading-relaxed">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : <p className="leading-relaxed">{msg.content}</p>}
                    </div>
                  </div>
                ))}
                {chatLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat input (only in chat tab) */}
      {tab === "chat" && (
        <div className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
              placeholder="Ask about men's wellness..."
              className="flex-1 bg-muted rounded-full px-4 h-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={() => sendChat()} disabled={!input.trim() || chatLoading}
              className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center disabled:opacity-40 shrink-0">
              {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Loader2, FileText, MessageCircle, ClipboardList, ChevronRight, Heart, AlertTriangle, Save, CalendarCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import PlanPhaseSection from "@/components/PlanPhaseSection";
import RecoveryTracker from "@/components/RecoveryTracker";
import { type Exercise } from "@/components/RecoveryPlanCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/postpartum-chat`;
const IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-exercise-image`;

const QUESTIONS = [
  { id: "delivery", label: "How did you deliver?", type: "select" as const, options: ["Vaginal delivery", "C-section", "Assisted delivery (forceps/vacuum)", "Prefer not to say"] },
  { id: "weeks_postpartum", label: "How many weeks postpartum are you?", type: "select" as const, options: ["Less than 2 weeks", "2-4 weeks", "4-8 weeks", "8-12 weeks", "3-6 months", "Over 6 months"] },
  { id: "complications", label: "Did you experience any complications?", type: "multi" as const, options: ["Tearing/episiotomy", "Diastasis recti", "Heavy bleeding", "Preeclampsia", "Gestational diabetes", "No complications"] },
  { id: "breastfeeding", label: "Are you currently breastfeeding?", type: "select" as const, options: ["Yes, exclusively", "Combination (breast + formula)", "Formula only", "Planning to breastfeed"] },
  { id: "pain_areas", label: "Where do you experience discomfort?", type: "multi" as const, options: ["Pelvic floor", "Lower back", "Abdominal area", "Perineum", "Breasts", "Incision site (C-section)", "No significant discomfort"] },
  { id: "energy", label: "How would you describe your energy levels?", type: "select" as const, options: ["Very low / exhausted", "Low but managing", "Moderate", "Good energy most days"] },
  { id: "mood", label: "How are you feeling emotionally?", type: "select" as const, options: ["Doing well overall", "Occasional mood swings", "Feeling overwhelmed frequently", "Struggling / feeling very low", "Prefer not to say"] },
  { id: "sleep", label: "How much sleep are you getting per night?", type: "select" as const, options: ["Less than 3 hours", "3-5 hours (broken)", "5-7 hours (broken)", "7+ hours"] },
  { id: "support", label: "What kind of support do you have?", type: "multi" as const, options: ["Partner at home", "Family help", "Postpartum doula", "Friends support", "Limited support", "Professional help (therapist)"] },
  { id: "goals", label: "What are your recovery priorities?", type: "multi" as const, options: ["Physical healing", "Core & pelvic floor recovery", "Mental wellness", "Better sleep", "Breastfeeding help", "Return to exercise", "Weight management", "Self-care time"] },
];

type PostpartumPlan = {
  summary: string;
  timeline: Array<{
    week: string;
    title: string;
    icon: string;
    exercises: Exercise[];
    nutritionTips: Array<{ tip: string; icon: string }>;
    mentalHealth: { tip: string; icon: string };
  }>;
  redFlags: string[];
};

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

type Tab = "assess" | "plan" | "chat" | "myplan";

export default function PostpartumPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const [tab, setTab] = useState<Tab>("assess");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [multiSelections, setMultiSelections] = useState<string[]>([]);

  const [plan, setPlan] = useState<PostpartumPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  const [hasSavedPlan, setHasSavedPlan] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatLoading, plan]);

  // Check for existing saved plan on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("recovery_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan_type", "postpartum")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHasSavedPlan(true);
          setTab("myplan");
        }
      });
  }, [user]);

  const savePlan = async () => {
    if (!plan || !user || !partnerPair || savingPlan) return;
    setSavingPlan(true);
    const title = plan.summary?.slice(0, 60) || "Postpartum Recovery Plan";
    const { error } = await supabase.from("recovery_plans").insert({
      user_id: user.id,
      partner_pair: partnerPair,
      plan_type: "postpartum",
      title,
      assessment_answers: answers,
      plan_data: plan,
    });
    if (error) {
      toast.error("Failed to save plan");
    } else {
      toast.success("Plan saved! Track your progress daily.");
      setHasSavedPlan(true);
      setTab("myplan");
    }
    setSavingPlan(false);
  };

  const currentQ = QUESTIONS[step];
  const isMulti = currentQ?.type === "multi";

  const selectOption = (opt: string) => {
    if (isMulti) {
      setMultiSelections(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);
    } else {
      const newAnswers = { ...answers, [currentQ.id]: opt };
      setAnswers(newAnswers);
      if (step < QUESTIONS.length - 1) setStep(step + 1);
      else generatePlan(newAnswers);
    }
  };

  const confirmMulti = () => {
    if (multiSelections.length === 0) return;
    const newAnswers = { ...answers, [currentQ.id]: multiSelections };
    setAnswers(newAnswers);
    setMultiSelections([]);
    if (step < QUESTIONS.length - 1) setStep(step + 1);
    else generatePlan(newAnswers);
  };

  const generatePlan = async (ans: Record<string, string | string[]>) => {
    setTab("plan");
    setPlanLoading(true);
    setPlan(null);
    setPlanError("");
    const language = localStorage.getItem("lovelist-language") || "en";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ type: "generate-plan", answers: ans, language }),
      });
      if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.error || `Error ${resp.status}`); }
      const data = await resp.json();
      setPlan(data.plan);
    } catch (e: any) { setPlanError(e.message || "Something went wrong"); }
    setPlanLoading(false);
  };

  const generateImage = async (exercise: Exercise): Promise<string | null> => {
    try {
      const resp = await fetch(IMAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ exerciseName: exercise.name, exerciseDescription: exercise.imagePrompt || exercise.description }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.imageUrl || null;
    } catch { return null; }
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

  const resetAssessment = () => { setStep(0); setAnswers({}); setMultiSelections([]); setPlan(null); setPlanError(""); setTab("assess"); };

  const accentBg = "bg-pink-500/10";
  const accentSolid = "bg-pink-500";
  const accentClass = "text-pink-500";
  const accentBorder = "border-pink-500";
  const accentText = "text-pink-600 dark:text-pink-400";
  const accentHover = "hover:bg-pink-500/20";

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "assess", label: "Assessment", icon: <ClipboardList size={16} /> },
    { id: "plan", label: "Recovery Plan", icon: <FileText size={16} /> },
    ...(hasSavedPlan ? [{ id: "myplan" as Tab, label: "My Plan", icon: <CalendarCheck size={16} /> }] : []),
    { id: "chat", label: "Ask AI", icon: <MessageCircle size={16} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 z-20 bg-background flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${accentBg} flex items-center justify-center`}>
            <Heart size={18} className={accentClass} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">Postpartum Care</h1>
            <p className="text-[11px] text-muted-foreground">AI Recovery & Wellness</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 px-4 py-2 shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          {tab === "assess" && (
            <motion.div key="assess" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="px-4 py-4">
              {step < QUESTIONS.length ? (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${accentSolid} rounded-full transition-all`} style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
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
                            selected ? `${accentBg} ${accentBorder} ${accentText}` : "bg-card border-border text-foreground hover:border-pink-300"
                          }`}>{opt}</button>
                      );
                    })}
                  </div>
                  {isMulti && (
                    <button onClick={confirmMulti} disabled={multiSelections.length === 0}
                      className={`mt-4 w-full ${accentSolid} text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2`}>
                      Continue <ChevronRight size={16} />
                    </button>
                  )}
                  {step > 0 && <button onClick={() => setStep(step - 1)} className="mt-3 text-xs text-muted-foreground hover:text-foreground">← Back</button>}
                  <div className="mt-6 p-3 bg-muted/50 rounded-xl">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">🌸 Your answers are private. This is not a substitute for medical advice.</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className={`animate-spin mx-auto ${accentClass} mb-3`} size={32} />
                  <p className="text-sm text-muted-foreground">Creating your recovery plan...</p>
                </div>
              )}
            </motion.div>
          )}

          {tab === "plan" && (
            <motion.div key="plan" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="px-4 py-4">
              {planLoading ? (
                <div className="text-center py-12">
                  <Loader2 className={`animate-spin mx-auto ${accentClass} mb-3`} size={32} />
                  <p className="text-sm text-muted-foreground">Creating your personalized postpartum plan...</p>
                </div>
              ) : planError ? (
                <div className="text-center py-12">
                  <p className="text-sm text-destructive mb-4">⚠️ {planError}</p>
                  <button onClick={resetAssessment} className={`${accentSolid} text-white px-5 py-2 rounded-xl text-sm font-semibold`}>Retry</button>
                </div>
              ) : !plan ? (
                <div className="text-center py-12">
                  <FileText size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Complete the assessment to get your personalized recovery plan.</p>
                  <button onClick={() => setTab("assess")} className={`${accentSolid} text-white px-5 py-2 rounded-xl text-sm font-semibold`}>Start Assessment</button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="bg-pink-500/5 border border-pink-500/20 rounded-2xl p-4">
                    <p className="text-xs font-bold text-pink-600 dark:text-pink-400 mb-1">🌸 Recovery Summary</p>
                    <p className="text-sm text-foreground leading-relaxed">{plan.summary}</p>
                  </div>

                  {/* Timeline phases */}
                  {plan.timeline.map((phase, i) => (
                    <PlanPhaseSection
                      key={i}
                      title={phase.title}
                      icon={phase.icon}
                      duration={phase.week}
                      exercises={phase.exercises}
                      accentColor="pink"
                      onGenerateImage={generateImage}
                      extraContent={
                        <div className="space-y-2 ml-1">
                          {/* Nutrition tips */}
                          {phase.nutritionTips && phase.nutritionTips.length > 0 && (
                            <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-3 space-y-1">
                              <p className="text-[11px] font-bold text-green-600 dark:text-green-400">🍽️ Nutrition</p>
                              {phase.nutritionTips.map((nt, j) => (
                                <p key={j} className="text-[11px] text-foreground leading-relaxed">{nt.icon} {nt.tip}</p>
                              ))}
                            </div>
                          )}
                          {/* Mental health */}
                          {phase.mentalHealth && (
                            <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-3">
                              <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400">💜 Mental Wellness</p>
                              <p className="text-[11px] text-foreground leading-relaxed mt-0.5">{phase.mentalHealth.icon} {phase.mentalHealth.tip}</p>
                            </div>
                          )}
                        </div>
                      }
                    />
                  ))}

                  {/* Red Flags */}
                  {plan.redFlags && plan.redFlags.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-2">
                      <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle size={14} /> When to Call Your Doctor
                      </h3>
                      {plan.redFlags.map((flag, i) => (
                        <p key={i} className="text-xs text-foreground leading-relaxed">⚠️ {flag}</p>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={resetAssessment} className="flex-1 bg-muted text-foreground rounded-xl py-2.5 text-sm font-medium">Retake</button>
                    {!hasSavedPlan && (
                      <button onClick={savePlan} disabled={savingPlan}
                        className={`flex-1 ${accentSolid} text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50`}>
                        {savingPlan ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save & Track
                      </button>
                    )}
                    <button onClick={() => setTab("chat")} className="flex-1 bg-muted text-foreground rounded-xl py-2.5 text-sm font-medium">Ask Follow-up</button>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </motion.div>
          )}

          {/* MY PLAN - Recovery Tracker */}
          {tab === "myplan" && (
            <RecoveryTracker
              planType="postpartum"
              accentColor="pink"
              onAskAI={(ctx) => { sendChat(ctx); setTab("chat"); }}
            />
          )}

          {tab === "chat" && (
            <motion.div key="chat" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className={`w-14 h-14 rounded-full ${accentBg} mx-auto flex items-center justify-center mb-3`}>
                      <Heart size={24} className={accentClass} />
                    </div>
                    <p className="text-sm font-bold text-foreground mb-1">Postpartum Support 🌸</p>
                    <p className="text-xs text-muted-foreground mb-4">Ask about recovery, exercises, nutrition, or emotional wellness.</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {["🧘 Pelvic floor exercises", "🍽️ Postpartum nutrition", "😴 Sleep tips for new moms", "💜 Managing baby blues"].map(s => (
                        <button key={s} onClick={() => sendChat(s.replace(/^[^\s]+ /, ""))}
                          className={`text-[11px] px-3 py-1.5 rounded-full ${accentBg} ${accentText} font-medium ${accentHover} transition-colors`}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      msg.role === "user" ? `${accentSolid} text-white rounded-br-md` : "bg-muted text-foreground rounded-bl-md"
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

      {tab === "chat" && (
        <div className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
              placeholder="Ask about postpartum recovery..."
              className="flex-1 bg-muted rounded-full px-4 h-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={() => sendChat()} disabled={!input.trim() || chatLoading}
              className={`h-10 w-10 rounded-full ${accentSolid} text-white flex items-center justify-center disabled:opacity-40 shrink-0`}>
              {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

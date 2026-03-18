import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Loader2, FileText, MessageCircle, ClipboardList, ChevronRight, Wallet, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { toast } from "sonner";
import { format } from "date-fns";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finance-chat`;

const QUESTIONS = [
  { id: "income", label: "What is your combined monthly household income (approx)?", type: "select" as const, options: ["Under ₹25,000", "₹25,000 - ₹50,000", "₹50,000 - ₹1,00,000", "₹1,00,000 - ₹2,00,000", "Over ₹2,00,000", "Prefer not to say"] },
  { id: "expenses", label: "What are your biggest monthly expenses?", type: "multi" as const, options: ["Rent/mortgage", "Groceries/food", "Transportation", "Utilities", "EMIs/loan payments", "Entertainment", "Healthcare", "Education/childcare"] },
  { id: "savings", label: "How much do you currently save per month?", type: "select" as const, options: ["Nothing yet", "Under 10% of income", "10-20% of income", "20-30% of income", "Over 30%"] },
  { id: "debt", label: "Do you have any outstanding debt?", type: "multi" as const, options: ["Home loan", "Car loan", "Personal loan", "Credit card debt", "Education loan", "No debt"] },
  { id: "emergency_fund", label: "Do you have an emergency fund?", type: "select" as const, options: ["No emergency fund", "Less than 1 month expenses", "1-3 months expenses", "3-6 months expenses", "Over 6 months"] },
  { id: "goals", label: "What are your financial goals?", type: "multi" as const, options: ["Build emergency fund", "Pay off debt", "Save for home", "Save for wedding", "Start investing", "Plan for baby", "Retirement planning", "Travel fund"] },
  { id: "money_style", label: "How do you manage money as a couple?", type: "select" as const, options: ["Fully joint accounts", "Joint + separate accounts", "Completely separate", "Haven't discussed yet"] },
  { id: "challenge", label: "What is your biggest financial challenge?", type: "select" as const, options: ["Not saving enough", "Too much debt", "Overspending", "No financial plan", "Disagreements about money", "Irregular income", "Don't know where money goes"] },
];

const EXPENSE_CATEGORIES = ["🍕 Food", "🏠 Rent", "🚗 Transport", "🛒 Shopping", "💊 Health", "🎬 Entertainment", "📱 Bills", "📚 Education", "💇 Personal", "🎁 Gifts", "📦 Other"];
const INCOME_CATEGORIES = ["💼 Salary", "💰 Freelance", "📈 Investment", "🎁 Gift", "📦 Other"];

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

type Tab = "tracker" | "plan" | "chat";
type BudgetEntry = { id: string; type: string; category: string; amount: number; description: string | null; entry_date: string };

export default function BudgetPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const [tab, setTab] = useState<Tab>("tracker");

  // Tracker
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"expense" | "income">("expense");
  const [addAmount, setAddAmount] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [entriesLoading, setEntriesLoading] = useState(true);

  // Assessment
  const [assessStep, setAssessStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [multiSelections, setMultiSelections] = useState<string[]>([]);
  const [showAssess, setShowAssess] = useState(false);

  // Plan
  const [plan, setPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);

  // Chat
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatLoading, plan]);

  // Load entries
  useEffect(() => {
    if (!user || !partnerPair) return;
    const load = async () => {
      const { data } = await supabase
        .from("budget_entries")
        .select("id, type, category, amount, description, entry_date")
        .eq("partner_pair", partnerPair)
        .order("entry_date", { ascending: false })
        .limit(100);
      if (data) setEntries(data);
      setEntriesLoading(false);
    };
    load();
  }, [user, partnerPair]);

  const totalIncome = entries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpense;

  const addEntry = async () => {
    if (!addAmount || !addCategory || !user || !partnerPair) return;
    const { data, error } = await supabase
      .from("budget_entries")
      .insert({ user_id: user.id, partner_pair: partnerPair, type: addType, category: addCategory, amount: parseFloat(addAmount), description: addDesc || null })
      .select("id, type, category, amount, description, entry_date")
      .single();
    if (error) { toast.error("Failed to add"); return; }
    setEntries(prev => [data, ...prev]);
    setShowAdd(false); setAddAmount(""); setAddCategory(""); setAddDesc("");
    toast.success(`${addType === "income" ? "Income" : "Expense"} added!`);
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("budget_entries").delete().eq("id", id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  // Assessment logic
  const currentQ = showAssess ? QUESTIONS[assessStep] : null;
  const isMulti = currentQ?.type === "multi";

  const selectOption = (opt: string) => {
    if (isMulti) {
      setMultiSelections(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);
    } else {
      const newAns = { ...answers, [currentQ!.id]: opt };
      setAnswers(newAns);
      if (assessStep < QUESTIONS.length - 1) setAssessStep(assessStep + 1);
      else generatePlan(newAns);
    }
  };

  const confirmMulti = () => {
    if (multiSelections.length === 0) return;
    const newAns = { ...answers, [currentQ!.id]: multiSelections };
    setAnswers(newAns);
    setMultiSelections([]);
    if (assessStep < QUESTIONS.length - 1) setAssessStep(assessStep + 1);
    else generatePlan(newAns);
  };

  const generatePlan = async (ans: Record<string, string | string[]>) => {
    setShowAssess(false);
    setTab("plan");
    setPlanLoading(true);
    setPlan("");
    let soFar = "";
    const budgetData = { totalIncome, totalExpense, balance, recentEntries: entries.slice(0, 20) };
    try {
      await streamChat(
        { type: "generate-plan", answers: ans, budgetData },
        (chunk) => { soFar += chunk; setPlan(soFar); },
        () => setPlanLoading(false),
        (err) => { setPlan(`⚠️ ${err}`); setPlanLoading(false); },
      );
    } catch { setPlan("⚠️ Something went wrong."); setPlanLoading(false); }
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "tracker", label: "Tracker", icon: <Wallet size={16} /> },
    { id: "plan", label: "AI Plan", icon: <FileText size={16} /> },
    { id: "chat", label: "Ask AI", icon: <MessageCircle size={16} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Wallet size={18} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">Budget Planner</h1>
            <p className="text-[11px] text-muted-foreground">Track & Plan Finances</p>
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

      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          {/* TRACKER */}
          {tab === "tracker" && !showAssess && (
            <motion.div key="tracker" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="px-4 py-4 space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-500/10 rounded-xl p-3 text-center">
                  <TrendingUp size={16} className="mx-auto text-green-500 mb-1" />
                  <p className="text-[10px] text-muted-foreground">Income</p>
                  <p className="text-sm font-bold text-green-600">₹{totalIncome.toLocaleString()}</p>
                </div>
                <div className="bg-red-500/10 rounded-xl p-3 text-center">
                  <TrendingDown size={16} className="mx-auto text-red-500 mb-1" />
                  <p className="text-[10px] text-muted-foreground">Expense</p>
                  <p className="text-sm font-bold text-red-600">₹{totalExpense.toLocaleString()}</p>
                </div>
                <div className={`${balance >= 0 ? "bg-amber-500/10" : "bg-red-500/10"} rounded-xl p-3 text-center`}>
                  <Wallet size={16} className={`mx-auto ${balance >= 0 ? "text-amber-500" : "text-red-500"} mb-1`} />
                  <p className="text-[10px] text-muted-foreground">Balance</p>
                  <p className={`text-sm font-bold ${balance >= 0 ? "text-amber-600" : "text-red-600"}`}>₹{balance.toLocaleString()}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => { setShowAdd(true); setAddType("expense"); }}
                  className="flex-1 bg-red-500/10 text-red-600 rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1">
                  <Plus size={14} /> Add Expense
                </button>
                <button onClick={() => { setShowAdd(true); setAddType("income"); }}
                  className="flex-1 bg-green-500/10 text-green-600 rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1">
                  <Plus size={14} /> Add Income
                </button>
              </div>

              {/* Get AI Plan button */}
              <button onClick={() => { setShowAssess(true); setAssessStep(0); setAnswers({}); }}
                className="w-full bg-amber-500 text-white rounded-xl py-2.5 text-sm font-semibold">
                ✨ Get AI Financial Plan
              </button>

              {/* Add form */}
              {showAdd && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="bg-card rounded-xl p-4 border border-border space-y-3">
                  <p className="text-sm font-bold text-foreground">Add {addType === "income" ? "Income" : "Expense"}</p>
                  <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)}
                    placeholder="Amount (₹)" className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <div className="flex flex-wrap gap-1.5">
                    {(addType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
                      <button key={c} onClick={() => setAddCategory(c)}
                        className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors border ${
                          addCategory === c ? "bg-amber-500/10 border-amber-500 text-amber-600" : "bg-muted border-transparent text-muted-foreground"
                        }`}>{c}</button>
                    ))}
                  </div>
                  <input value={addDesc} onChange={e => setAddDesc(e.target.value)}
                    placeholder="Note (optional)" className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowAdd(false)} className="flex-1 bg-muted text-foreground rounded-lg py-2 text-sm">Cancel</button>
                    <button onClick={addEntry} disabled={!addAmount || !addCategory}
                      className="flex-1 bg-amber-500 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-40">Save</button>
                  </div>
                </motion.div>
              )}

              {/* Recent entries */}
              <div>
                <p className="text-sm font-bold text-foreground mb-2">Recent Transactions</p>
                {entriesLoading ? (
                  <Loader2 className="animate-spin text-muted-foreground mx-auto" size={20} />
                ) : entries.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No transactions yet. Start by adding income or expenses.</p>
                ) : (
                  <div className="space-y-1.5">
                    {entries.slice(0, 20).map(e => (
                      <div key={e.id} className="flex items-center justify-between bg-card rounded-xl px-3 py-2.5 border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{e.category}</p>
                          {e.description && <p className="text-[10px] text-muted-foreground truncate">{e.description}</p>}
                          <p className="text-[10px] text-muted-foreground">{format(new Date(e.entry_date), "MMM d")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${e.type === "income" ? "text-green-600" : "text-red-600"}`}>
                            {e.type === "income" ? "+" : "-"}₹{e.amount.toLocaleString()}
                          </span>
                          <button onClick={() => deleteEntry(e.id)} className="p-1 hover:bg-muted rounded"><Trash2 size={12} className="text-muted-foreground" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ASSESSMENT (overlay on tracker) */}
          {tab === "tracker" && showAssess && (
            <motion.div key="assess" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="px-4 py-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${((assessStep + 1) / QUESTIONS.length) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{assessStep + 1}/{QUESTIONS.length}</span>
              </div>

              <p className="text-sm font-semibold text-foreground mb-4">{currentQ!.label}</p>

              <div className="space-y-2">
                {currentQ!.options.map(opt => {
                  const selected = isMulti ? multiSelections.includes(opt) : answers[currentQ!.id] === opt;
                  return (
                    <button key={opt} onClick={() => selectOption(opt)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                        selected ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400" : "bg-card border-border text-foreground hover:border-amber-300"
                      }`}>{opt}</button>
                  );
                })}
              </div>

              {isMulti && (
                <button onClick={confirmMulti} disabled={multiSelections.length === 0}
                  className="mt-4 w-full bg-amber-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                  Continue <ChevronRight size={16} />
                </button>
              )}

              <div className="flex gap-2 mt-3">
                {assessStep > 0 && <button onClick={() => setAssessStep(assessStep - 1)} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>}
                <button onClick={() => setShowAssess(false)} className="text-xs text-muted-foreground hover:text-foreground ml-auto">Cancel</button>
              </div>
            </motion.div>
          )}

          {/* PLAN */}
          {tab === "plan" && (
            <motion.div key="plan" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="px-4 py-4">
              {!plan && !planLoading ? (
                <div className="text-center py-12">
                  <FileText size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Complete the financial assessment to get your AI-powered plan.</p>
                  <button onClick={() => { setTab("tracker"); setShowAssess(true); setAssessStep(0); setAnswers({}); }}
                    className="bg-amber-500 text-white px-5 py-2 rounded-xl text-sm font-semibold">Start Assessment</button>
                </div>
              ) : (
                <div>
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_p]:text-sm [&_li]:text-sm leading-relaxed">
                    <ReactMarkdown>{plan}</ReactMarkdown>
                  </div>
                  {planLoading && <Loader2 className="animate-spin text-amber-500 mt-4" size={20} />}
                  {!planLoading && plan && (
                    <div className="mt-6 flex gap-2">
                      <button onClick={() => { setTab("tracker"); setShowAssess(true); setAssessStep(0); setAnswers({}); setPlan(""); }}
                        className="flex-1 bg-muted text-foreground rounded-xl py-2.5 text-sm font-medium">Retake</button>
                      <button onClick={() => setTab("chat")} className="flex-1 bg-amber-500 text-white rounded-xl py-2.5 text-sm font-semibold">Ask Follow-up</button>
                    </div>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </motion.div>
          )}

          {/* CHAT */}
          {tab === "chat" && (
            <motion.div key="chat" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 mx-auto flex items-center justify-center mb-3">
                      <Wallet size={24} className="text-amber-500" />
                    </div>
                    <p className="text-sm font-bold text-foreground mb-1">Finance Advisor 💰</p>
                    <p className="text-xs text-muted-foreground mb-4">Ask about budgeting, saving, investing, or managing money as a couple.</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {["📊 50/30/20 budget rule", "💳 Debt payoff strategy", "🏦 Emergency fund tips", "💕 Money talks for couples"].map(s => (
                        <button key={s} onClick={() => sendChat(s.replace(/^[^\s]+ /, ""))}
                          className="text-[11px] px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium hover:bg-amber-500/20 transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      msg.role === "user" ? "bg-amber-500 text-white rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
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

      {/* Chat input */}
      {tab === "chat" && (
        <div className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
              placeholder="Ask about finances..."
              className="flex-1 bg-muted rounded-full px-4 h-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={() => sendChat()} disabled={!input.trim() || chatLoading}
              className="h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center disabled:opacity-40 shrink-0">
              {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

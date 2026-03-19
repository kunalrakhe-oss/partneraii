import { useState, useEffect, useCallback } from "react";
import { Activity, Heart, Moon, Flame, Scale, Droplets, Footprints, TrendingUp, TrendingDown, Bot, Send, Loader2, Plus, ArrowUp, ArrowDown, Minus, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import ReactMarkdown from "react-markdown";
import PageTransition from "@/components/PageTransition";

type HealthMetric = {
  id: string;
  user_id: string;
  metric_date: string;
  steps: number | null;
  heart_rate: number | null;
  sleep_hours: number | null;
  calories_burned: number | null;
  weight: number | null;
  water_glasses: number | null;
  notes: string | null;
};

type ChatMsg = { role: "user" | "assistant"; content: string };

type HealthAnalysis = {
  healthScore: number;
  summary: string;
  trends: Array<{ metric: string; direction: string; insight: string; icon: string }>;
  recommendations: Array<{ title: string; description: string; icon: string; priority: string }>;
  predictions: Array<{ prediction: string; icon: string }>;
  partnerTips: Array<{ tip: string; icon: string }>;
};

export default function HealthPage() {
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState({ steps: "", heart_rate: "", sleep_hours: "", calories_burned: "", weight: "", water_glasses: "", notes: "" });

  const [aiTab, setAiTab] = useState<"analytics" | "chat">("analytics");
  const [analysis, setAnalysis] = useState<HealthAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const fetchMetrics = useCallback(async () => {
    if (!partnerPair) return;
    setLoading(true);
    const since = format(subDays(new Date(), 30), "yyyy-MM-dd");
    const { data } = await supabase
      .from("health_metrics")
      .select("*")
      .eq("partner_pair", partnerPair)
      .gte("metric_date", since)
      .order("metric_date", { ascending: true });
    if (data) {
      setMetrics(data as HealthMetric[]);
      const todayEntry = data.find((m: any) => m.metric_date === today && m.user_id === user?.id);
      if (todayEntry) {
        setForm({
          steps: todayEntry.steps?.toString() || "",
          heart_rate: todayEntry.heart_rate?.toString() || "",
          sleep_hours: todayEntry.sleep_hours?.toString() || "",
          calories_burned: todayEntry.calories_burned?.toString() || "",
          weight: todayEntry.weight?.toString() || "",
          water_glasses: todayEntry.water_glasses?.toString() || "",
          notes: todayEntry.notes || "",
        });
      }
    }
    setLoading(false);
  }, [partnerPair, today, user?.id]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const saveToday = async () => {
    if (!user || !partnerPair) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      partner_pair: partnerPair,
      metric_date: today,
      steps: form.steps ? parseInt(form.steps) : null,
      heart_rate: form.heart_rate ? parseInt(form.heart_rate) : null,
      sleep_hours: form.sleep_hours ? parseFloat(form.sleep_hours) : null,
      calories_burned: form.calories_burned ? parseInt(form.calories_burned) : null,
      weight: form.weight ? parseFloat(form.weight) : null,
      water_glasses: form.water_glasses ? parseInt(form.water_glasses) : null,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("health_metrics").upsert(payload, { onConflict: "user_id,metric_date" });
    if (error) toast.error("Failed to save");
    else { toast.success("Saved!"); fetchMetrics(); }
    setSaving(false);
  };

  // Streaming helper for chat
  const streamResponse = async (body: object, onDelta: (t: string) => void, onDone: () => void) => {
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify(body),
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || "AI error"); }
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") { onDone(); return; }
        try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) onDelta(c); } catch {}
      }
    }
    onDone();
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ type: "analyze", metrics }),
      });
      if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || "AI error"); }
      const data = await resp.json();
      setAnalysis(data.analysis);
    } catch (e: any) { toast.error(e.message); }
    setAnalyzing(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMsg = { role: "user", content: chatInput };
    const contextMsg: ChatMsg = { role: "user", content: `My health data (last 30 days): ${JSON.stringify(metrics.slice(-14))}` };
    const allMsgs = chatMessages.length === 0 ? [contextMsg, userMsg] : [...chatMessages, userMsg];
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    let assistantText = "";
    try {
      await streamResponse(
        { type: "chat", messages: allMsgs },
        (d) => {
          assistantText += d;
          setChatMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
            return [...prev, { role: "assistant", content: assistantText }];
          });
        },
        () => setChatLoading(false),
      );
    } catch (e: any) { toast.error(e.message); setChatLoading(false); }
  };

  const myMetrics = metrics.filter(m => m.user_id === user?.id);
  const chartData = myMetrics.map(m => ({
    date: format(new Date(m.metric_date), "MMM d"),
    steps: m.steps,
    hr: m.heart_rate,
    sleep: m.sleep_hours,
    cal: m.calories_burned,
    weight: m.weight,
    water: m.water_glasses,
  }));

  const metricFields = [
    { key: "steps", label: "Steps", icon: Footprints, color: "text-blue-500", unit: "" },
    { key: "heart_rate", label: "Heart Rate", icon: Heart, color: "text-red-500", unit: "bpm" },
    { key: "sleep_hours", label: "Sleep", icon: Moon, color: "text-indigo-500", unit: "hrs" },
    { key: "calories_burned", label: "Calories", icon: Flame, color: "text-orange-500", unit: "kcal" },
    { key: "weight", label: "Weight", icon: Scale, color: "text-emerald-500", unit: "kg" },
    { key: "water_glasses", label: "Water", icon: Droplets, color: "text-cyan-500", unit: "glasses" },
  ] as const;

  const directionIcon = (dir: string) => {
    if (dir === "up") return <ArrowUp size={14} className="text-green-500" />;
    if (dir === "down") return <ArrowDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-muted-foreground" />;
  };

  const priorityColors: Record<string, string> = {
    High: "bg-red-500/10 text-red-600 border-red-500/20",
    Medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    Low: "bg-green-500/10 text-green-600 border-green-500/20",
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 pb-28 space-y-5">
        <div className="sticky top-0 z-20 bg-background -mx-4 px-4 pt-6 pb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Health Tracker</h1>
            <p className="text-xs text-muted-foreground">Manual entry + AI analytics</p>
          </div>
        </div>

        <Tabs defaultValue="log" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="log">Log</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="ai">AI Insights</TabsTrigger>
          </TabsList>

          {/* LOG TAB */}
          <TabsContent value="log" className="space-y-4 mt-4">
            <p className="text-sm font-medium text-muted-foreground">Today — {format(new Date(), "MMM d, yyyy")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {metricFields.map(f => {
                const Icon = f.icon;
                return (
                  <Card key={f.key} className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className={f.color} />
                      <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        placeholder="—"
                        value={form[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="h-8 text-sm"
                      />
                      {f.unit && <span className="text-xs text-muted-foreground whitespace-nowrap">{f.unit}</span>}
                    </div>
                  </Card>
                );
              })}
            </div>
            <Input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            />
            <Button onClick={saveToday} disabled={saving} className="w-full">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Plus size={16} className="mr-2" />}
              {metrics.find(m => m.metric_date === today && m.user_id === user?.id) ? "Update Today" : "Save Today"}
            </Button>
          </TabsContent>

          {/* TRENDS TAB */}
          <TabsContent value="trends" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : chartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No data yet. Start logging!</p>
            ) : (
              <>
                <Card className="p-4">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Footprints size={14} className="text-blue-500" /> Steps</p>
                  <div className="h-40 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs><linearGradient id="stepsGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                        <Tooltip />
                        <Area type="monotone" dataKey="steps" stroke="hsl(var(--primary))" fill="url(#stepsGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Heart size={14} className="text-red-500" /> Heart Rate & <Moon size={14} className="text-indigo-500" /> Sleep</p>
                  <div className="h-40 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="hr" name="Heart Rate" stroke="#ef4444" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="sleep" name="Sleep (hrs)" stroke="#6366f1" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Scale size={14} className="text-emerald-500" /> Weight & <Flame size={14} className="text-orange-500" /> Calories</p>
                  <div className="h-40 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line yAxisId="left" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="cal" name="Calories" stroke="#f97316" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Avg Steps", val: Math.round(myMetrics.reduce((s, m) => s + (m.steps || 0), 0) / (myMetrics.filter(m => m.steps).length || 1)), color: "text-blue-500" },
                    { label: "Avg Sleep", val: (myMetrics.reduce((s, m) => s + (m.sleep_hours || 0), 0) / (myMetrics.filter(m => m.sleep_hours).length || 1)).toFixed(1) + "h", color: "text-indigo-500" },
                    { label: "Avg HR", val: Math.round(myMetrics.reduce((s, m) => s + (m.heart_rate || 0), 0) / (myMetrics.filter(m => m.heart_rate).length || 1)) + " bpm", color: "text-red-500" },
                  ].map(s => (
                    <Card key={s.label} className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* AI TAB — structured cards */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Button variant={aiTab === "analytics" ? "default" : "outline"} size="sm" onClick={() => setAiTab("analytics")}>
                <TrendingUp size={14} className="mr-1" /> Analytics
              </Button>
              <Button variant={aiTab === "chat" ? "default" : "outline"} size="sm" onClick={() => setAiTab("chat")}>
                <Bot size={14} className="mr-1" /> Ask AI
              </Button>
            </div>

            {aiTab === "analytics" ? (
              <div className="space-y-4">
                <Button onClick={runAnalysis} disabled={analyzing || metrics.length === 0} className="w-full">
                  {analyzing ? <Loader2 className="animate-spin mr-2" size={16} /> : <TrendingUp size={16} className="mr-2" />}
                  {metrics.length === 0 ? "Log data first" : "Generate AI Analysis"}
                </Button>

                {analysis && (
                  <div className="space-y-4">
                    {/* Health Score */}
                    <Card className="p-4 text-center">
                      <p className="text-xs font-bold text-primary mb-2">💚 Health Score</p>
                      <div className="text-4xl font-black text-foreground mb-1">{analysis.healthScore}<span className="text-lg text-muted-foreground">/10</span></div>
                      <Progress value={analysis.healthScore * 10} className="h-2 mt-2" />
                      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{analysis.summary}</p>
                    </Card>

                    {/* Trends */}
                    {analysis.trends.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-foreground">📈 Key Trends</h3>
                        {analysis.trends.map((t, i) => (
                          <Card key={i} className="p-3 flex items-start gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{t.icon}</span>
                              {directionIcon(t.direction)}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-foreground">{t.metric}</p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{t.insight}</p>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Recommendations */}
                    {analysis.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Target size={14} /> Recommendations</h3>
                        {analysis.recommendations.map((r, i) => (
                          <Card key={i} className="p-3">
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-xs font-semibold text-foreground">{r.icon} {r.title}</p>
                              <Badge variant="outline" className={`text-[10px] ${priorityColors[r.priority] || ""}`}>{r.priority}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{r.description}</p>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Predictions */}
                    {analysis.predictions.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-foreground">🔮 Predictions</h3>
                        {analysis.predictions.map((p, i) => (
                          <Card key={i} className="p-3 flex items-start gap-2">
                            <span>{p.icon}</span>
                            <p className="text-xs text-foreground leading-relaxed">{p.prediction}</p>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Partner Tips */}
                    {analysis.partnerTips.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-foreground">💕 Partner Support Tips</h3>
                        {analysis.partnerTips.map((pt, i) => (
                          <Card key={i} className="p-3 flex items-start gap-2">
                            <span>{pt.icon}</span>
                            <p className="text-xs text-foreground leading-relaxed">{pt.tip}</p>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-[320px] overflow-y-auto space-y-3 pr-1">
                  {chatMessages.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">Ask anything about your health data!</p>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {m.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                        ) : m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && chatMessages[chatMessages.length - 1]?.role !== "assistant" && (
                    <div className="flex justify-start"><div className="bg-muted rounded-2xl px-3 py-2"><Loader2 className="animate-spin" size={14} /></div></div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="E.g. How's my sleep trend?"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
                    disabled={chatLoading}
                  />
                  <Button size="icon" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}

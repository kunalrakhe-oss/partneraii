import { useState } from "react";
import {
  PartyPopper, Sparkles, Send, Loader2, CalendarPlus, Clock, DollarSign,
  Tag, MapPin, Bot, Wand2, ChevronRight, Heart,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import PageTransition from "@/components/PageTransition";

type EventSuggestion = {
  title: string;
  description: string;
  category: string;
  estimated_duration: string;
  estimated_budget: string;
  best_time: string;
};

type ChatMsg = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  { label: "Date Night Ideas", prompt: "Suggest 5 unique date night ideas for a couple who enjoys trying new things. Mix indoor and outdoor options with varying budgets." },
  { label: "Anniversary Plan", prompt: "Plan a special anniversary celebration. Include romantic, memorable, and unique ideas for different budgets." },
  { label: "Weekend Getaway", prompt: "Suggest 5 weekend trip ideas for a couple. Include adventure, relaxation, and cultural options." },
  { label: "Home Party", prompt: "Plan 5 fun party ideas we can host at home for friends or family. Include themes, food, and activities." },
  { label: "Seasonal Fun", prompt: `Suggest 5 seasonal activities perfect for ${format(new Date(), "MMMM")}. Mix free and paid options.` },
  { label: "Budget Friendly", prompt: "Suggest 5 amazing date ideas that cost under $20. Be creative and romantic!" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "date-night": "bg-pink-500/10 text-pink-600",
  travel: "bg-purple-500/10 text-purple-600",
  family: "bg-orange-500/10 text-orange-600",
  groceries: "bg-green-500/10 text-green-600",
  cleaning: "bg-blue-500/10 text-blue-600",
  bills: "bg-yellow-500/10 text-yellow-600",
};

export default function EventPlannerPage() {
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();

  // Suggestions
  const [suggestions, setSuggestions] = useState<EventSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  // Itinerary
  const [selectedEvent, setSelectedEvent] = useState<EventSuggestion | null>(null);
  const [itineraryText, setItineraryText] = useState("");
  const [itineraryLoading, setItineraryLoading] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Adding to calendar
  const [addingId, setAddingId] = useState<string | null>(null);

  const fetchSuggestions = async (prompt: string) => {
    setSuggestLoading(true);
    setSuggestions([]);
    setSelectedEvent(null);
    setItineraryText("");
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/event-planner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ type: "suggest", planRequest: prompt }),
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || "Failed to get suggestions");
      }
      const data = await resp.json();
      let parsed: EventSuggestion[] = [];
      try {
        const raw = data.suggestions.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(raw);
      } catch {
        toast.error("AI returned unexpected format. Try again.");
      }
      setSuggestions(parsed);
    } catch (e: any) {
      toast.error(e.message);
    }
    setSuggestLoading(false);
  };

  const streamResponse = async (body: object, onDelta: (t: string) => void, onDone: () => void) => {
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/event-planner`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      throw new Error(e.error || "AI error");
    }
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") { onDone(); return; }
        try {
          const p = JSON.parse(json);
          const c = p.choices?.[0]?.delta?.content;
          if (c) onDelta(c);
        } catch {}
      }
    }
    onDone();
  };

  const generateItinerary = async (event: EventSuggestion) => {
    setSelectedEvent(event);
    setItineraryLoading(true);
    setItineraryText("");
    let text = "";
    try {
      await streamResponse(
        { type: "itinerary", planRequest: `Create a detailed itinerary for: "${event.title}" — ${event.description}. Budget: ${event.estimated_budget}. Duration: ${event.estimated_duration}. Best time: ${event.best_time}.` },
        (d) => { text += d; setItineraryText(text); },
        () => setItineraryLoading(false),
      );
    } catch (e: any) {
      toast.error(e.message);
      setItineraryLoading(false);
    }
  };

  const addToCalendar = async (event: EventSuggestion) => {
    if (!user || !partnerPair) return;
    setAddingId(event.title);
    const { error } = await supabase.from("calendar_events").insert({
      title: event.title,
      description: event.description,
      category: event.category || "date-night",
      event_date: format(new Date(), "yyyy-MM-dd"),
      assigned_to: "both",
      priority: "medium",
      recurrence: "once",
      user_id: user.id,
      partner_pair: partnerPair,
    });
    if (error) toast.error("Failed to add");
    else toast.success(`"${event.title}" added to calendar!`);
    setAddingId(null);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMsg = { role: "user", content: chatInput };
    const allMsgs = [...chatMessages, userMsg];
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
    } catch (e: any) {
      toast.error(e.message);
      setChatLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-lg mx-auto px-4 pb-28 space-y-5">
        <div className="sticky top-0 z-20 bg-background -mx-4 px-4 pt-6 pb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <PartyPopper size={20} className="text-pink-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Event Planner</h1>
            <p className="text-xs text-muted-foreground">AI-powered event ideas & itineraries</p>
          </div>
        </div>

        <Tabs defaultValue="ideas" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="ideas">Ideas</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="chat">Ask AI</TabsTrigger>
          </TabsList>

          {/* IDEAS TAB */}
          <TabsContent value="ideas" className="space-y-4 mt-4">
            <p className="text-sm font-medium text-muted-foreground">Quick picks or describe your own:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map(q => (
                <Button
                  key={q.label}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => fetchSuggestions(q.prompt)}
                  disabled={suggestLoading}
                >
                  {q.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Describe what you're looking for…"
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                onKeyDown={e => e.key === "Enter" && customPrompt.trim() && fetchSuggestions(customPrompt)}
              />
              <Button size="icon" onClick={() => customPrompt.trim() && fetchSuggestions(customPrompt)} disabled={suggestLoading || !customPrompt.trim()}>
                <Wand2 size={16} />
              </Button>
            </div>

            {suggestLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            )}

            {suggestions.map((s, i) => (
              <Card key={i} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground text-sm">{s.title}</h3>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                  <Badge className={CATEGORY_COLORS[s.category] || "bg-muted text-muted-foreground"} variant="secondary">
                    {s.category}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock size={12} /> {s.estimated_duration}</span>
                  <span className="flex items-center gap-1"><DollarSign size={12} /> {s.estimated_budget}</span>
                  <span className="flex items-center gap-1"><Tag size={12} /> {s.best_time}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => generateItinerary(s)} className="flex-1">
                    <Sparkles size={14} className="mr-1" /> Plan It
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => addToCalendar(s)}
                    disabled={addingId === s.title}
                    className="flex-1"
                  >
                    {addingId === s.title ? <Loader2 className="animate-spin mr-1" size={14} /> : <CalendarPlus size={14} className="mr-1" />}
                    Add to Calendar
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* PLAN TAB */}
          <TabsContent value="plan" className="space-y-4 mt-4">
            {!selectedEvent ? (
              <div className="text-center py-12 space-y-2">
                <Sparkles className="mx-auto text-muted-foreground" size={32} />
                <p className="text-sm text-muted-foreground">Select an idea from the Ideas tab and click "Plan It" to generate a detailed itinerary.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Heart size={16} className="text-primary" /> {selectedEvent.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{selectedEvent.description}</p>
                </Card>
                {itineraryLoading && !itineraryText && (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                )}
                {itineraryText && (
                  <Card className="p-4 prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{itineraryText}</ReactMarkdown>
                  </Card>
                )}
                <Button onClick={() => addToCalendar(selectedEvent)} disabled={addingId === selectedEvent.title} className="w-full">
                  {addingId === selectedEvent.title ? <Loader2 className="animate-spin mr-2" size={14} /> : <CalendarPlus size={16} className="mr-2" />}
                  Add to Calendar
                </Button>
              </div>
            )}
          </TabsContent>

          {/* CHAT TAB */}
          <TabsContent value="chat" className="space-y-3 mt-4">
            <div className="h-[360px] overflow-y-auto space-y-3 pr-1">
              {chatMessages.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <Bot className="mx-auto text-muted-foreground" size={32} />
                  <p className="text-sm text-muted-foreground">Ask me anything about planning events!</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {["Plan our anniversary dinner", "Fun rainy day activities", "Surprise party ideas"].map(q => (
                      <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => { setChatInput(q); }}>
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
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
                placeholder="E.g. Plan a surprise birthday party…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
                disabled={chatLoading}
              />
              <Button size="icon" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
                <Send size={16} />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}

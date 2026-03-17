import { useState, useRef, useEffect } from "react";
import { Send, Search, MoreVertical, Mic, Paperclip, Smile, ShoppingCart, CheckSquare, SmilePlus } from "lucide-react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ChatMsg {
  id: string;
  user_id: string;
  partner_pair: string;
  message: string;
  type: string;
  created_at: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const { partnerPair, loading: ppLoading } = usePartnerPair();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch messages & subscribe to realtime
  useEffect(() => {
    if (!partnerPair) return;

    supabase.from("chat_messages").select("*").eq("partner_pair", partnerPair).order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setMessages(data); });

    const channel = supabase.channel("chat-" + partnerPair)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => { setMessages(prev => [...prev, payload.new as ChatMsg]); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [partnerPair]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !partnerPair) return;
    const text = input.trim();
    setInput("");
    const { error } = await supabase.from("chat_messages").insert({
      user_id: user.id,
      partner_pair: partnerPair,
      message: text,
      type: "text",
    });
    if (error) toast.error("Failed to send message");
  };

  const isMe = (msg: ChatMsg) => msg.user_id === user?.id;

  if (ppLoading) return <PageTransition><div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div></PageTransition>;

  return (
    <PageTransition>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="px-5 pt-8 pb-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-muted overflow-hidden flex items-center justify-center relative">
            <span className="text-lg">👩</span>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-card" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-foreground">Partner</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">✨ Online</span>
          </div>
          <button className="w-9 h-9 rounded-full flex items-center justify-center"><Search size={18} className="text-foreground" /></button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center"><MoreVertical size={18} className="text-foreground" /></button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-sm text-muted-foreground">Start your private conversation</p>
            </div>
          )}

          {messages.length > 0 && (
            <div className="flex justify-center">
              <span className="text-[10px] font-medium text-muted-foreground bg-card shadow-card px-3 py-1 rounded-full">Today</span>
            </div>
          )}

          {messages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMe(msg) ? "justify-end" : "justify-start"} gap-2`}>
              {!isMe(msg) && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 self-end">
                  <span className="text-[10px] font-bold text-muted-foreground">P</span>
                </div>
              )}
              <div className={`max-w-[75%] px-4 py-3 ${isMe(msg)
                ? "bg-[hsl(100,20%,72%)] text-foreground rounded-2xl rounded-br-md"
                : "bg-card shadow-card text-foreground rounded-2xl rounded-bl-md border border-border"}`}>
                <p className="text-sm leading-relaxed">{msg.message}</p>
                <p className={`text-[10px] mt-1.5 ${isMe(msg) ? "text-foreground/50" : "text-muted-foreground"}`}>
                  {format(new Date(msg.created_at), "h:mm a")}
                </p>
              </div>
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-5 py-2 flex gap-2 overflow-x-auto">
          {[
            { icon: ShoppingCart, label: "Grocery List" },
            { icon: CheckSquare, label: "Shared Task" },
            { icon: SmilePlus, label: "Mood Update" },
          ].map(action => (
            <button key={action.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card shadow-card text-xs font-medium text-muted-foreground border border-border whitespace-nowrap shrink-0">
              <action.icon size={12} />{action.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-5 py-3 bg-card border-t border-border">
          <div className="flex gap-2 items-center">
            <button className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0"><Mic size={16} className="text-primary" /></button>
            <div className="flex-1 bg-muted rounded-full flex items-center px-4 gap-2">
              <Smile size={16} className="text-muted-foreground shrink-0" />
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Message LoveList..." className="flex-1 h-10 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
              <Paperclip size={16} className="text-muted-foreground shrink-0" />
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={sendMessage}
              className="w-10 h-10 rounded-full bg-[hsl(100,20%,55%)] flex items-center justify-center shadow-soft shrink-0">
              <Send size={16} className="text-card" />
            </motion.button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
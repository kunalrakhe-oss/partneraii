import { useState, useRef, useEffect } from "react";
import { Send, Search, MoreVertical, ShoppingCart, CheckSquare, SmilePlus, Image as ImageIcon, X, Plus, Camera, FileText, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { uploadAttachment } from "@/components/MediaPicker";

interface ChatMsg {
  id: string;
  user_id: string;
  partner_pair: string;
  message: string;
  type: string;
  created_at: string;
}

interface ProfileInfo {
  display_name: string | null;
  avatar_url: string | null;
}

type ChatFilter = "all" | "media" | "links" | "shared";

export default function ChatPage() {
  const { user } = useAuth();
  const { partnerPair, loading: ppLoading, userId } = usePartnerPair();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [partnerProfile, setPartnerProfile] = useState<ProfileInfo | null>(null);
  const [sending, setSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [chatFilter, setChatFilter] = useState<ChatFilter>("all");

  // Fetch partner profile
  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("display_name, avatar_url, user_id").then(({ data }) => {
      if (data) {
        const partner = data.find(p => p.user_id !== userId);
        if (partner) setPartnerProfile({ display_name: partner.display_name, avatar_url: partner.avatar_url });
      }
    });
  }, [userId]);

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

  const sendMessage = async (text?: string, type: string = "text") => {
    const msg = text || input.trim();
    if (!msg || !user || !partnerPair) return;
    if (!text) setInput("");
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      user_id: user.id,
      partner_pair: partnerPair,
      message: msg,
      type,
    });
    if (error) toast.error("Failed to send message");
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }
    setSending(true);
    const url = await uploadAttachment(file, user.id);
    if (url) {
      await sendMessage(url, "image");
    } else {
      toast.error("Upload failed");
    }
    setSending(false);
    // Reset the file input
    if (fileRef.current) fileRef.current.value = "";
  };

  const isMe = (msg: ChatMsg) => msg.user_id === user?.id;
  const partnerInitial = partnerProfile?.display_name?.charAt(0).toUpperCase() || "P";

  // Group messages by date
  const groupedMessages: { date: string; msgs: ChatMsg[] }[] = [];
  messages.forEach(msg => {
    const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === dateKey) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, msgs: [msg] });
    }
  });

  const formatDateLabel = (dateStr: string) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    return format(new Date(dateStr), "MMMM d, yyyy");
  };

  if (ppLoading) return <PageTransition><div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div></PageTransition>;

  return (
    <PageTransition>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="px-5 pt-8 pb-3 flex items-center gap-3 border-b border-border/50">
          <div className="w-11 h-11 rounded-full bg-muted overflow-hidden flex items-center justify-center relative">
            {partnerProfile?.avatar_url ? (
              <img src={partnerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">{partnerInitial}</span>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-card" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-foreground">{partnerProfile?.display_name || "Partner"}</p>
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
              <p className="text-sm font-semibold text-foreground mb-1">Start your conversation</p>
              <p className="text-xs text-muted-foreground">Messages are private between you and {partnerProfile?.display_name || "your partner"}</p>
            </div>
          )}

          {groupedMessages.map(group => (
            <div key={group.date} className="space-y-3">
              <div className="flex justify-center">
                <span className="text-[10px] font-medium text-muted-foreground bg-card shadow-card px-3 py-1 rounded-full">
                  {formatDateLabel(group.date)}
                </span>
              </div>
              {group.msgs.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMe(msg) ? "justify-end" : "justify-start"} gap-2`}>
                  {!isMe(msg) && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 self-end overflow-hidden">
                      {partnerProfile?.avatar_url ? (
                        <img src={partnerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground">{partnerInitial}</span>
                      )}
                    </div>
                  )}
                  <div className={`max-w-[75%] ${msg.type === "image" ? "" : "px-4 py-3"} ${isMe(msg)
                    ? `${msg.type === "image" ? "" : "bg-[hsl(100,20%,72%)]"} text-foreground rounded-2xl rounded-br-md`
                    : `${msg.type === "image" ? "" : "bg-card shadow-card border border-border"} text-foreground rounded-2xl rounded-bl-md`}`}>
                    {msg.type === "image" ? (
                      <div className="rounded-2xl overflow-hidden">
                        <img src={msg.message} alt="Shared photo" className="max-w-full max-h-64 object-cover rounded-2xl" />
                        <p className={`text-[10px] mt-1 px-1 ${isMe(msg) ? "text-foreground/50" : "text-muted-foreground"}`}>
                          {format(new Date(msg.created_at), "h:mm a")}
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <p className={`text-[10px] mt-1.5 ${isMe(msg) ? "text-foreground/50" : "text-muted-foreground"}`}>
                          {format(new Date(msg.created_at), "h:mm a")}
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-5 py-2 flex gap-2 overflow-x-auto">
          {[
            { icon: ShoppingCart, label: "Grocery List", action: () => navigate("/lists") },
            { icon: CheckSquare, label: "Shared Task", action: () => navigate("/chores") },
            { icon: SmilePlus, label: "Mood Update", action: () => navigate("/mood") },
          ].map(action => (
            <button
              key={action.label}
              onClick={action.action}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card shadow-card text-xs font-medium text-muted-foreground border border-border whitespace-nowrap shrink-0 hover:bg-muted transition-colors"
            >
              <action.icon size={12} />{action.label}
            </button>
          ))}
        </div>

        {/* Attachment Menu Overlay */}
        <AnimatePresence>
          {showAttachMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setShowAttachMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-20 left-5 z-50 bg-card rounded-2xl shadow-elevated border border-border p-3 grid grid-cols-3 gap-4 w-[220px]"
              >
                {[
                  { icon: Camera, label: "Camera", color: "hsl(var(--primary))", bg: "bg-primary/15", action: () => { fileRef.current?.setAttribute("capture", "environment"); fileRef.current?.click(); } },
                  { icon: ImageIcon, label: "Gallery", color: "hsl(340,65%,55%)", bg: "bg-[hsl(340,65%,90%)]", action: () => { fileRef.current?.removeAttribute("capture"); fileRef.current?.click(); } },
                  { icon: FileText, label: "Document", color: "hsl(220,60%,55%)", bg: "bg-[hsl(220,60%,90%)]", action: () => { fileRef.current?.removeAttribute("capture"); fileRef.current?.click(); } },
                  { icon: MapPin, label: "Location", color: "hsl(140,50%,45%)", bg: "bg-[hsl(140,50%,90%)]", action: () => { toast.info("Location sharing coming soon"); } },
                  { icon: SmilePlus, label: "Mood", color: "hsl(35,80%,55%)", bg: "bg-[hsl(35,80%,90%)]", action: () => navigate("/mood") },
                  { icon: ShoppingCart, label: "Grocery", color: "hsl(270,50%,55%)", bg: "bg-[hsl(270,50%,90%)]", action: () => navigate("/lists") },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => { setShowAttachMenu(false); item.action(); }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className={`w-11 h-11 rounded-full ${item.bg} flex items-center justify-center`}>
                      <item.icon size={18} style={{ color: item.color }} />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="px-5 py-3 bg-card border-t border-border relative">
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => { handleImageUpload(e); setShowAttachMenu(false); }} className="hidden" />
          <div className="flex gap-2 items-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowAttachMenu(prev => !prev)}
              className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0"
            >
              <motion.div animate={{ rotate: showAttachMenu ? 45 : 0 }} transition={{ duration: 0.15 }}>
                <Plus size={18} className="text-primary" />
              </motion.div>
            </motion.button>
            <div className="flex-1 bg-muted rounded-full flex items-center px-4 gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder={`Message ${partnerProfile?.display_name || "your partner"}...`}
                className="flex-1 h-10 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => sendMessage()}
              disabled={sending || !input.trim()}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-soft shrink-0 disabled:opacity-50">
              <Send size={16} className="text-primary-foreground" />
            </motion.button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

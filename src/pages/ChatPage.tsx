import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Search, ShoppingCart, CheckSquare, SmilePlus, Image as ImageIcon, X, Plus, Camera, FileText, MapPin, MessageCircleHeart, Reply, Smile } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { uploadAttachment } from "@/components/MediaPicker";
import AIChatbot from "@/components/AIChatbot";
import aiAssistantIcon from "@/assets/ai-assistant-icon.png";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_CHAT_MESSAGES, DEMO_PARTNER2 } from "@/lib/demoData";

interface ChatMsg {
  id: string;
  user_id: string;
  partner_pair: string;
  message: string;
  type: string;
  created_at: string;
  reply_to?: string | null;
}

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  partner_pair: string;
  emoji: string;
}

interface ProfileInfo {
  display_name: string | null;
  avatar_url: string | null;
}

type ChatTab = "partner" | "ai";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👍"];

export default function ChatPage() {
  const { user } = useAuth();
  const { partnerPair, loading: ppLoading, userId } = usePartnerPair();
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [partnerProfile, setPartnerProfile] = useState<ProfileInfo | null>(null);
  const [sending, setSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatTab>("partner");
  const [selectedMsg, setSelectedMsg] = useState<ChatMsg | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch messages, reactions & subscribe
  useEffect(() => {
    if (!partnerPair) return;

    supabase.from("chat_messages").select("*").eq("partner_pair", partnerPair).order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setMessages(data); });

    supabase.from("message_reactions" as any).select("*").eq("partner_pair", partnerPair)
      .then(({ data }: any) => { if (data) setReactions(data); });

    const channel = supabase.channel("chat-" + partnerPair)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => { setMessages(prev => [...prev, payload.new as ChatMsg]); })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => { setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id)); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => { const r = payload.new as Reaction; setReactions(prev => prev.some(x => x.id === r.id) ? prev : [...prev, r]); })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => { setReactions(prev => prev.filter(r => r.id !== (payload.old as any).id)); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [partnerPair]);

  // Demo data
  useEffect(() => {
    if (isDemoMode && messages.length === 0) {
      setMessages(DEMO_CHAT_MESSAGES.map(m => ({
        ...m,
        user_id: m.user_id === "me" ? (userId || "me") : "demo-partner",
      })));
      if (!partnerProfile) {
        setPartnerProfile({ display_name: DEMO_PARTNER2, avatar_url: null });
      }
    }
  }, [isDemoMode, messages.length, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string, type: string = "text") => {
    const msg = text || input.trim();
    if (!msg || !user || !partnerPair) return;
    if (!text) setInput("");
    setSending(true);
    const insertData: any = {
      user_id: user.id,
      partner_pair: partnerPair,
      message: msg,
      type,
    };
    if (replyTo) {
      insertData.reply_to = replyTo.id;
    }
    const { error } = await supabase.from("chat_messages").insert(insertData);
    if (error) toast.error("Failed to send message");
    setReplyTo(null);
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)"); return; }
    setSending(true);
    const url = await uploadAttachment(file, user.id);
    if (url) await sendMessage(url, "image");
    else toast.error("Upload failed");
    setSending(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user || !partnerPair) return;
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from("message_reactions" as any).delete().eq("id", existing.id);
      setReactions(prev => prev.filter(r => r.id !== existing.id));
    } else {
      const { data, error } = await (supabase.from("message_reactions" as any) as any).insert({
        message_id: messageId,
        user_id: user.id,
        partner_pair: partnerPair,
        emoji,
      }).select().single();
      if (!error && data) setReactions(prev => [...prev, data as Reaction]);
    }
    setSelectedMsg(null);
  };

  const startReply = (msg: ChatMsg) => {
    setReplyTo(msg);
    setSelectedMsg(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const isMe = (msg: ChatMsg) => msg.user_id === user?.id;
  const partnerInitial = partnerProfile?.display_name?.charAt(0).toUpperCase() || "P";
  const partnerFirstName = partnerProfile?.display_name?.split(" ")[0] || "Partner";

  const getReactionsForMsg = (msgId: string) => {
    const msgReactions = reactions.filter(r => r.message_id === msgId);
    const grouped: Record<string, { emoji: string; count: number; myReaction: boolean }> = {};
    msgReactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, myReaction: false };
      grouped[r.emoji].count++;
      if (r.user_id === user?.id) grouped[r.emoji].myReaction = true;
    });
    return Object.values(grouped);
  };

  const getRepliedMsg = (replyId: string | null | undefined) => {
    if (!replyId) return null;
    return messages.find(m => m.id === replyId) || null;
  };

  // Group messages by date
  const filteredMessages = searchQuery
    ? messages.filter(m => m.type === "text" && m.message.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const groupedMessages: { date: string; msgs: ChatMsg[] }[] = [];
  filteredMessages.forEach(msg => {
    const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === dateKey) last.msgs.push(msg);
    else groupedMessages.push({ date: dateKey, msgs: [msg] });
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
        <div className="px-4 pt-8 pb-2 shrink-0">
          <AnimatePresence mode="wait">
            {searchOpen ? (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2"
              >
                <div className="flex-1 bg-muted rounded-full flex items-center px-3 gap-2">
                  <Search size={14} className="text-muted-foreground shrink-0" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    autoFocus
                    className="flex-1 h-10 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="shrink-0">
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
                <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                  className="text-xs font-semibold text-primary px-2 py-2">
                  Cancel
                </button>
              </motion.div>
            ) : (
              <motion.div key="tabs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5">
                <div className="flex bg-muted rounded-2xl p-1 gap-1">
                  <button
                    onClick={() => setActiveTab("partner")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === "partner" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-muted overflow-hidden flex items-center justify-center relative shrink-0">
                      {partnerProfile?.avatar_url ? (
                        <img src={partnerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-bold text-muted-foreground">{partnerInitial}</span>
                      )}
                      {activeTab === "partner" && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border border-card" />
                      )}
                    </div>
                    <span className="truncate max-w-[80px]">{partnerFirstName}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("ai")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === "ai" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <img src={aiAssistantIcon} alt="AI" className="w-5 h-5" />
                    <span>Your AI</span>
                  </button>
                </div>

                <div className="flex-1" />

                <button
                  onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 100); }}
                  className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 hover:bg-muted/80 transition-colors"
                >
                  <Search size={16} className="text-foreground" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {activeTab === "ai" ? (
          <AIChatbot embedded />
        ) : (
        <>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" onClick={() => setSelectedMsg(null)}>
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-sm font-semibold text-foreground mb-1">Start your conversation</p>
              <p className="text-xs text-muted-foreground">Messages are private between you and {partnerFirstName}</p>
            </div>
          )}

          {groupedMessages.map(group => (
            <div key={group.date} className="space-y-3">
              <div className="flex justify-center">
                <span className="text-[10px] font-medium text-muted-foreground bg-card shadow-card px-3 py-1 rounded-full">
                  {formatDateLabel(group.date)}
                </span>
              </div>
              {group.msgs.map(msg => {
                const mine = isMe(msg);
                const msgReactions = getReactionsForMsg(msg.id);
                const repliedMsg = getRepliedMsg(msg.reply_to);
                const isSelected = selectedMsg?.id === msg.id;

                return (
                  <div key={msg.id} className="relative">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${mine ? "justify-end" : "justify-start"} gap-2`}
                      onDoubleClick={(e) => { e.stopPropagation(); setSelectedMsg(msg); }}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedMsg(msg); }}
                    >
                      {!mine && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 self-end overflow-hidden">
                          {partnerProfile?.avatar_url ? (
                            <img src={partnerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground">{partnerInitial}</span>
                          )}
                        </div>
                      )}
                      <div className={`max-w-[75%] relative`}>
                        {/* Reply preview */}
                        {repliedMsg && (
                          <div className={`text-[10px] px-3 py-1.5 rounded-t-xl border-l-2 mb-0.5 ${mine ? "bg-[hsl(100,20%,80%)] border-[hsl(100,20%,55%)]" : "bg-muted border-primary"}`}>
                            <p className="font-semibold text-muted-foreground truncate">
                              {repliedMsg.user_id === user?.id ? "You" : partnerProfile?.display_name || "Partner"}
                            </p>
                            <p className="text-muted-foreground truncate">
                              {repliedMsg.type === "image" ? "📷 Photo" : repliedMsg.message.slice(0, 50)}
                            </p>
                          </div>
                        )}

                        <div className={`${msg.type === "image" ? "" : "px-4 py-3"} ${mine
                          ? `${msg.type === "image" ? "" : "bg-[hsl(100,20%,72%)]"} text-foreground rounded-2xl ${repliedMsg ? "rounded-t-none" : ""} rounded-br-md`
                          : `${msg.type === "image" ? "" : "bg-card shadow-card border border-border"} text-foreground rounded-2xl ${repliedMsg ? "rounded-t-none" : ""} rounded-bl-md`}`}>
                          {msg.type === "image" ? (
                            <div className="rounded-2xl overflow-hidden">
                              <img src={msg.message} alt="Shared photo" className="max-w-full max-h-64 object-cover rounded-2xl" />
                              <p className={`text-[10px] mt-1 px-1 ${mine ? "text-foreground/50" : "text-muted-foreground"}`}>
                                {format(new Date(msg.created_at), "h:mm a")}
                              </p>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                              <p className={`text-[10px] mt-1.5 ${mine ? "text-foreground/50" : "text-muted-foreground"}`}>
                                {format(new Date(msg.created_at), "h:mm a")}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Reactions display */}
                        {msgReactions.length > 0 && (
                          <div className={`flex gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
                            {msgReactions.map(r => (
                              <button
                                key={r.emoji}
                                onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, r.emoji); }}
                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all ${
                                  r.myReaction ? "bg-primary/15 border-primary/30" : "bg-card border-border"
                                }`}
                              >
                                <span>{r.emoji}</span>
                                {r.count > 1 && <span className="text-[10px] text-muted-foreground">{r.count}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Reaction/Reply popup */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 4 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute z-50 ${mine ? "right-0" : "left-10"} -top-14`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="bg-card rounded-2xl shadow-elevated border border-border px-2 py-1.5 flex items-center gap-1">
                            {QUICK_REACTIONS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(msg.id, emoji)}
                                className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-lg transition-colors active:scale-110"
                              >
                                {emoji}
                              </button>
                            ))}
                            <div className="w-px h-6 bg-border mx-0.5" />
                            <button
                              onClick={() => startReply(msg)}
                              className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                            >
                              <Reply size={16} className="text-muted-foreground" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Attachment Menu Overlay */}
        <AnimatePresence>
          {showAttachMenu && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
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
                  <button key={item.label} onClick={() => { setShowAttachMenu(false); item.action(); }}
                    className="flex flex-col items-center gap-1.5">
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

        {/* Reply preview bar */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border bg-card"
            >
              <div className="px-5 py-2 flex items-center gap-3">
                <div className="w-1 h-10 rounded-full bg-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-primary">
                    Replying to {replyTo.user_id === user?.id ? "yourself" : partnerProfile?.display_name || "Partner"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {replyTo.type === "image" ? "📷 Photo" : replyTo.message.slice(0, 60)}
                  </p>
                </div>
                <button onClick={() => setReplyTo(null)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-20 right-5 z-50 bg-card rounded-2xl shadow-elevated border border-border p-3 w-[280px] max-h-[300px] overflow-y-auto"
              >
                <p className="text-[10px] font-semibold text-muted-foreground mb-2">Smileys & People</p>
                <div className="grid grid-cols-8 gap-1 mb-2">
                  {["😀","😂","🥰","😍","😘","😜","🤗","😎","🥺","😢","😤","🤯","🤔","🙄","😴","🤮","👍","👎","❤️","🔥","💯","🎉","✨","💔","🙏","👏","💪","🤝","👀","💕","🥳","😈"].map(e => (
                    <button key={e} onClick={() => { setInput(prev => prev + e); setShowEmojiPicker(false); inputRef.current?.focus(); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-lg active:scale-110 transition-transform">
                      {e}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-2">Animals & Nature</p>
                <div className="grid grid-cols-8 gap-1 mb-2">
                  {["🐶","🐱","🐻","🦋","🌸","🌺","🌈","⭐","🌙","☀️","🍀","🌻","🐝","🦊","🐰","🐥"].map(e => (
                    <button key={e} onClick={() => { setInput(prev => prev + e); setShowEmojiPicker(false); inputRef.current?.focus(); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-lg active:scale-110 transition-transform">
                      {e}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-2">Food & Activities</p>
                <div className="grid grid-cols-8 gap-1">
                  {["🍕","🍔","🍷","🎂","☕","🍿","🎬","🎵","🏖️","✈️","🎁","💐","🛍️","💍","🏠","🚗"].map(e => (
                    <button key={e} onClick={() => { setInput(prev => prev + e); setShowEmojiPicker(false); inputRef.current?.focus(); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-lg active:scale-110 transition-transform">
                      {e}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="px-5 py-3 bg-card border-t border-border relative">
          <input ref={fileRef} type="file" accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" onChange={(e) => { handleImageUpload(e); setShowAttachMenu(false); }} className="hidden" />
          <div className="flex gap-2 items-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { fileRef.current?.removeAttribute("capture"); fileRef.current?.click(); }}
              className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0"
            >
              <Plus size={18} className="text-primary" />
            </motion.button>
            <div className="flex-1 bg-muted rounded-full flex items-center px-4 gap-2 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder={replyTo ? "Write a reply..." : `Message ${partnerProfile?.display_name || "your partner"}...`}
                className="flex-1 h-10 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button onClick={() => { setShowEmojiPicker(prev => !prev); setShowAttachMenu(false); }} className="shrink-0">
                <Smile size={18} className="text-muted-foreground hover:text-primary transition-colors" />
              </button>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => sendMessage()}
              disabled={sending || !input.trim()}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-soft shrink-0 disabled:opacity-50">
              <Send size={16} className="text-primary-foreground" />
            </motion.button>
          </div>
        </div>
        </>
        )}
      </div>
    </PageTransition>
  );
}

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";
import { useLocalStorage, generateId, type ChatMessage } from "@/lib/store";
import PageTransition from "@/components/PageTransition";
import { format } from "date-fns";

export default function ChatPage() {
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>("lovelist-chat", []);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg: ChatMessage = {
      id: generateId(),
      sender: "me",
      message: input.trim(),
      timestamp: new Date().toISOString(),
      type: "text",
    };
    setMessages([...messages, msg]);
    setInput("");
  };

  return (
    <PageTransition>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="px-5 pt-10 pb-3 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">Chat</h1>
          <p className="text-xs text-muted-foreground">Your private couple space 💕</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-sm text-muted-foreground">Start your private conversation</p>
            </div>
          )}
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                msg.sender === "me"
                  ? "love-gradient text-primary-foreground rounded-br-md"
                  : "bg-card shadow-card text-foreground rounded-bl-md"
              }`}>
                <p className="text-sm">{msg.message}</p>
                <p className={`text-[10px] mt-1 ${
                  msg.sender === "me" ? "text-primary-foreground/60" : "text-muted-foreground"
                }`}>
                  {format(new Date(msg.timestamp), "h:mm a")}
                </p>
              </div>
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-3 border-t border-border bg-card">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 h-11 px-4 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={sendMessage}
              className="w-11 h-11 rounded-full love-gradient flex items-center justify-center shadow-soft"
            >
              <Send size={16} className="text-primary-foreground" />
            </motion.button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

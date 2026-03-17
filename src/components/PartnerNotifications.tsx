import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MessageCircle, Heart, ClipboardList, ShoppingCart, CalendarDays, Camera } from "lucide-react";
import { notifyPartnerAction } from "@/lib/notificationSound";

const MOOD_LABELS: Record<string, string> = {
  happy: "Happy 😊",
  excited: "Excited 🤩",
  neutral: "Loved 🥰",
  calm: "Calm 😌",
  grateful: "Grateful 🙏",
  silly: "Silly 🤪",
  tired: "Tired 😵‍💫",
  sad: "Sad 😢",
  stressed: "Stressed 😫",
  anxious: "Anxious 😰",
  angry: "Angry 😠",
  furious: "Furious 🤬",
  lonely: "Lonely 🥺",
  hopeful: "Hopeful 🌟",
  confused: "Confused 😕",
};

export default function PartnerNotifications() {
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const location = useLocation();
  const locationRef = useRef(location.pathname);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!partnerPair || !user) return;

    const channel = supabase
      .channel("partner-notifications")
      // ─── Chat Messages ───
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => {
          const msg = payload.new as { user_id: string; message: string; type: string };
          if (msg.user_id !== user.id && locationRef.current !== "/chat") {
            const preview = msg.type === "image" ? "📷 Sent a photo" : msg.message.length > 60 ? msg.message.slice(0, 60) + "…" : msg.message;
            notifyPartnerAction();
            toast("New message 💬", {
              description: preview,
              icon: <MessageCircle size={16} className="text-primary" />,
              duration: 5000,
            });
          }
        }
      )
      // ─── Mood Logs (INSERT) ───
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mood_logs", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => {
          const log = payload.new as { user_id: string; mood: string };
          if (log.user_id !== user.id) {
            const label = MOOD_LABELS[log.mood] || log.mood;
            notifyPartnerAction();
            toast(`Partner is feeling ${label}`, {
              description: "Tap to check in on them ❤️",
              icon: <Heart size={16} className="text-primary" />,
              duration: 5000,
            });
          }
        }
      )
      // ─── Mood Logs (UPDATE) ───
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mood_logs", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => {
          const log = payload.new as { user_id: string; mood: string };
          if (log.user_id !== user.id) {
            const label = MOOD_LABELS[log.mood] || log.mood;
            notifyPartnerAction();
            toast(`Partner updated mood to ${label}`, {
              icon: <Heart size={16} className="text-primary" />,
              duration: 5000,
            });
          }
        }
      )
      // ─── Chores (INSERT) ───
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chores", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => {
          const chore = payload.new as { user_id: string; title: string };
          if (chore.user_id !== user.id && locationRef.current !== "/chores") {
            notifyPartnerAction();
            toast("New chore added 🧹", {
              description: chore.title,
              icon: <ClipboardList size={16} className="text-primary" />,
              duration: 4000,
            });
          }
        }
      )
      // ─── Chores (UPDATE — completed) ───
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chores", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => {
          const chore = payload.new as { user_id: string; title: string; is_completed: boolean };
          const old = payload.old as { is_completed: boolean };
          if (chore.user_id !== user.id && chore.is_completed && !old.is_completed) {
            notifyPartnerAction();
            toast("Chore completed ✅", {
              description: chore.title,
              icon: <ClipboardList size={16} className="text-primary" />,
              duration: 4000,
            });
          }
        }
      )
      // ─── Grocery Items (INSERT) ───
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "grocery_items", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => {
          const item = payload.new as { user_id: string; name: string };
          if (item.user_id !== user.id && locationRef.current !== "/lists") {
            notifyPartnerAction();
            toast("Item added to list 🛒", {
              description: item.name,
              icon: <ShoppingCart size={16} className="text-primary" />,
              duration: 4000,
            });
          }
        }
      )
      // ─── Grocery Items (UPDATE — checked off) ───
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "grocery_items", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => {
          const item = payload.new as { user_id: string; name: string; is_checked: boolean };
          const old = payload.old as { is_checked: boolean };
          if (item.user_id !== user.id && item.is_checked && !old.is_checked && locationRef.current !== "/lists") {
            toast("Item checked off ✓", {
              description: item.name,
              icon: <ShoppingCart size={16} className="text-primary" />,
              duration: 3000,
            });
          }
        }
      )
      // ─── Calendar Events (INSERT) ───
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calendar_events", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => {
          const evt = payload.new as { user_id: string; title: string };
          if (evt.user_id !== user.id && locationRef.current !== "/calendar") {
            toast("New event added 📅", {
              description: evt.title,
              icon: <CalendarDays size={16} className="text-primary" />,
              duration: 4000,
            });
          }
        }
      )
      // ─── Memories (INSERT) ───
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "memories", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => {
          const mem = payload.new as { user_id: string; title: string };
          if (mem.user_id !== user.id) {
            toast("New memory added 📸", {
              description: mem.title,
              icon: <Camera size={16} className="text-primary" />,
              duration: 5000,
            });
          }
        }
      )
      // ─── Message Reactions ───
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions", filter: `partner_pair=eq.${partnerPair}` },
        (payload) => {
          const reaction = payload.new as { user_id: string; emoji: string };
          if (reaction.user_id !== user.id && locationRef.current !== "/chat") {
            toast(`Partner reacted ${reaction.emoji}`, {
              icon: <MessageCircle size={16} className="text-primary" />,
              duration: 3000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerPair, user]);

  return null;
}

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MessageCircle, Heart } from "lucide-react";

const MOOD_LABELS: Record<string, string> = {
  happy: "Happy 😊",
  tired: "Tired 😵‍💫",
  sad: "Sad 😢",
  angry: "Stressed 😫",
  neutral: "Loved 🥰",
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
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `partner_pair=eq.${partnerPair}`,
        },
        (payload) => {
          const msg = payload.new as { user_id: string; message: string };
          if (msg.user_id !== user.id && locationRef.current !== "/chat") {
            toast("New message from your partner 💬", {
              description: msg.message.length > 60 ? msg.message.slice(0, 60) + "…" : msg.message,
              icon: <MessageCircle size={16} className="text-primary" />,
              duration: 5000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mood_logs",
          filter: `partner_pair=eq.${partnerPair}`,
        },
        (payload) => {
          const log = payload.new as { user_id: string; mood: string };
          if (log.user_id !== user.id) {
            const label = MOOD_LABELS[log.mood] || log.mood;
            toast(`Your partner is feeling ${label}`, {
              description: "Tap to check in on them ❤️",
              icon: <Heart size={16} className="text-primary" />,
              duration: 5000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mood_logs",
          filter: `partner_pair=eq.${partnerPair}`,
        },
        (payload) => {
          const log = payload.new as { user_id: string; mood: string };
          if (log.user_id !== user.id) {
            const label = MOOD_LABELS[log.mood] || log.mood;
            toast(`Your partner updated their mood to ${label}`, {
              icon: <Heart size={16} className="text-primary" />,
              duration: 5000,
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

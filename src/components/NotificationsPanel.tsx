import { useState, useEffect } from "react";
import { Bell, X, Check, MessageCircle, Heart, Calendar, Trash2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const typeIcons: Record<string, typeof Heart> = {
  mood: Heart,
  chat: MessageCircle,
  calendar: Calendar,
  overdue: Clock,
};

export function useNotificationCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetch = () => {
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .then(({ count: c }) => setCount(c ?? 0));
    };
    fetch();

    const channel = supabase
      .channel("notif-count-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return count;
}

export default function NotificationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[]);
        setLoading(false);
      });
  }, [open, user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const clearAll = async () => {
    if (!user) return;
    // Delete all read notifications to clean up, mark unread as read
    await supabase.from("notifications").delete().eq("user_id", user.id).eq("is_read", true);
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
    setNotifications([]);
  };

  const handleTap = async (notif: Notification) => {
    if (!notif.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    if (notif.link) {
      onClose();
      navigate(notif.link);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => { if (info.offset.y > 100 || info.velocity.y > 500) onClose(); }}
            className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-card rounded-t-3xl z-[60] max-h-[75vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-muted" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-foreground">Notifications</p>
                {unreadCount > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] font-medium text-primary px-2 py-1">
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="w-8 h-8 rounded-full flex items-center justify-center">
                    <Trash2 size={14} className="text-muted-foreground" />
                  </button>
                )}
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Bell size={32} className="text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                  <p className="text-[10px] text-muted-foreground">Activity from your partner will show up here</p>
                </div>
              ) : (
                notifications.map(notif => {
                  const Icon = typeIcons[notif.type] || Bell;
                  return (
                    <motion.button
                      key={notif.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleTap(notif)}
                      className={`w-full flex items-start gap-3 px-3 py-3 rounded-2xl text-left transition-colors ${
                        notif.is_read ? "bg-transparent" : "bg-primary/5"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        notif.type === "mood" ? "bg-secondary/15" : notif.type === "chat" ? "bg-primary/15" : notif.type === "overdue" ? "bg-destructive/15" : "bg-muted"
                      }`}>
                        <Icon size={16} className={
                          notif.type === "mood" ? "text-secondary" : notif.type === "chat" ? "text-primary" : notif.type === "overdue" ? "text-destructive" : "text-muted-foreground"
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-tight ${notif.is_read ? "text-foreground/70" : "text-foreground font-semibold"}`}>
                          {notif.title}
                        </p>
                        {notif.message && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.message}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNowStrict(new Date(notif.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </motion.button>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

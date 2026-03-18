import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Heart, Bell, Palette, Lock, HelpCircle, LogOut, Link2, Camera, Loader2, X, Moon, Sun, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";

export function useProfileDrawer() {
  const [open, setOpen] = useState(false);
  return { open, openDrawer: () => setOpen(true), closeDrawer: () => setOpen(false) };
}

export default function ProfileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url, partner_id").eq("user_id", user.id).maybeSingle()
      .then(async ({ data }) => {
        const name = data?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "You";
        setDisplayName(name);
        setAvatarUrl(data?.avatar_url || user.user_metadata?.avatar_url || null);
        if (data?.partner_id) {
          const { data: partner } = await supabase.from("profiles").select("display_name").eq("id", data.partner_id).single();
          if (partner) setPartnerName(partner.display_name);
        }
      });
  }, [user, open]);

  const navItems = [
    { icon: User, label: "Personal Info", action: () => { onClose(); navigate("/profile"); } },
    { icon: Heart, label: "Partner Connection", action: () => { onClose(); navigate("/connect"); } },
    { icon: Bell, label: "Notifications", action: () => { onClose(); navigate("/profile"); } },
    { icon: Palette, label: "Theme & Appearance", action: () => { onClose(); navigate("/profile"); } },
    { icon: Lock, label: "Privacy & Security", action: () => { onClose(); navigate("/profile"); } },
    { icon: HelpCircle, label: "Help & Support", action: () => { onClose(); navigate("/profile"); } },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 z-[70]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 w-[280px] bg-card z-[70] flex flex-col shadow-elevated"
          >
            {/* Header */}
            <div className="px-5 pt-12 pb-5 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profile</span>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-muted overflow-hidden flex items-center justify-center border-2 border-border shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">👩</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
                  {partnerName && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Link2 size={10} /> {partnerName}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={async () => { onClose(); localStorage.removeItem("lovelist-setup-done"); localStorage.removeItem("lovelist-onboarding-done"); localStorage.removeItem("lovelist-app-mode"); await signOut(); navigate("/auth"); }}
                className="w-full flex items-center gap-2 mt-4 px-3 py-2.5 rounded-xl hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={15} className="text-destructive" />
                <span className="text-sm font-medium text-destructive">Sign Out</span>
              </button>
            </div>

            {/* Nav items */}
            <div className="flex-1 overflow-y-auto py-3 px-3">
              {navItems.map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <item.icon size={15} className="text-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1 text-left">{item.label}</span>
                  <ChevronRight size={14} className="text-muted-foreground" />
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border">
              <button
                onClick={async () => { onClose(); localStorage.removeItem("lovelist-setup-done"); localStorage.removeItem("lovelist-onboarding-done"); localStorage.removeItem("lovelist-app-mode"); await signOut(); navigate("/auth"); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={15} className="text-destructive" />
                <span className="text-sm font-medium text-destructive">Sign Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

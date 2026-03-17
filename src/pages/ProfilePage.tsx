import { useState, useEffect, useRef } from "react";
import { Heart, User, ChevronRight, Bell, Lock, HelpCircle, Palette, Link2, LogOut, Camera, Loader2, X, Check, Moon, Sun, ChevronLeft, UserMinus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { Monitor } from "lucide-react";

type SheetType = "personal" | "notifications" | "theme" | "remove-partner" | null;

function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 z-[60]" onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed bottom-20 left-0 right-0 max-w-lg mx-auto bg-card rounded-t-3xl z-[60] max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X size={16} className="text-muted-foreground" />
              </button>
              <p className="text-sm font-bold text-foreground">{title}</p>
              <div className="w-8" />
            </div>
            <div className="px-5 py-4 pb-10 overflow-y-auto flex-1">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ThemeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const options: { value: "light" | "dark" | "system"; label: string; icon: typeof Sun; desc: string }[] = [
    { value: "light", label: "Light", icon: Sun, desc: "Warm & bright" },
    { value: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
    { value: "system", label: "System", icon: Monitor, desc: "Match your device" },
  ];
  return (
    <BottomSheet open={open} onClose={onClose} title="Theme & Appearance">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground mb-1">Choose your preferred look</p>
        {options.map(t => (
          <button key={t.value} onClick={() => setTheme(t.value)}
            className={`w-full flex items-center gap-3 bg-muted rounded-xl px-4 py-3 border transition-colors ${theme === t.value ? "border-primary" : "border-border"}`}>
            <div className="w-9 h-9 rounded-xl bg-card flex items-center justify-center">
              <t.icon size={16} className="text-foreground" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </div>
            {theme === t.value && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check size={12} className="text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);

  // Personal info edit state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, partner_id, phone")
        .eq("user_id", user.id)
        .single();
      if (data) {
        const profileName = data.display_name;
        const metaName = user.user_metadata?.full_name || user.user_metadata?.display_name || user.user_metadata?.name;
        const name = (profileName && profileName.includes(" ")) ? profileName : (metaName || profileName || user.email?.split("@")[0] || "You");
        setDisplayName(name);
        setPhone(data.phone || "");
        setAvatarUrl(data.avatar_url || user.user_metadata?.avatar_url || null);
        setPartnerId(data.partner_id);
        if (data.partner_id) {
          const { data: partner } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", data.partner_id)
            .single();
          if (partner) setPartnerName(partner.display_name);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB allowed", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
      if (updateErr) throw updateErr;
      setAvatarUrl(urlWithCacheBust);
      toast({ title: "Photo updated! 📸" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const openPersonalInfo = () => {
    setEditName(displayName);
    setEditPhone(phone);
    setActiveSheet("personal");
  };

  const savePersonalInfo = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: editName.trim(), phone: editPhone.trim() || null })
        .eq("user_id", user.id);
      if (error) throw error;
      setDisplayName(editName.trim());
      setPhone(editPhone.trim());
      setActiveSheet(null);
      toast({ title: "Profile updated! ✨" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const [removingPartner, setRemovingPartner] = useState(false);
  const handleRemovePartner = async () => {
    if (!partnerId) return;
    setRemovingPartner(true);
    const { data, error } = await supabase.rpc("remove_partner", { partner_profile_id: partnerId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const result = data as any;
      if (result?.success) {
        toast({ title: "Partner removed" });
        setPartnerName(null);
        setPartnerId(null);
        setActiveSheet(null);
      } else {
        toast({ title: "Failed", description: result?.error || "Unknown error", variant: "destructive" });
      }
    }
    setRemovingPartner(false);
  };

  const handleSettingTap = (label: string) => {
    switch (label) {
      case "Personal Information":
        openPersonalInfo();
        break;
      case "Notifications":
        setActiveSheet("notifications");
        break;
      case "Couple Connection":
        navigate("/connect");
        break;
      case "Remove Partner":
        setActiveSheet("remove-partner");
        break;
      case "Theme & Appearance":
        setActiveSheet("theme");
        break;
      default:
        toast({ title: "Coming soon", description: `${label} will be available in a future update` });
    }
  };

  const settingsSections = [
    {
      title: "Account Settings",
      items: [
        { icon: User, label: "Personal Information", sub: "Name, Phone" },
        { icon: Bell, label: "Notifications", sub: "Reminders & Alerts" },
        { icon: Heart, label: "Couple Connection", sub: partnerName ? `Connected to ${partnerName}` : "Invite your partner" },
        ...(partnerId ? [{ icon: UserMinus, label: "Remove Partner", sub: `Disconnect from ${partnerName || "partner"}` }] : []),
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Palette, label: "Theme & Appearance" },
        { icon: Lock, label: "Privacy & Security" },
        { icon: HelpCircle, label: "Help & Support" },
      ],
    },
  ];

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="w-9" />
          <h1 className="text-base font-bold text-foreground">Profile</h1>
          <div className="w-9" />
        </div>

        {/* Avatar with upload */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border overflow-hidden relative group">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">👩</span>
              )}
              <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                {uploading ? <Loader2 size={20} className="text-background animate-spin" /> : <Camera size={20} className="text-background" />}
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            {partnerName && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-success border-2 border-card flex items-center justify-center">
                <Heart size={10} className="text-success-foreground" fill="white" />
              </div>
            )}
          </div>
          <h2 className="text-base font-bold text-foreground">{displayName.toUpperCase()}</h2>
          {partnerName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Link2 size={10} /> Connected to {partnerName}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-0.5">{user?.email}</p>
        </div>

        {/* Settings Sections */}
        {settingsSections.map(section => (
          <div key={section.title} className="mb-5">
            <p className="text-xs font-semibold text-muted-foreground mb-2">{section.title}</p>
            <div className="space-y-1">
              {section.items.map(item => (
                <button key={item.label} onClick={() => handleSettingTap(item.label)}
                  className="w-full bg-card rounded-2xl px-4 py-3.5 shadow-card border border-border flex items-center gap-3 active:scale-[0.98] transition-transform">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <item.icon size={16} className="text-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    {item.sub && <p className="text-[10px] text-muted-foreground">{item.sub}</p>}
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Sign Out */}
        <button onClick={handleSignOut}
          className="w-full bg-card rounded-2xl px-4 py-3.5 shadow-card border border-border flex items-center gap-3 mt-2 active:scale-[0.98] transition-transform">
          <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <LogOut size={16} className="text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">Sign Out</p>
        </button>

        <p className="text-center text-[10px] text-muted-foreground mt-5 mb-2">
          LoveList v1.0.4 • Made with Love
        </p>
      </div>

      {/* Personal Information Sheet */}
      <BottomSheet open={activeSheet === "personal"} onClose={() => setActiveSheet(null)} title="Personal Information">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Display Name</label>
            <input
              value={editName} onChange={e => setEditName(e.target.value)}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
            <div className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm text-muted-foreground border border-border">
              {user?.email}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed here</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Phone</label>
            <input
              value={editPhone} onChange={e => setEditPhone(e.target.value)}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="+1 (555) 000-0000"
              type="tel"
            />
          </div>
          <button
            onClick={savePersonalInfo} disabled={saving || !editName.trim()}
            className="w-full love-gradient text-primary-foreground font-semibold py-3 rounded-xl mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save Changes
          </button>
        </div>
      </BottomSheet>

      {/* Notifications Sheet */}
      <BottomSheet open={activeSheet === "notifications"} onClose={() => setActiveSheet(null)} title="Notifications">
        <div className="space-y-3">
          {[
            { label: "Daily Reminders", desc: "Get reminded of tasks & events", default: true },
            { label: "Partner Activity", desc: "When your partner adds or completes items", default: true },
            { label: "Mood Check-ins", desc: "Evening mood reminders", default: false },
            { label: "Weekly Summary", desc: "Get a recap every Sunday", default: false },
          ].map(n => (
            <div key={n.label} className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{n.label}</p>
                <p className="text-[10px] text-muted-foreground">{n.desc}</p>
              </div>
              <Switch defaultChecked={n.default} />
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Notification preferences are stored locally
          </p>
        </div>
      </BottomSheet>

      {/* Theme Sheet */}
      <ThemeSheet open={activeSheet === "theme"} onClose={() => setActiveSheet(null)} />

      {/* Remove Partner Confirmation */}
      <BottomSheet open={activeSheet === "remove-partner"} onClose={() => setActiveSheet(null)} title="Remove Partner">
        <div className="flex flex-col items-center py-4 gap-3">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <UserMinus size={28} className="text-destructive" />
          </div>
          <p className="text-sm font-bold text-foreground">Disconnect from {partnerName}?</p>
          <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-xs">
            This will unlink your accounts. Shared data (chores, lists, events) will remain but won't sync anymore. You can reconnect anytime with a new invite code.
          </p>
          <button
            onClick={handleRemovePartner}
            disabled={removingPartner}
            className="w-full h-11 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {removingPartner ? <Loader2 size={16} className="animate-spin" /> : "Remove Partner"}
          </button>
          <button onClick={() => setActiveSheet(null)} className="text-xs text-muted-foreground font-medium">
            Cancel
          </button>
        </div>
      </BottomSheet>
    </PageTransition>
  );
}

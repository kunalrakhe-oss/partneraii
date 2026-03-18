import { useState, useEffect, useRef } from "react";
import { Heart, User, ChevronRight, Bell, Lock, HelpCircle, Palette, Link2, LogOut, Camera, Loader2, X, Check, Moon, Sun, ChevronLeft, UserMinus, Download, Mic, LayoutGrid, GripVertical, Crown, CreditCard, KeyRound, Globe, Users } from "lucide-react";

import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { Monitor, Volume2, Vibrate, Maximize } from "lucide-react";
import { getNotificationPrefs, setNotificationPrefs, playNotificationSound } from "@/lib/notificationSound";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useWakeWord } from "@/hooks/useWakeWord";
import { useLayoutPreferences, ALL_NAV_TABS, ALL_HOME_WIDGETS, type NavTabId, type HomeWidgetId } from "@/hooks/useLayoutPreferences";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGE_OPTIONS } from "@/lib/translations";

type SheetType = "personal" | "notifications" | "theme" | "remove-partner" | "customize" | "language" | "app-mode" | null;

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
            className="fixed bottom-on-nav left-0 right-0 max-w-lg mx-auto bg-card rounded-t-3xl z-[60] max-h-[80vh] flex flex-col"
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

function NotificationSettingsContent() {
  const [prefs, setPrefs] = useState(getNotificationPrefs);

  const toggleSound = () => {
    const next = !prefs.soundEnabled;
    setNotificationPrefs({ soundEnabled: next });
    setPrefs(p => ({ ...p, soundEnabled: next }));
    if (next) playNotificationSound();
  };

  const toggleVibration = () => {
    const next = !prefs.vibrationEnabled;
    setNotificationPrefs({ vibrationEnabled: next });
    setPrefs(p => ({ ...p, vibrationEnabled: next }));
    if (next && navigator.vibrate) navigator.vibrate([100, 50, 100]);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground mb-1">Sound & Vibration</p>
      <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <Volume2 size={16} className="text-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Notification Sound</p>
            <p className="text-[10px] text-muted-foreground">Play a chime for partner updates</p>
          </div>
        </div>
        <Switch checked={prefs.soundEnabled} onCheckedChange={toggleSound} />
      </div>
      <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <Vibrate size={16} className="text-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Vibration</p>
            <p className="text-[10px] text-muted-foreground">Vibrate on notifications</p>
          </div>
        </div>
        <Switch checked={prefs.vibrationEnabled} onCheckedChange={toggleVibration} />
      </div>

      <p className="text-xs font-semibold text-muted-foreground mt-4 mb-1">Notification Types</p>
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
        Preferences are stored locally on this device
      </p>
    </div>
  );
}

function CustomizeLayoutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { navTabs, homeWidgets, toggleNavTab, toggleHomeWidget, setNavTabs, setHomeWidgets, resetDefaults } = useLayoutPreferences();

  // Local ordered lists for reorder (includes all items, active or not, in display order)
  const allNavIds = ALL_NAV_TABS.map(t => t.id);
  const allWidgetIds = ALL_HOME_WIDGETS.map(w => w.id);

  // Build ordered list: active items in current order, then inactive items
  const navOrder = [
    ...navTabs.filter(id => allNavIds.includes(id)),
    ...allNavIds.filter(id => !navTabs.includes(id)),
  ];
  const widgetOrder = [
    ...homeWidgets.filter(id => allWidgetIds.includes(id)),
    ...allWidgetIds.filter(id => !homeWidgets.includes(id)),
  ];

  const navLabel = (id: string) => ALL_NAV_TABS.find(t => t.id === id)?.label || id;
  const widgetLabel = (id: string) => ALL_HOME_WIDGETS.find(w => w.id === id)?.label || id;

  const handleNavReorder = (newOrder: string[]) => {
    const activeInOrder = newOrder.filter(id => navTabs.includes(id as any)) as NavTabId[];
    setNavTabs(activeInOrder);
  };

  const handleWidgetReorder = (newOrder: string[]) => {
    const activeInOrder = newOrder.filter(id => homeWidgets.includes(id as any)) as HomeWidgetId[];
    setHomeWidgets(activeInOrder);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Customize Layout">
      <div className="space-y-5">
        {/* Nav Bar Tabs */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Navigation Bar</p>
          <p className="text-[10px] text-muted-foreground mb-3">Drag to reorder • Toggle to show/hide (Home is always shown)</p>
          <Reorder.Group axis="y" values={navOrder} onReorder={handleNavReorder} className="space-y-1.5">
            {navOrder.map(id => {
              const isActive = navTabs.includes(id);
              const isHome = id === "home";
              return (
                <Reorder.Item
                  key={id}
                  value={id}
                  dragListener={!isHome}
                  className={`flex items-center gap-2 bg-muted rounded-xl px-3 py-3 border transition-colors cursor-grab active:cursor-grabbing ${
                    isActive ? "border-primary" : "border-border"
                  } ${isHome ? "opacity-60 cursor-default" : ""}`}
                >
                  <GripVertical size={14} className="text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium text-foreground flex-1">{navLabel(id)}</p>
                  <button
                    onClick={() => !isHome && toggleNavTab(id)}
                    disabled={isHome}
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      isActive ? "bg-primary" : "bg-border"
                    }`}
                  >
                    {isActive && <Check size={12} className="text-primary-foreground" />}
                  </button>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </div>

        {/* Home Screen Widgets */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Home Screen Widgets</p>
          <p className="text-[10px] text-muted-foreground mb-3">Drag to reorder • Toggle to show/hide</p>
          <Reorder.Group axis="y" values={widgetOrder} onReorder={handleWidgetReorder} className="space-y-1.5">
            {widgetOrder.map(id => {
              const isActive = homeWidgets.includes(id);
              return (
                <Reorder.Item
                  key={id}
                  value={id}
                  className={`flex items-center gap-2 bg-muted rounded-xl px-3 py-3 border transition-colors cursor-grab active:cursor-grabbing ${
                    isActive ? "border-primary" : "border-border"
                  }`}
                >
                  <GripVertical size={14} className="text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium text-foreground flex-1">{widgetLabel(id)}</p>
                  <button
                    onClick={() => toggleHomeWidget(id)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      isActive ? "bg-primary" : "bg-border"
                    }`}
                  >
                    {isActive && <Check size={12} className="text-primary-foreground" />}
                  </button>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </div>

        {/* Reset */}
        <button
          onClick={resetDefaults}
          className="w-full text-center text-xs font-medium text-muted-foreground py-2"
        >
          Reset to defaults
        </button>
      </div>
    </BottomSheet>
  );
}

function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language, setLanguage } = useLanguage();
  return (
    <BottomSheet open={open} onClose={onClose} title="Language / भाषा">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground mb-1">Choose your preferred language</p>
        {LANGUAGE_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => { setLanguage(opt.value); onClose(); }}
            className={`w-full flex items-center gap-3 bg-muted rounded-xl px-4 py-3 border transition-colors ${language === opt.value ? "border-primary" : "border-border"}`}>
            <div className="w-9 h-9 rounded-xl bg-card flex items-center justify-center">
              <Globe size={16} className="text-foreground" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-medium text-foreground">{opt.nativeLabel}</p>
              <p className="text-[10px] text-muted-foreground">{opt.label}</p>
            </div>
            {language === opt.value && (
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
  const { tier, subscribed, accessCodeActive, applyAccessCode, clearAccessCode, refreshSubscription } = useSubscriptionContext();
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const { isSupported: fullscreenSupported, isFullscreen, toggleFullscreen } = useFullscreen();
  const { isSupported: voiceSupported, enabled: voiceEnabled, toggleEnabled: toggleVoice } = useWakeWord();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Prompt-disable toggles
  
  const [fullscreenPromptDisabled, setFullscreenPromptDisabled] = useState(() => localStorage.getItem("lovelist-fullscreen-prompt-disabled") === "true");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [appMode, setAppMode] = useState<string>("couple");

  // Personal info edit state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editBirthday, setEditBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [birthday, setBirthday] = useState("");
  const [saving, setSaving] = useState(false);

  const isSingle = appMode === "single";

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, partner_id, phone, gender, birthday, app_mode")
        .eq("user_id", user.id)
        .single();
      if (data) {
        const profileName = data.display_name;
        const metaName = user.user_metadata?.full_name || user.user_metadata?.display_name || user.user_metadata?.name;
        const name = (profileName && profileName.includes(" ")) ? profileName : (metaName || profileName || user.email?.split("@")[0] || "You");
        setDisplayName(name);
        setPhone(data.phone || "");
        setAvatarUrl(data.avatar_url || user.user_metadata?.avatar_url || null);
        setGender((data as any).gender || "");
        setBirthday((data as any).birthday || "");
        setAppMode((data as any).app_mode || "couple");
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
    setEditGender(gender);
    setEditBirthday(birthday);
    setActiveSheet("personal");
  };

  const savePersonalInfo = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: editName.trim(),
          phone: editPhone.trim() || null,
          gender: editGender.trim() || null,
          birthday: editBirthday || null,
        } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      setDisplayName(editName.trim());
      setPhone(editPhone.trim());
      setGender(editGender.trim());
      setBirthday(editBirthday);
      setActiveSheet(null);
      toast({ title: "Profile updated! ✨" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem("lovelist-setup-done");
    localStorage.removeItem("lovelist-onboarding-done");
    localStorage.removeItem("lovelist-app-mode");
    await signOut();
  };

  const [removingPartner, setRemovingPartner] = useState(false);
  const handleRemovePartner = async () => {
    if (!partnerId || !user) return;
    setRemovingPartner(true);
    const { data, error } = await supabase.rpc("remove_partner", { partner_profile_id: partnerId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const result = data as any;
      if (result?.success) {
        await supabase.from("profiles").update({ app_mode: "single" }).eq("user_id", user.id);
        toast({ title: "Partner removed", description: "Switched to single mode" });
        setPartnerName(null);
        setPartnerId(null);
        setActiveSheet(null);
      } else {
        toast({ title: "Failed", description: result?.error || "Unknown error", variant: "destructive" });
      }
    }
    setRemovingPartner(false);
  };

  const handleSettingTap = (key: string) => {
    switch (key) {
      case "personal-info":
        openPersonalInfo();
        break;
      case "notifications":
        setActiveSheet("notifications");
        break;
      case "partner-profile":
      case "couple-connection":
        navigate("/couple");
        break;
      case "remove-partner":
        setActiveSheet("remove-partner");
        break;
      case "switch-to-couple":
        // Switch to couple mode and navigate to partner connect
        supabase.from("profiles").update({ app_mode: "couple" } as any).eq("user_id", user!.id).then(() => {
          setAppMode("couple");
          navigate("/connect");
        });
        break;
      case "app-mode":
        setActiveSheet("app-mode");
        break;
      case "theme":
        setActiveSheet("theme");
        break;
      case "fullscreen":
        toggleFullscreen();
        break;
      case "voice-assistant":
        toggleVoice(!voiceEnabled);
        toast({ title: !voiceEnabled ? t("profile.voiceEnabled") : t("profile.voiceDisabled"), description: !voiceEnabled ? t("profile.sayHeyLove") : undefined });
        break;
      case "customize-layout":
        setActiveSheet("customize");
        break;
      case "language":
        setActiveSheet("language");
        break;
      case "subscription":
        if (subscribed) {
          (async () => {
            try {
              const { data, error } = await supabase.functions.invoke("customer-portal");
              if (error) throw error;
              if (data?.url) window.open(data.url, "_blank");
            } catch (e: any) {
              toast({ title: "Error", description: e.message, variant: "destructive" });
            }
          })();
        } else {
          navigate("/upgrade");
        }
        break;
      case "enter-access-code":
        setShowAccessCode(true);
        break;
      case "remove-access-code":
        clearAccessCode();
        refreshSubscription();
        toast({ title: t("profile.accessCodeRemoved") });
        break;
      default:
        toast({ title: t("common.comingSoon") });
    }
  };

  const tierLabel = tier === "premium" ? t("upgrade.premium") : tier === "pro" ? t("upgrade.pro") : t("upgrade.free");
  const tierSub = accessCodeActive
    ? t("profile.premiumAccessCode")
    : subscribed
      ? `${tierLabel} ${t("profile.planActive")}`
      : t("profile.freePlan");

  const settingsSections = [
    {
      title: t("profile.accountSettings"),
      items: [
        { key: "personal-info", icon: User, label: t("profile.personalInfo"), sub: t("profile.namePhone") },
        { key: "app-mode", icon: Users, label: "App Mode", sub: isSingle ? "Me Mode (Solo)" : "We Mode (Couple)" },
        { key: "notifications", icon: Bell, label: t("profile.notifications"), sub: t("profile.remindersAlerts") },
        // Show partner profile for couple mode, or "Switch to Couple Mode" for singles
        ...(isSingle
          ? [{ key: "switch-to-couple", icon: Users, label: "Switch to Couple Mode", sub: "Connect with a partner" }]
          : [
            { key: "partner-profile", icon: Heart, label: t("profile.partnerProfile"), sub: partnerName ? `${t("profile.connectedTo")} ${partnerName}` : t("profile.invitePartner") },
            ...(partnerId ? [{ key: "remove-partner", icon: UserMinus, label: t("profile.removePartner"), sub: `${t("profile.disconnectFrom")} ${partnerName || "partner"}` }] : []),
          ]
        ),
      ],
    },
    {
      title: t("profile.subscription"),
     items: [
        { key: "subscription", icon: Crown, label: t("profile.subscriptionBilling"), sub: tierSub },
        { key: accessCodeActive ? "remove-access-code" : "enter-access-code", icon: KeyRound, label: accessCodeActive ? t("profile.removeAccessCode") : t("profile.enterAccessCode"), sub: accessCodeActive ? t("profile.premiumUnlocked") : t("profile.haveCode") },
      ],
    },
    {
      title: t("profile.preferences"),
      items: [
        { key: "theme", icon: Palette, label: t("profile.themeAppearance") },
        { key: "customize-layout", icon: LayoutGrid, label: t("profile.customizeLayout"), sub: t("profile.homeWidgetsNav") },
        { key: "language", icon: Globe, label: t("profile.language"), sub: localStorage.getItem("lovelist-language") === "hi" ? "हिन्दी" : "English" },
        ...(voiceSupported ? [{ key: "voice-assistant", icon: Mic, label: t("profile.voiceAssistant"), sub: voiceEnabled ? t("profile.heyLoveActive") : t("profile.sayHeyLove") }] : []),
        ...(fullscreenSupported ? [{ key: "fullscreen", icon: Maximize, label: t("profile.fullscreenMode"), sub: isFullscreen ? t("profile.currentlyFullscreen") : t("profile.hideBrowserBar"), toggle: true, toggleKey: "fullscreen" as const }] : []),
        
        { key: "privacy", icon: Lock, label: t("profile.privacySecurity") },
        { key: "help", icon: HelpCircle, label: t("profile.helpSupport") },
      ],
    },
  ];

  return (
    <PageTransition>
      <div className="px-5 pb-6">
        <div className="sticky top-0 z-20 bg-background -mx-5 px-5 pt-10 pb-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ChevronLeft size={18} className="text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground">{t("profile.profile")}</h1>
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <X size={16} className="text-muted-foreground" />
          </button>
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
              <Link2 size={10} /> {t("profile.connectedTo")} {partnerName}
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
                <button key={(item as any).key || item.label} onClick={() => handleSettingTap((item as any).key)}
                  className="w-full bg-card rounded-2xl px-4 py-3.5 shadow-card border border-border flex items-center gap-3 active:scale-[0.98] transition-transform">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <item.icon size={16} className="text-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    {item.sub && <p className="text-[10px] text-muted-foreground">{item.sub}</p>}
                    {(item as any).toggle && (
                      <div className="flex items-center gap-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={
                            (item as any).toggleKey === "install" ? !installPromptDisabled
                            : !fullscreenPromptDisabled
                          }
                          onCheckedChange={(checked) => {
                            if ((item as any).toggleKey === "install") {
                              localStorage.setItem("lovelist-install-prompt-disabled", checked ? "false" : "true");
                              setInstallPromptDisabled(!checked);
                            } else {
                              localStorage.setItem("lovelist-fullscreen-prompt-disabled", checked ? "false" : "true");
                              setFullscreenPromptDisabled(!checked);
                            }
                            toast({ title: checked ? "Pop-up enabled" : "Pop-up disabled" });
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {((item as any).toggleKey === "install" ? !installPromptDisabled : !fullscreenPromptDisabled)
                            ? "Pop-up enabled" : "Pop-up disabled"}
                        </span>
                      </div>
                    )}
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
          <p className="text-sm font-medium text-destructive">{t("profile.signOut")}</p>
        </button>

        <p className="text-center text-[10px] text-muted-foreground mt-5 mb-2">
          PartnerAI v1.0.4 • {t("profile.madeWithLove")}
        </p>
      </div>

      {/* Personal Information Sheet */}
      <BottomSheet open={activeSheet === "personal"} onClose={() => setActiveSheet(null)} title={t("profile.personalInfo")}>
        <div className="space-y-4">
          <div>
             <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("profile.displayName")}</label>
             <input
               value={editName} onChange={e => setEditName(e.target.value)}
               className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring"
               placeholder={t("profile.yourNamePlaceholder")}
             />
          </div>
          <div>
             <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("profile.emailLabel")}</label>
             <div className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm text-muted-foreground border border-border">
               {user?.email}
             </div>
             <p className="text-[10px] text-muted-foreground mt-1">{t("profile.emailCantChange")}</p>
           </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("profile.phone")}</label>
            <input
              value={editPhone} onChange={e => setEditPhone(e.target.value)}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="+1 (555) 000-0000"
              type="tel"
            />
          </div>
          <div>
             <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("profile.gender")}</label>
             <div className="flex gap-2">
               {([["male", t("profile.male")], ["female", t("profile.female")], ["non-binary", t("profile.nonBinary")], ["other", t("profile.other")]] as const).map(([val, label]) => (
                 <button key={val} onClick={() => setEditGender(val)}
                   className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${editGender === val ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-foreground"}`}>
                   {label}
                 </button>
               ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("profile.birthdayLabel")}</label>
            <input
              type="date" value={editBirthday} onChange={e => setEditBirthday(e.target.value)}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={savePersonalInfo} disabled={saving || !editName.trim()}
            className="w-full love-gradient text-primary-foreground font-semibold py-3 rounded-xl mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
             {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
             {t("profile.saveChanges")}
          </button>
        </div>
      </BottomSheet>

      {/* Notifications Sheet */}
      <BottomSheet open={activeSheet === "notifications"} onClose={() => setActiveSheet(null)} title={t("profile.notifications")}>
        <NotificationSettingsContent />
      </BottomSheet>

      {/* Theme Sheet */}
      <ThemeSheet open={activeSheet === "theme"} onClose={() => setActiveSheet(null)} />

      {/* Customize Layout Sheet */}
      <CustomizeLayoutSheet open={activeSheet === "customize"} onClose={() => setActiveSheet(null)} />

      {/* Language Sheet */}
      <LanguageSheet open={activeSheet === "language"} onClose={() => setActiveSheet(null)} />

      {/* App Mode Sheet */}
      <BottomSheet open={activeSheet === "app-mode"} onClose={() => setActiveSheet(null)} title="App Mode">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-1">Choose how you want to use PartnerAI</p>
          {([
            { value: "single", label: "Me Mode", desc: "Personal productivity & wellness", icon: User },
            { value: "couple", label: "We Mode", desc: "Shared with your partner", icon: Users },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={async () => {
                if (opt.value === "single" && partnerId) {
                  toast({ title: "Remove partner first", description: "Disconnect your partner before switching to Me Mode", variant: "destructive" });
                  return;
                }
                await supabase.from("profiles").update({ app_mode: opt.value }).eq("user_id", user!.id);
                setAppMode(opt.value);
                setActiveSheet(null);
                toast({ title: `Switched to ${opt.label}` });
                if (opt.value === "couple" && !partnerId) {
                  navigate("/connect");
                }
              }}
              className={`w-full flex items-center gap-3 bg-muted rounded-xl px-4 py-3 border transition-colors ${
                appMode === opt.value ? "border-primary" : "border-border"
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-card flex items-center justify-center">
                <opt.icon size={16} className="text-foreground" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </div>
              {appMode === opt.value && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check size={12} className="text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Remove Partner Confirmation */}
       <BottomSheet open={activeSheet === "remove-partner"} onClose={() => setActiveSheet(null)} title={t("profile.removePartner")}>
         <div className="flex flex-col items-center py-4 gap-3">
           <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
             <UserMinus size={28} className="text-destructive" />
           </div>
           <p className="text-sm font-bold text-foreground">{t("profile.disconnectFrom")} {partnerName}?</p>
           <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-xs">
             {t("profile.disconnectConfirm")}
           </p>
           <button
             onClick={handleRemovePartner}
             disabled={removingPartner}
             className="w-full h-11 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
           >
             {removingPartner ? <Loader2 size={16} className="animate-spin" /> : t("profile.removePartner")}
           </button>
           <button onClick={() => setActiveSheet(null)} className="text-xs text-muted-foreground font-medium">
             {t("common.cancel")}
           </button>
        </div>
      </BottomSheet>

      {/* Access Code Modal */}
      <AnimatePresence>
        {showAccessCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
            onClick={() => setShowAccessCode(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <KeyRound size={20} className="text-primary-foreground" />
                </div>
                <div>
                   <h3 className="text-sm font-bold text-foreground">{t("profile.enterAccessCode")}</h3>
                   <p className="text-[10px] text-muted-foreground">{t("profile.unlockAllFeatures")}</p>
                </div>
              </div>
              <input
                value={accessCodeInput}
                onChange={e => setAccessCodeInput(e.target.value)}
                placeholder={t("profile.enterCode")}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAccessCode(false)}
                  className="flex-1 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={() => {
                    const success = applyAccessCode(accessCodeInput.trim());
                     if (success) {
                       toast({ title: t("profile.premiumUnlockedToast"), description: t("profile.allFeaturesAvailable") });
                       setShowAccessCode(false);
                       setAccessCodeInput("");
                     } else {
                       toast({ title: t("profile.invalidCode"), description: t("profile.checkCode"), variant: "destructive" });
                    }
                  }}
                  disabled={!accessCodeInput.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-primary-foreground text-sm font-semibold disabled:opacity-50"
                >
                  {t("common.activate")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

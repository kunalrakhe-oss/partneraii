import { useState, useEffect, useRef } from "react";
import { Heart, User, ChevronRight, Bell, Lock, HelpCircle, Palette, Link2, LogOut, Camera, Loader2 } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, partner_id")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "You");
        setAvatarUrl(data.avatar_url);
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

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);
      if (updateErr) throw updateErr;

      setAvatarUrl(urlWithCacheBust);
      toast({ title: "Photo updated! 📸" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const settingsSections = [
    {
      title: "Account Settings",
      items: [
        { icon: User, label: "Personal Information", sub: "Email, Phone, Birthday" },
        { icon: Bell, label: "Notifications", sub: "Reminders & Alerts" },
        { icon: Heart, label: "Couple Connection", sub: "Manage shared access" },
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
                <button key={item.label} className="w-full bg-card rounded-2xl px-4 py-3.5 shadow-card border border-border flex items-center gap-3">
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
          className="w-full bg-card rounded-2xl px-4 py-3.5 shadow-card border border-border flex items-center gap-3 mt-2">
          <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <LogOut size={16} className="text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">Sign Out</p>
        </button>

        <p className="text-center text-[10px] text-muted-foreground mt-5 mb-2">
          LoveList v1.0.4 • Made with Love
        </p>
      </div>
    </PageTransition>
  );
}
import { useState, useEffect } from "react";
import { ChevronLeft, Heart, Phone, Calendar, User, Mail, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageTransition from "@/components/PageTransition";
import { format, differenceInYears } from "date-fns";

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  gender: string | null;
  birthday: string | null;
  email: string | null;
}

function ProfileCard({ profile, label, delay }: { profile: ProfileData; label: string; delay: number }) {
  const age = profile.birthday ? differenceInYears(new Date(), new Date(profile.birthday)) : null;
  const initial = profile.display_name?.charAt(0)?.toUpperCase() || "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-card rounded-2xl border border-border shadow-card overflow-hidden"
    >
      <div className="p-5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{label}</p>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full bg-muted overflow-hidden flex items-center justify-center border-2 border-border shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">{initial}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground truncate">{profile.display_name || "Not set"}</p>
            {age !== null && (
              <p className="text-xs text-muted-foreground">{age} years old</p>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          {profile.gender && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <User size={14} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Gender</p>
                <p className="text-sm text-foreground capitalize">{profile.gender}</p>
              </div>
            </div>
          )}
          {profile.birthday && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Calendar size={14} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Birthday</p>
                <p className="text-sm text-foreground">{format(new Date(profile.birthday), "MMMM d, yyyy")}</p>
              </div>
            </div>
          )}
          {profile.phone && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Phone size={14} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Phone</p>
                <p className="text-sm text-foreground">{profile.phone}</p>
              </div>
            </div>
          )}
          {profile.email && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Mail size={14} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">{profile.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function CoupleProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [myProfile, setMyProfile] = useState<ProfileData | null>(null);
  const [partnerProfileData, setPartnerProfileData] = useState<ProfileData | null>(null);
  const [daysTogether, setDaysTogether] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const { data: me } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, phone, gender, birthday, partner_id, created_at, app_mode")
        .eq("user_id", user!.id)
        .single();

      if (me) {
        // Redirect singles to their own profile
        if ((me as any).app_mode === "single") {
          navigate("/profile", { replace: true });
          return;
        }

        setMyProfile({
          display_name: me.display_name,
          avatar_url: me.avatar_url,
          phone: me.phone,
          gender: (me as any).gender,
          birthday: (me as any).birthday,
          email: user!.email || null,
        });

        if (me.created_at) {
          const diff = Math.max(1, Math.floor((Date.now() - new Date(me.created_at).getTime()) / (1000 * 60 * 60 * 24)));
          setDaysTogether(diff);
        }

        if (me.partner_id) {
          const { data: partner } = await supabase
            .from("profiles")
            .select("display_name, avatar_url, phone, gender, birthday")
            .eq("id", me.partner_id)
            .single();

          if (partner) {
            setPartnerProfileData({
              display_name: partner.display_name,
              avatar_url: partner.avatar_url,
              phone: partner.phone,
              gender: (partner as any).gender,
              birthday: (partner as any).birthday,
              email: null,
            });
          }
        }
      }
      setLoading(false);
    }

    load();
  }, [user]);

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ChevronLeft size={18} className="text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground">Our Profile</h1>
        </div>

        {/* Couple Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center mb-6"
        >
          <div className="flex -space-x-4 mb-3">
            <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex items-center justify-center border-3 border-card z-10 ring-2 ring-primary/20">
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-muted-foreground">{myProfile?.display_name?.charAt(0) || "?"}</span>
              )}
            </div>
            <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex items-center justify-center border-3 border-card ring-2 ring-secondary/20">
              {partnerProfileData?.avatar_url ? (
                <img src={partnerProfileData.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-muted-foreground">{partnerProfileData?.display_name?.charAt(0) || "❤️"}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span>{myProfile?.display_name?.split(" ")[0]}</span>
            <Heart size={14} className="text-primary" fill="currentColor" />
            <span>{partnerProfileData?.display_name?.split(" ")[0] || "Partner"}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{daysTogether} days together</p>
        </motion.div>

        {/* Profile Cards */}
        <div className="space-y-4">
          {myProfile && <ProfileCard profile={myProfile} label="You" delay={0.1} />}
          {partnerProfileData && <ProfileCard profile={partnerProfileData} label="Your Partner" delay={0.2} />}
          {!partnerProfileData && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl border border-border shadow-card p-6 text-center"
            >
              <Heart size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">No partner connected</p>
              <p className="text-xs text-muted-foreground mb-4">Connect with your partner to see their profile here</p>
              <button
                onClick={() => navigate("/connect")}
                className="love-gradient text-primary-foreground font-semibold text-sm px-6 py-2.5 rounded-xl"
              >
                Connect Partner
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

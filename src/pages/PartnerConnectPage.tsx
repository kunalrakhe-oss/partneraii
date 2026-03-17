import { useState, useEffect } from "react";
import { Copy, Heart, ChevronLeft, Loader2, CheckCircle, Users, Share2, Shield, MessageCircle, Link2, Keyboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import PageTransition from "@/components/PageTransition";
import partnerHero from "@/assets/partner-hero.jpg";

function generateLinkCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function PartnerConnectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [myCode, setMyCode] = useState<string | null>(null);
  const [partnerCode, setPartnerCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [alreadyPaired, setAlreadyPaired] = useState(false);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function init() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("partner_id")
        .eq("user_id", user!.id)
        .single();

      if (profile?.partner_id) {
        setAlreadyPaired(true);
        // Get partner name
        const { data: partnerP } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", profile.partner_id)
          .single();
        if (partnerP) setPartnerName(partnerP.display_name);
        setLoading(false);
        return;
      }

      const { data: existing } = await supabase
        .from("partner_invites")
        .select("invite_code")
        .eq("inviter_id", user!.id)
        .is("accepted_by", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        setMyCode(existing.invite_code);
      } else {
        const code = generateLinkCode();
        const { error } = await supabase
          .from("partner_invites")
          .insert({ inviter_id: user!.id, invite_code: code });

        if (error) {
          const retryCode = generateLinkCode();
          await supabase
            .from("partner_invites")
            .insert({ inviter_id: user!.id, invite_code: retryCode });
          setMyCode(retryCode);
        } else {
          setMyCode(code);
        }
      }
      setLoading(false);
    }

    init();
  }, [user]);

  const codeChars = (myCode ?? "-----").split("");

  const handleCopy = async () => {
    if (!myCode) return;
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      toast({ title: "Code copied! 📋", description: "Share it with your partner" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!myCode) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "LoveList Partner Code",
          text: `Join me on LoveList! Use my code: ${myCode}`,
        });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  const handleConnect = async () => {
    if (partnerCode.length !== 5) return;
    setConnecting(true);

    const { data, error } = await supabase.rpc("accept_partner_invite", {
      code: partnerCode,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setConnecting(false);
      return;
    }

    const result = data as { success: boolean; error?: string };

    if (result.success) {
      toast({ title: "Connected! 💕", description: "You and your partner are now linked." });
      setTimeout(() => navigate("/"), 1000);
    } else {
      toast({ title: "Couldn't connect", description: result.error ?? "Unknown error", variant: "destructive" });
    }
    setConnecting(false);
  };

  const handleSkip = () => navigate("/");

  const [removingPartner, setRemovingPartner] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const handleRemovePartner = async () => {
    if (!user) return;
    setRemovingPartner(true);
    // Get my partner_id
    const { data: profile } = await supabase.from("profiles").select("partner_id").eq("user_id", user.id).single();
    if (profile?.partner_id) {
      const { data, error } = await supabase.rpc("remove_partner", { partner_profile_id: profile.partner_id });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        const result = data as any;
        if (result?.success) {
          toast({ title: "Partner removed" });
          setAlreadyPaired(false);
          setPartnerName(null);
          setConfirmRemove(false);
        } else {
          toast({ title: "Failed", description: result?.error, variant: "destructive" });
        }
      }
    }
    setRemovingPartner(false);
  };

  if (alreadyPaired) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background max-w-lg mx-auto px-5 flex flex-col items-center justify-center gap-4">
          <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle size={40} className="text-success" />
          </div>
          <h1 className="text-xl font-bold text-foreground">You're connected!</h1>
          <p className="text-sm text-muted-foreground text-center">
            You and {partnerName || "your partner"} are linked and sharing everything.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-6 h-11 rounded-xl love-gradient text-primary-foreground font-semibold text-sm"
          >
            Go Home
          </button>

          {!confirmRemove ? (
            <button
              onClick={() => setConfirmRemove(true)}
              className="text-xs text-muted-foreground font-medium mt-2"
            >
              Remove partner
            </button>
          ) : (
            <div className="bg-card rounded-2xl p-4 border border-border shadow-card w-full max-w-xs text-center space-y-3 mt-2">
              <p className="text-sm font-semibold text-foreground">Disconnect from {partnerName}?</p>
              <p className="text-xs text-muted-foreground">Shared data will remain but won't sync.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmRemove(false)} className="flex-1 h-10 rounded-xl bg-muted text-sm font-medium text-foreground">Cancel</button>
                <button onClick={handleRemovePartner} disabled={removingPartner} className="flex-1 h-10 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center">
                  {removingPartner ? <Loader2 size={16} className="animate-spin" /> : "Remove"}
                </button>
              </div>
            </div>
          )}
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="bg-background max-w-lg mx-auto px-5 pb-24">
        {/* Back button */}
        <div className="sticky top-0 z-10 bg-background pt-4 pb-2">
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <ChevronLeft size={20} className="text-foreground" />
          </button>
        </div>

        {/* Hero Image */}
        <div className="flex justify-center mb-5">
          <div className="w-36 h-36 rounded-full overflow-hidden shadow-elevated border-4 border-card">
            <img src={partnerHero} alt="Couple together" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-2xl font-bold text-foreground text-center mb-2">Better Together</h1>
        <p className="text-sm text-muted-foreground text-center max-w-xs mx-auto leading-relaxed mb-6">
          LoveList works best when shared. Connect with your partner to start syncing your life.
        </p>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[hsl(100,20%,72%)] flex items-center justify-center text-xs font-bold text-foreground">1</div>
            <span className="text-sm font-semibold text-foreground">Create</span>
          </div>
          <div className="w-10 h-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">2</div>
            <span className="text-sm text-muted-foreground">Connect</span>
          </div>
        </div>

        {/* Link Code Card */}
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border mb-5">
          <p className="text-sm font-semibold text-primary text-center mb-4">Your Unique Link Code</p>

          {/* Code display */}
          <div className="flex justify-center gap-2.5 mb-4">
            {codeChars.map((char, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className="w-12 h-14 rounded-xl border-2 border-[hsl(100,20%,72%)] flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-3 h-3 rounded-full bg-muted animate-pulse" />
                ) : (
                  <span className="text-xl font-bold text-foreground">{char}</span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Copy & Share buttons */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={handleCopy}
              disabled={loading}
              className="flex-1 h-11 rounded-xl bg-[hsl(100,20%,72%)] text-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Copy size={14} />
              {copied ? "Copied!" : "Copy Code"}
            </button>
            <button
              onClick={handleShare}
              disabled={loading}
              className="h-11 px-5 rounded-xl bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Share2 size={14} />
              Share
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-border mb-5" />

          {/* Partner code input */}
          <p className="text-sm font-bold text-foreground mb-3">Have a partner's code?</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-muted rounded-xl flex items-center px-3 gap-2">
              <Heart size={14} className="text-muted-foreground shrink-0" />
              <input
                value={partnerCode}
                onChange={e => setPartnerCode(e.target.value.toUpperCase().slice(0, 5))}
                placeholder="Enter 5-digit code"
                maxLength={5}
                className="flex-1 h-11 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none tracking-wider font-medium"
              />
            </div>
            <button
              onClick={handleConnect}
              disabled={partnerCode.length < 5 || connecting}
              className="px-5 h-11 rounded-xl bg-primary/80 text-primary-foreground text-sm font-semibold disabled:opacity-40 transition-opacity flex items-center gap-2"
            >
              {connecting ? <Loader2 size={16} className="animate-spin" /> : "Connect"}
            </button>
          </div>
        </div>

        {/* Info cards */}
        <div className="space-y-2 mb-6">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="w-full bg-card rounded-2xl px-4 py-3.5 shadow-card border border-border flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Users size={18} className="text-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">How does this work?</p>
              <p className="text-[10px] text-muted-foreground">Learn about shared data and privacy</p>
            </div>
          </button>

          <AnimatePresence>
            {showHowItWorks && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-card rounded-2xl p-4 shadow-card border border-border space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-sm">1️⃣</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Share your code</p>
                      <p className="text-xs text-muted-foreground">Send your 5-letter code to your partner via text, email, or in person.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-sm">2️⃣</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">They enter it</p>
                      <p className="text-xs text-muted-foreground">Your partner signs up, goes to Connect, and enters your code.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-sm">✅</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">You're linked!</p>
                      <p className="text-xs text-muted-foreground">Grocery lists, chores, calendar, chat — everything syncs in real time.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pt-1 border-t border-border">
                    <Shield size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">Your data is private and only shared between you and your partner. Codes expire after 7 days.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Skip */}
        <button onClick={handleSkip} className="w-full text-center text-sm text-muted-foreground font-medium py-2">
          I'll do this later
        </button>
      </div>
    </PageTransition>
  );
}

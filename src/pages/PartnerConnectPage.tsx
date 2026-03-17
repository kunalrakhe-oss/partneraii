import { useState } from "react";
import { Copy, QrCode, HelpCircle, Heart, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLocalStorage, generateId } from "@/lib/store";
import PageTransition from "@/components/PageTransition";
import partnerHero from "@/assets/partner-hero.jpg";

function generateLinkCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function PartnerConnectPage() {
  const navigate = useNavigate();
  const [myCode] = useLocalStorage<string>("lovelist-link-code", generateLinkCode());
  const [partnerCode, setPartnerCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useLocalStorage<string>("lovelist-partner-connected", "");

  const codeChars = myCode.split("");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = () => {
    if (partnerCode.length === 5) {
      setConnected("true");
      navigate("/");
    }
  };

  const handleSkip = () => {
    navigate("/");
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background max-w-lg mx-auto px-5 pb-10">
        {/* Hero Image */}
        <div className="flex justify-center pt-8 mb-5">
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
                <span className="text-xl font-bold text-foreground">{char}</span>
              </motion.div>
            ))}
          </div>

          {/* Copy & Share */}
          <button
            onClick={handleCopy}
            className="w-full h-11 rounded-xl bg-[hsl(100,20%,72%)] text-foreground font-semibold text-sm flex items-center justify-center gap-2 mb-5"
          >
            <Copy size={14} />
            {copied ? "Copied!" : "Copy & Share Link"}
          </button>

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
              disabled={partnerCode.length < 5}
              className="px-5 h-11 rounded-xl bg-primary/80 text-primary-foreground text-sm font-semibold disabled:opacity-40 transition-opacity"
            >
              Connect
            </button>
          </div>
        </div>

        {/* QR Code option */}
        <div className="space-y-2 mb-6">
          <button className="w-full bg-card rounded-2xl px-4 py-3.5 shadow-card border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(100,25%,78%)] flex items-center justify-center shrink-0">
              <QrCode size={18} className="text-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">Show QR Code</p>
              <p className="text-[10px] text-muted-foreground">Let your partner scan your screen</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>

          <button className="w-full bg-card rounded-2xl px-4 py-3.5 shadow-card border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <HelpCircle size={18} className="text-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">How does this work?</p>
              <p className="text-[10px] text-muted-foreground">Learn about shared data and privacy</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Skip */}
        <button onClick={handleSkip} className="w-full text-center text-sm text-muted-foreground font-medium py-2">
          I'll do this later
        </button>
      </div>
    </PageTransition>
  );
}

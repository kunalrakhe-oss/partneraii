import { Sparkles, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import onboardingHero from "@/assets/onboarding-hero.jpg";

interface WelcomePageProps {
  onComplete: () => void;
}

export default function WelcomePage({ onComplete }: WelcomePageProps) {
  const navigate = useNavigate();

  const handleCreate = () => {
    onComplete();
    navigate("/connect");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Top section */}
      <div className="flex-1 flex flex-col items-center pt-12 px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-8"
        >
          <Heart size={24} className="text-primary" fill="hsl(346, 77%, 60%)" />
          <span className="text-xl font-bold text-foreground">LoveList</span>
        </motion.div>

        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-56 h-56 rounded-full overflow-hidden mb-8 shadow-elevated border-4 border-card"
        >
          <img
            src={onboardingHero}
            alt="Get started"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-foreground text-center mb-3"
        >
          Your life, organized.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed"
        >
          Manage chores, groceries, wellness, and your calendar — solo or with a partner.
        </motion.p>
      </div>

      {/* Bottom section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-foreground rounded-t-3xl px-6 pt-8 pb-10"
      >
        {/* Get Started button */}
        <button
          onClick={handleCreate}
          className="w-full h-14 rounded-2xl bg-card text-foreground font-semibold text-base flex items-center justify-center gap-2.5 shadow-soft mb-4"
        >
          <Sparkles size={20} />
          Get Started
        </button>

        {/* Join My Partner */}
        <button
          onClick={handleCreate}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted mb-8"
        >
          <Users size={16} />
          Join My Partner
        </button>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-[hsl(100,25%,78%)] border-2 border-foreground flex items-center justify-center text-[10px]">👩</div>
            <div className="w-7 h-7 rounded-full bg-primary/30 border-2 border-foreground flex items-center justify-center text-[10px]">👨</div>
          </div>
          <p className="text-xs text-muted">Joined by 10,000+ happy users</p>
        </div>

        {/* Terms */}
        <p className="text-[10px] text-muted-foreground text-center">
          By continuing, you agree to our{" "}
          <span className="underline text-muted">Terms of Service</span>
          {" & "}
          <span className="underline text-muted">Privacy Policy</span>
        </p>
      </motion.div>
    </div>
  );
}

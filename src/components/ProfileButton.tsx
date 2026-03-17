import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function ProfileButton({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        setAvatarUrl(data?.avatar_url || user.user_metadata?.avatar_url || null);
      });
  }, [user]);

  return (
    <button
      onClick={() => navigate("/profile")}
      className={`w-9 h-9 rounded-full bg-muted overflow-hidden flex items-center justify-center border-2 border-border shrink-0 ${className}`}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm">👩</span>
      )}
    </button>
  );
}

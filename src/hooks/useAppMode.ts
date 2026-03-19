import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAppMode() {
  const { user } = useAuth();
  const [appMode, setAppMode] = useState<"single" | "couple">("couple");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("app_mode")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.app_mode) setAppMode(data.app_mode as "single" | "couple");
      });
  }, [user]);

  return { appMode, isSingle: appMode === "single", isCouple: appMode === "couple" };
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Fetches the current user's partner_pair key from the DB.
 * Returns null while loading or if user has no partner yet (solo mode).
 */
export function usePartnerPair() {
  const { user } = useAuth();
  const [partnerPair, setPartnerPair] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetch = () => {
      supabase
        .rpc("get_partner_pair", { uid: user.id })
        .then(({ data, error }) => {
          if (!error && data) {
            setPartnerPair(data as string);
            setLoading(false);
          } else {
            // Profile may not exist yet on first login; retry once
            setTimeout(() => {
              supabase.rpc("get_partner_pair", { uid: user.id }).then(({ data: d2 }) => {
                if (d2) setPartnerPair(d2 as string);
                setLoading(false);
              });
            }, 1500);
          }
        });
    };
    fetch();
  }, [user]);

  return { partnerPair, loading, userId: user?.id ?? null };
}

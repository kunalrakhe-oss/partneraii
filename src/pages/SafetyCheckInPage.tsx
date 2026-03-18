import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, MapPin, Shield, ShieldOff, Clock, Navigation, Loader2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";

type LocationShare = {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  is_active: boolean;
  message: string | null;
  updated_at: string;
  expires_at: string;
};

const MESSAGES = [
  "Heading home 🏠",
  "Out late, sharing location 🌙",
  "Traveling, stay connected 🚗",
  "At a new place 📍",
  "Running errands 🛒",
];

export default function SafetyCheckInPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const [sharing, setSharing] = useState(false);
  const [myLocation, setMyLocation] = useState<LocationShare | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<LocationShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingShare, setStartingShare] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const shareIdRef = useRef<string | null>(null);

  // Fetch existing shares
  useEffect(() => {
    if (!user || !partnerPair) return;
    const load = async () => {
      const { data } = await supabase
        .from("location_shares")
        .select("*")
        .eq("partner_pair", partnerPair)
        .eq("is_active", true)
        .gte("expires_at", new Date().toISOString());

      if (data) {
        const mine = data.find((d: any) => d.user_id === user.id);
        const theirs = data.find((d: any) => d.user_id !== user.id);
        if (mine) {
          setMyLocation(mine as LocationShare);
          shareIdRef.current = mine.id;
          setSharing(true);
          startWatching(mine.id);
        }
        if (theirs) setPartnerLocation(theirs as LocationShare);
      }
      setLoading(false);
    };
    load();

    // Realtime subscription for partner updates
    const channel = supabase
      .channel("location-shares")
      .on("postgres_changes", { event: "*", schema: "public", table: "location_shares", filter: `partner_pair=eq.${partnerPair}` },
        (payload: any) => {
          const rec = payload.new as LocationShare | undefined;
          if (!rec) {
            // Deleted
            if (payload.old?.user_id === user.id) { setMyLocation(null); setSharing(false); }
            else setPartnerLocation(null);
            return;
          }
          if (rec.user_id === user.id) {
            setMyLocation(rec);
          } else {
            setPartnerLocation(rec.is_active ? rec : null);
            if (payload.eventType === "INSERT") toast("📍 Your partner started sharing their location!");
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); stopWatching(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, partnerPair]);

  const startWatching = useCallback((id: string) => {
    if (watchIdRef.current !== null) return;
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        await supabase
          .from("location_shares")
          .update({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      },
      (err) => {
        console.error("Geo error:", err);
        if (err.code === err.PERMISSION_DENIED) setPermissionDenied(true);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }, []);

  const stopWatching = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const startSharing = async () => {
    if (!user || !partnerPair) return;
    setStartingShare(true);

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setStartingShare(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { data, error } = await supabase
          .from("location_shares")
          .insert({
            user_id: user.id,
            partner_pair: partnerPair,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            message: selectedMsg || null,
          })
          .select()
          .single();

        if (error) {
          toast.error("Failed to start sharing");
          setStartingShare(false);
          return;
        }

        shareIdRef.current = data.id;
        setMyLocation(data as LocationShare);
        setSharing(true);
        setStartingShare(false);
        startWatching(data.id);
        toast.success("Location sharing started! 📍");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
          toast.error("Location permission denied. Please enable it in your browser settings.");
        } else {
          toast.error("Could not get your location");
        }
        setStartingShare(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const stopSharing = async () => {
    stopWatching();
    if (shareIdRef.current) {
      await supabase
        .from("location_shares")
        .update({ is_active: false })
        .eq("id", shareIdRef.current);
    }
    setSharing(false);
    setMyLocation(null);
    shareIdRef.current = null;
    toast("Location sharing stopped");
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Shield size={18} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">Safety Check-In</h1>
            <p className="text-[11px] text-muted-foreground">Share location with your partner</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Permission denied warning */}
        {permissionDenied && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-2">
            <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">Location permission was denied. Please enable location access in your browser/device settings and try again.</p>
          </motion.div>
        )}

        {/* My sharing status */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 shadow-card border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin size={18} className={sharing ? "text-green-500" : "text-muted-foreground"} />
              <span className="text-sm font-bold text-foreground">Your Location</span>
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${sharing ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
              {sharing ? "Sharing" : "Off"}
            </span>
          </div>

          {!sharing ? (
            <div>
              {/* Message selector */}
              <p className="text-xs text-muted-foreground mb-2">Add a status (optional):</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {MESSAGES.map(m => (
                  <button key={m} onClick={() => setSelectedMsg(selectedMsg === m ? "" : m)}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                      selectedMsg === m ? "bg-orange-500/10 text-orange-600 border border-orange-500" : "bg-muted text-muted-foreground border border-transparent"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>

              <button onClick={startSharing} disabled={startingShare}
                className="w-full bg-orange-500 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {startingShare ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                Start Sharing Location
              </button>
            </div>
          ) : (
            <div>
              {myLocation?.message && (
                <p className="text-xs text-muted-foreground mb-2">📝 {myLocation.message}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> Auto-stops in ~{myLocation?.expires_at ? formatDistanceToNowStrict(new Date(myLocation.expires_at)) : "2h"}
                </span>
                {myLocation?.accuracy && (
                  <span>±{Math.round(myLocation.accuracy)}m accuracy</span>
                )}
              </div>

              {myLocation && (
                <button onClick={() => openInMaps(myLocation.latitude, myLocation.longitude)}
                  className="w-full bg-muted text-foreground rounded-xl py-2 text-xs font-medium mb-2">
                  📍 View on Google Maps
                </button>
              )}

              <button onClick={stopSharing}
                className="w-full bg-destructive/10 text-destructive rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
                <ShieldOff size={16} /> Stop Sharing
              </button>
            </div>
          )}
        </motion.div>

        {/* Partner's location */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-4 shadow-card border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin size={18} className={partnerLocation ? "text-primary" : "text-muted-foreground"} />
              <span className="text-sm font-bold text-foreground">Partner's Location</span>
            </div>
            {partnerLocation && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">Live</span>
            )}
          </div>

          {partnerLocation ? (
            <div>
              {partnerLocation.message && (
                <p className="text-xs text-muted-foreground mb-2">📝 {partnerLocation.message}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> Updated {formatDistanceToNowStrict(new Date(partnerLocation.updated_at))} ago
                </span>
                {partnerLocation.accuracy && (
                  <span>±{Math.round(partnerLocation.accuracy)}m</span>
                )}
              </div>

              <button onClick={() => openInMaps(partnerLocation.latitude, partnerLocation.longitude)}
                className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
                <Navigation size={16} /> Open in Maps
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <MapPin size={32} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Your partner isn't sharing their location right now.</p>
            </div>
          )}
        </motion.div>

        {/* Info */}
        <div className="p-3 bg-muted/50 rounded-xl">
          <p className="text-[11px] text-muted-foreground leading-relaxed">🔒 Location sharing is temporary (auto-stops after 2 hours) and only visible to your connected partner. You can stop sharing at any time.</p>
        </div>
      </div>
    </div>
  );
}

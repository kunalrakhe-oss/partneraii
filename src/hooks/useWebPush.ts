import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush() {
  const { user } = useAuth();
  const registered = useRef(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const subscribe = useCallback(async () => {
    if (!user || !VAPID_PUBLIC_KEY) return false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return false;

      // Register dedicated push service worker
      const reg = await navigator.serviceWorker.register("/sw-push.js");
      await navigator.serviceWorker.ready;

      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
      subscription = await reg.pushManager.subscribe({
          userVisuallyIndicatesPermission: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
        });
      }

      const subJSON = subscription.toJSON();

      // Upsert subscription to database
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subJSON.endpoint!,
          p256dh: subJSON.keys!.p256dh!,
          auth: subJSON.keys!.auth!,
        },
        { onConflict: "user_id,endpoint" }
      );

      return true;
    } catch (err) {
      console.error("[WebPush] Subscribe error:", err);
      return false;
    }
  }, [user]);

  // Auto-subscribe if permission already granted
  useEffect(() => {
    if (!user || registered.current) return;
    if (permission === "granted" && VAPID_PUBLIC_KEY) {
      registered.current = true;
      subscribe();
    }
  }, [user, permission, subscribe]);

  return { permission, subscribe };
}

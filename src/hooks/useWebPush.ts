import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

let vapidKeyCache: string | null = null;

async function getVapidPublicKey(): Promise<string> {
  if (vapidKeyCache) return vapidKeyCache;
  try {
    const { data, error } = await supabase.functions.invoke("vapid-public-key");
    if (!error && data?.publicKey) {
      vapidKeyCache = data.publicKey;
      return data.publicKey;
    }
  } catch (e) {
    console.error("[WebPush] Failed to fetch VAPID key:", e);
  }
  return "";
}

export function useWebPush() {
  const { user } = useAuth();
  const registered = useRef(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const subscribe = useCallback(async () => {
    if (!user) return false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return false;

      const reg = await navigator.serviceWorker.register("/sw-push.js");
      await navigator.serviceWorker.ready;

      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
        });
      }

      const subJSON = subscription.toJSON();

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

  useEffect(() => {
    if (!user || registered.current) return;
    if (permission === "granted") {
      registered.current = true;
      subscribe();
    }
  }, [user, permission, subscribe]);

  return { permission, subscribe };
}

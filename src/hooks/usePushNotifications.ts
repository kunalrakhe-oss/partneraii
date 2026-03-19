import { useEffect, useRef, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type PushNotificationSchema,
  type ActionPerformed,
  type Token,
} from "@capacitor/push-notifications";

export interface PushState {
  token: string | null;
  isRegistered: boolean;
  error: string | null;
}

/**
 * Handles native push notification registration and events via Capacitor.
 * On web this is a no-op.
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    token: null,
    isRegistered: false,
    error: null,
  });
  const initialized = useRef(false);

  const register = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    const permResult = await PushNotifications.requestPermissions();

    if (permResult.receive === "granted") {
      await PushNotifications.register();
    } else {
      setState((s) => ({ ...s, error: "Push notification permission denied" }));
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || initialized.current) return;
    initialized.current = true;

    // Token received
    PushNotifications.addListener("registration", (token: Token) => {
      console.log("[Push] Token:", token.value);
      setState({ token: token.value, isRegistered: true, error: null });
    });

    // Registration error
    PushNotifications.addListener("registrationError", (err) => {
      console.error("[Push] Registration error:", err);
      setState((s) => ({ ...s, error: String(err) }));
    });

    // Foreground notification
    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        console.log("[Push] Foreground notification:", notification);
      }
    );

    // Notification tapped
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action: ActionPerformed) => {
        console.log("[Push] Action performed:", action);
        // You can navigate based on action.notification.data here
      }
    );

    // Auto-register on mount
    register();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [register]);

  return { ...state, register };
}

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "lovelist-pwa-dismiss-ts";
const VIEW_COUNT_KEY = "lovelist-pwa-view-count";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    document.referrer.includes("android-app://") ||
    window.location.search.includes("homescreen=1")
  );
}

function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isDismissedRecently(): boolean {
  const ts = localStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  return Date.now() - Number(ts) < COOLDOWN_MS;
}

function getViewCount(): number {
  return Number(localStorage.getItem(VIEW_COUNT_KEY) || "0");
}

function incrementViewCount(): number {
  const count = getViewCount() + 1;
  localStorage.setItem(VIEW_COUNT_KEY, String(count));
  return count;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const isIOS = isIOSDevice();

  useEffect(() => {
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    if (isDismissedRecently()) {
      setDismissed(true);
    }

    setViewCount(incrementViewCount());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === "accepted";
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }, []);

  const canInstall = !isInstalled && !dismissed && (!!deferredPrompt || isIOS);
  const isFirstView = viewCount <= 1;

  return { canInstall, isIOS, isInstalled, promptInstall, dismiss, isFirstView };
}

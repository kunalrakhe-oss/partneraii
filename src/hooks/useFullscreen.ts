import { useState, useEffect, useCallback } from "react";

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isSupported =
    typeof document !== "undefined" &&
    (document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled) &&
    // Hide on iOS Safari (no real fullscreen support)
    !/iPhone|iPad|iPod/.test(navigator.userAgent);

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(
        !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
      );
    };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    handler();
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        await (el as any).webkitRequestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request failed", e);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    } catch (e) {
      console.warn("Exit fullscreen failed", e);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    isSupported: isSupported && !isStandalone,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}

import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "lovelist-voice-assistant-enabled";
const WAKE_PHRASE = "hey love";

// Check browser support
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function useWakeWord() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [isListening, setIsListening] = useState(false);
  const [activated, setActivated] = useState(false);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isSupported = !!SpeechRecognition;

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || !enabled) return;
    stopListening();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        if (transcript.includes(WAKE_PHRASE)) {
          setActivated(true);
          stopListening();
          return;
        }
      }
    };

    recognition.onerror = (event: any) => {
      // "no-speech" and "aborted" are expected, just restart
      if (event.error === "not-allowed") {
        setEnabled(false);
        localStorage.setItem(STORAGE_KEY, "false");
        stopListening();
        return;
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if still enabled
      if (enabled && !activated) {
        restartTimeoutRef.current = setTimeout(() => {
          startListening();
        }, 300);
      }
    };

    try {
      recognition.start();
    } catch {
      // Already started or error
    }
  }, [isSupported, enabled, activated, stopListening]);

  // Toggle enable/disable
  const toggleEnabled = useCallback((value: boolean) => {
    setEnabled(value);
    localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
    if (!value) {
      stopListening();
    }
  }, [stopListening]);

  // Dismiss the activation overlay
  const dismiss = useCallback(() => {
    setActivated(false);
  }, []);

  // Start/stop based on enabled state
  useEffect(() => {
    if (enabled && !activated) {
      startListening();
    } else if (!enabled) {
      stopListening();
    }
    return () => stopListening();
  }, [enabled, activated]);

  // Restart listening after dismissing activation
  useEffect(() => {
    if (!activated && enabled) {
      const t = setTimeout(() => startListening(), 500);
      return () => clearTimeout(t);
    }
  }, [activated, enabled]);

  return {
    isSupported,
    enabled,
    toggleEnabled,
    isListening,
    activated,
    dismiss,
  };
}

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Volume2, VolumeX } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { playNotificationSound } from "@/lib/notificationSound";
import { useWakeWord } from "@/hooks/useWakeWord";

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lovebot-chat`;

type Phase = "listening" | "processing" | "responding" | "idle";

export default function VoiceAssistant() {
  const { isSupported, enabled, activated, dismiss, isListening: wakeListening } = useWakeWord();
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // When activated by wake word, start command listening
  useEffect(() => {
    if (activated) {
      playNotificationSound();
      setTranscript("");
      setResponse("");
      setPhase("listening");
      startCommandListening();
    }
  }, [activated]);

  const startCommandListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + " ";
        } else {
          interim = t;
        }
      }
      setTranscript((finalTranscript + interim).trim());

      // Reset silence timer on each result
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        // Stop after 2s silence
        try { recognition.stop(); } catch {}
      }, 2000);
    };

    recognition.onend = () => {
      const text = finalTranscript.trim();
      if (text && text.length > 1) {
        sendToAI(text);
      } else {
        // No speech detected
        setPhase("idle");
        handleClose();
      }
    };

    recognition.onerror = () => {
      setPhase("idle");
      handleClose();
    };

    try {
      recognition.start();
    } catch {}
  }, []);

  const sendToAI = async (text: string) => {
    setPhase("processing");
    setTranscript(text);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          language: localStorage.getItem("lovelist-language") || "en",
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setResponse(`⚠️ ${data.error || "Something went wrong"}`);
        setPhase("responding");
        return;
      }

      if (!resp.body) {
        setResponse("⚠️ No response received");
        setPhase("responding");
        return;
      }

      setPhase("responding");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              setResponse(fullResponse);
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }

      // TTS readback
      if (ttsEnabled && fullResponse && !fullResponse.startsWith("⚠️")) {
        speakResponse(fullResponse);
      }
    } catch {
      setResponse("⚠️ Something went wrong. Please try again.");
      setPhase("responding");
    }
  };

  const speakResponse = (text: string) => {
    if (!window.speechSynthesis) return;
    // Strip markdown for cleaner speech
    const clean = text.replace(/[#*_`\[\]()]/g, "").replace(/\n+/g, ". ");
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  const handleClose = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setPhase("idle");
    setTranscript("");
    setResponse("");
    dismiss();
  };

  if (!isSupported || !enabled) return null;

  // Small listening indicator when wake word detection is active but not activated
  if (!activated) {
    return (
      <div className="fixed top-3 right-3 z-[100]">
        <AnimatePresence>
          {wakeListening && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-2 h-2 rounded-full bg-primary"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Fullscreen voice overlay
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          >
            {ttsEnabled ? (
              <Volume2 size={18} className="text-foreground" />
            ) : (
              <VolumeX size={18} className="text-muted-foreground" />
            )}
          </button>
          <p className="text-sm font-bold text-foreground">Hey Love 💕</p>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          >
            <X size={18} className="text-foreground" />
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-y-auto">
          {/* Mic animation */}
          {phase === "listening" && (
            <div className="flex flex-col items-center gap-6 mb-8">
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-primary/20"
                  style={{ margin: "-16px" }}
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                  className="absolute inset-0 rounded-full bg-primary/10"
                  style={{ margin: "-32px" }}
                />
                <div className="w-20 h-20 rounded-full love-gradient flex items-center justify-center relative z-10">
                  <Mic size={32} className="text-primary-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">Listening...</p>
            </div>
          )}

          {/* Processing */}
          {phase === "processing" && (
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
                />
              </div>
              <p className="text-sm text-muted-foreground">Thinking...</p>
            </div>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="w-full max-w-sm mb-6">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">You said:</p>
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-sm leading-relaxed">{transcript}</p>
              </div>
            </div>
          )}

          {/* AI Response */}
          {response && (
            <div className="w-full max-w-sm mb-6">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">LoveBot:</p>
              <div className="bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-3">
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&_p]:my-1">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Responding phase - pulsing dots while streaming hasn't started */}
          {phase === "responding" && !response && (
            <div className="flex gap-1 mb-6">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>

        {/* Bottom action */}
        <div className="px-8 pb-12 pt-4 flex justify-center">
          {phase === "responding" && response ? (
            <button
              onClick={handleClose}
              className="px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium"
            >
              Done
            </button>
          ) : phase === "listening" ? (
            <p className="text-xs text-muted-foreground text-center">
              Say your question, or tap ✕ to cancel
            </p>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

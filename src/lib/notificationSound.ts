const STORAGE_KEY = "lovelist-notification-prefs";

interface NotificationPrefs {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const defaults: NotificationPrefs = { soundEnabled: true, vibrationEnabled: true };

export function getNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function setNotificationPrefs(prefs: Partial<NotificationPrefs>) {
  const current = getNotificationPrefs();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...prefs }));
}

// Generate a short pleasant notification chime using Web Audio API
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playNotificationSound() {
  const prefs = getNotificationPrefs();
  if (!prefs.soundEnabled) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Two-tone chime
    const notes = [880, 1100];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.35);
    });
  } catch {
    // Audio not available
  }
}

export function vibrateNotification() {
  const prefs = getNotificationPrefs();
  if (!prefs.vibrationEnabled) return;

  try {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch {
    // Vibration not supported
  }
}

export function notifyPartnerAction() {
  playNotificationSound();
  vibrateNotification();
}

// Web Speech API announcer — the browser's built-in female voice, no API key, no network.
// Degrades silently (no-ops) when speech synthesis is unavailable, e.g. headless previews.

const FEMALE_HINTS = [
  "female",
  "samantha",
  "victoria",
  "zira",
  "karen",
  "moira",
  "tessa",
  "fiona",
  "serena",
  "aria",
  "google uk english female",
  "google us english",
];

export const ANNOUNCE = {
  granted: "Access granted. Initializing operator environment.",
  denied: "Access denied. Security protocol engaged.",
  welcome: "Welcome, Mr. Monish.",
} as const;

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  for (const hint of FEMALE_HINTS) {
    const hit = english.find((v) => v.name.toLowerCase().includes(hint));
    if (hit) return hit;
  }
  return english[0] ?? voices[0] ?? null;
}

let cached: SpeechSynthesisVoice | null = null;

function femaleVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  if (!cached) cached = pickVoice(s.getVoices());
  return cached;
}

// Voices load asynchronously in Chrome — warm the cache as early as possible.
if (synth()) {
  synth()!.addEventListener?.("voiceschanged", () => {
    cached = pickVoice(synth()!.getVoices());
  });
}

export function speak(text: string, opts: { rate?: number; pitch?: number } = {}): void {
  const s = synth();
  if (!s) return;
  try {
    s.cancel();
  } catch {
    /* ignore */
  }
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = femaleVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? "en-US";
  utterance.rate = opts.rate ?? 1;
  utterance.pitch = opts.pitch ?? 1.15; // slightly brighter pitch reads as a female voice
  s.speak(utterance);
}

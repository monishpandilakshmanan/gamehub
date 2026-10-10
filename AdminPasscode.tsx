import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Fingerprint, Lock, Terminal } from "lucide-react";
import { ApiError, apiPost } from "@/lib/api";
import { ADMIN_SESSION_KEY } from "@/lib/session";
import { ANNOUNCE, speak } from "@/lib/voice";
import type { AdminStatus } from "@/lib/types";
import BinaryRain from "@/components/BinaryRain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Phase = "idle" | "verifying" | "granted" | "denied";

const BOOT_LINES = [
  "> establishing encrypted channel .......... OK",
  "> negotiating rsa-4096 handshake .......... OK",
  "> tracing intrusion vector ................ CLEAN",
  "> querying operator registry .............. 1 MATCH",
];

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

export default function AdminPasscode() {
  const [passcode, setPasscode] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [lineCount, setLineCount] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const verify = useMutation({
    mutationFn: (code: string) => apiPost<AdminStatus>("/admin/login", { passcode: code }),
    onSuccess: (data) => {
      if (!data.authenticated) {
        deny();
        return;
      }
      queryClient.setQueryData(ADMIN_SESSION_KEY, data);
      setPhase("granted");
      speak(ANNOUNCE.granted);
      window.setTimeout(() => {
        sessionStorage.setItem("rh_admin_welcome", "1");
        navigate("/admin");
      }, 1900);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        deny();
      } else {
        toast.error("Secure channel unreachable — try again.");
        setPhase("idle");
        setLineCount(0);
      }
    },
  });

  function deny() {
    setPhase("denied");
    speak(ANNOUNCE.denied);
    setShakeKey((k) => k + 1);
    window.setTimeout(() => {
      setPhase("idle");
      setPasscode("");
      setLineCount(0);
    }, 2300);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (phase !== "idle" || !passcode.trim()) return;
    const code = passcode.trim();
    setPhase("verifying");
    for (let i = 0; i < BOOT_LINES.length; i++) {
      await sleep(240);
      setLineCount(i + 1);
    }
    await sleep(340);
    verify.mutate(code);
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-[#020804] font-mono text-[#4EFE82]">
      {/* dual-direction binary rain — only on admin screens */}
      <BinaryRain className="absolute inset-0 h-full w-full" opacity={0.9} />
      <div aria-hidden className="scanlines pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(2,8,4,0.9) 100%)" }}
      />

      <div className="relative z-10 flex min-h-svh items-center justify-center px-4">
        <motion.div
          key={shakeKey}
          className={phase === "denied" ? "deny-shake w-full max-w-md" : "w-full max-w-md"}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="rounded-xl border border-[#00FF66]/25 bg-[#04180C]/85 shadow-[0_0_80px_rgba(0,255,102,0.14)] backdrop-blur-xl">
            {/* terminal title bar */}
            <div className="flex items-center justify-between border-b border-[#00FF66]/15 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#FF3366]/70" />
                <span className="size-2.5 rounded-full bg-[#FFD700]/70" />
                <span className="size-2.5 rounded-full bg-[#00FF66]/70" />
              </div>
              <span className="text-[10px] tracking-[0.3em] text-[#1F9D46]">
                REWARDSHUB // SECURE SHELL v2.7
              </span>
            </div>

            <div className="px-6 py-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg border border-[#00FF66]/30 bg-[#00FF66]/10">
                  <Fingerprint className="size-5 text-[#00FF66]" />
                </span>
                <div>
                  <h1 className="font-heading text-lg font-bold tracking-wide text-[#E0FFE8]">
                    OPERATOR AUTHENTICATION
                  </h1>
                  <p className="text-[11px] text-[#1F9D46]">restricted — root clearance required</p>
                </div>
              </div>

              <div className="mb-6 min-h-[88px] rounded-lg border border-[#00FF66]/15 bg-black/40 p-3 text-[11px] leading-5 text-[#33FF88]">
                {phase === "idle" && (
                  <p>
                    &gt; awaiting passcode<span className="terminal-caret">_</span>
                  </p>
                )}
                {phase === "verifying" &&
                  BOOT_LINES.slice(0, lineCount).map((line) => <p key={line}>{line}</p>)}
                {phase === "verifying" && <span className="terminal-caret">_</span>}
                {phase === "granted" && <p>&gt; identity confirmed — operator MONISH</p>}
                {phase === "denied" && (
                  <p className="text-[#FF3366]">&gt; !! intruder signature logged — attempt rejected</p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#1F9D46]" />
                  <Input
                    data-testid="admin-passcode-input"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    disabled={phase !== "idle"}
                    placeholder="••••••••••"
                    autoComplete="off"
                    className="border-[#00FF66]/25 bg-black/50 pl-9 text-center text-lg tracking-[0.45em] text-[#B4FFD0] placeholder:text-[#1F9D46]/60 focus-visible:ring-[#00FF66]/50"
                  />
                </div>
                <Button
                  type="submit"
                  data-testid="admin-passcode-submit-button"
                  disabled={phase !== "idle"}
                  className="w-full bg-[#00FF66] font-semibold tracking-widest text-[#020804] hover:bg-[#7CFFA9]"
                >
                  {phase === "verifying" ? "VERIFYING…" : "AUTHENTICATE"}
                </Button>
              </form>
            </div>
          </div>

          <p className="mt-4 flex items-center justify-center gap-2 text-[10px] tracking-[0.25em] text-[#1F9D46]/70">
            <Terminal className="size-3" />
            MATRIX INTERFACE — MONISH EDITION
          </p>
        </motion.div>
      </div>

      {/* access granted — cinematic wipe transition into the dashboard */}
      <AnimatePresence>
        {phase === "granted" && (
          <motion.div
            data-testid="access-granted-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#020804]/92"
            initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.18, type: "spring", stiffness: 210, damping: 15 }}
              className="text-center"
            >
              <div className="font-heading text-4xl font-bold tracking-[0.28em] text-[#00FF66] text-glow-green sm:text-5xl">
                ACCESS GRANTED
              </div>
              <div className="mt-4 text-xs tracking-[0.35em] text-[#4EFE82]/70">
                INITIALIZING OPERATOR ENVIRONMENT…
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* access denied — red breach flash */}
      <AnimatePresence>
        {phase === "denied" && (
          <motion.div
            data-testid="access-denied-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#080204]/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <div className="font-heading text-4xl font-bold tracking-[0.28em] text-[#FF3366] sm:text-5xl" style={{ textShadow: "0 0 24px rgba(255,51,102,0.6)" }}>
                ACCESS DENIED
              </div>
              <div className="mt-4 text-xs tracking-[0.35em] text-[#FF3366]/70">
                SECURITY PROTOCOL ENGAGED
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

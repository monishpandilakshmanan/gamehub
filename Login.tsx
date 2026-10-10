import { useState } from "react";
import { motion } from "motion/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Gift, ShieldCheck, Timer, Users, Zap } from "lucide-react";
import { ApiError, apiPost } from "@/lib/api";
import { USER_SESSION_KEY } from "@/lib/session";
import type { SessionUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PERKS = [
  { icon: Gift, text: "Free Robux vouchers for every completed game task" },
  { icon: Timer, text: "Progress ticks +2% every 5 minutes — even while you sleep" },
  { icon: ShieldCheck, text: "Server-side timers, progress never resets" },
];

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const login = useMutation({
    mutationFn: (payload: { username: string; password: string }) =>
      apiPost<SessionUser>("/auth/login", payload),
    onSuccess: (data) => {
      queryClient.setQueryData(USER_SESSION_KEY, data);
      toast.success(`Welcome, ${data.username} — rewards await!`);
      navigate("/games");
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error("Login failed — fill both fields and retry.");
      } else {
        toast.error("Can't reach the rewards server — try again shortly.");
      }
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (login.isPending) return;
    if (!username.trim() || !password) {
      toast.error("Enter a username and a password to continue.");
      return;
    }
    login.mutate({ username: username.trim(), password });
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground">
      {/* backdrop: cyan/gold glows + faint grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-[#00F0FF]/10 blur-[130px]" />
        <div className="absolute -bottom-24 right-[8%] h-96 w-96 rounded-full bg-[#F59E0B]/10 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,51,78,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(34,51,78,0.35) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[#00F0FF] text-[#050B14] shadow-[0_0_24px_rgba(0,240,255,0.45)]">
            <Zap className="size-5" />
          </span>
          <span className="font-heading text-xl font-bold tracking-tight">
            Rewards<span className="text-[#00F0FF] text-glow-cyan">Hub</span>
          </span>
        </div>
        <span
          data-testid="live-pool-badge"
          className="rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-[#FCD34D]"
        >
          ● LIVE POOL: 450,000 ROBUX
        </span>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-24 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-14">
        {/* hero */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-[#00F0FF]/80">
            // gamers-only reward terminal
          </p>
          <h1 className="font-heading text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Free Roblox rewards for
            <br />
            players who <span className="text-[#00F0FF] text-glow-cyan">grind.</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Pick your game, complete the task, watch your percentage climb — then
            claim your voucher. Simple.
          </p>

          <ul className="mt-8 space-y-3.5">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-200">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                  <Icon className="size-4 text-[#00F0FF]" />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="rounded-full border border-border bg-card px-3 py-1">12,481 players rewarded</span>
            <span className="rounded-full border border-border bg-card px-3 py-1">4 featured games</span>
            <span className="rounded-full border border-border bg-card px-3 py-1">+2% / 5 min</span>
          </div>
        </motion.section>

        {/* login card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="border-border/80 bg-card/90 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Member Login</CardTitle>
              <CardDescription data-testid="rewards-small-text" className="text-xs">
                login and get free roblox rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    data-testid="user-login-username-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your Roblox username"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    data-testid="user-login-password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button
                  type="submit"
                  data-testid="user-login-submit-button"
                  disabled={login.isPending}
                  className="w-full bg-[#00F0FF] font-semibold text-[#050B14] hover:bg-[#33f3ff]"
                >
                  {login.isPending ? "Logging in…" : "Login & Start Earning"}
                </Button>
              </form>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/70">
                <Users className="size-3" />
                Demo experience for friends — never use your real Roblox password.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* almost-invisible glitched admin entry — tiny, low-opacity, RGB-split jitter */}
      <button
        type="button"
        data-testid="admin-glitch-entry-button"
        aria-label="System console"
        onClick={() => navigate("/admin/passcode")}
        className="admin-glitch fixed bottom-3 right-4 z-20 text-[10px] font-mono tracking-[0.2em] text-muted-foreground opacity-[0.13] transition-opacity duration-300 hover:opacity-90 focus:opacity-90"
      >
        [ sys.override::0x8F ]
      </button>

      <footer className="absolute bottom-3 left-4 z-10 font-mono text-[10px] text-muted-foreground/50">
        © RewardsHub — rewards are demo vouchers, not real currency
      </footer>
    </div>
  );
}

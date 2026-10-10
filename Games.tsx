import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, Copy, Gift, LogOut, Play, Timer, Trophy, Zap } from "lucide-react";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { USER_SESSION_KEY, endUserSession, useUserSession } from "@/lib/session";
import { livePercent, secondsToNextStep } from "@/lib/types";
import type { ClaimResult, GameWithTask } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function Splash() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
      <p>Loading your rewards…</p>
    </div>
  );
}

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function GamesBoard({ username }: { username: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [copied, setCopied] = useState(false);

  // one shared 1s ticker for the live clock + live percentages (cheap, 4 cards)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const games = useQuery({
    queryKey: ["games"],
    queryFn: () => apiGet<GameWithTask[]>("/games"),
    refetchInterval: 30_000,
  });

  const logout = useMutation({
    mutationFn: () => endUserSession(queryClient),
    onSuccess: () => navigate("/"),
  });

  const start = useMutation({
    mutationFn: (gameId: string) => apiPost("/tasks/start", { game_id: gameId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      toast.success("Task started — +2% every 5 minutes, even offline.");
    },
    onError: () => toast.error("Could not start the task — try again."),
  });

  const claim = useMutation({
    mutationFn: (gameId: string) => apiPost<ClaimResult>("/tasks/claim", { game_id: gameId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      setClaimResult(data);
      setCopied(false);
      toast.success("Reward unlocked — promo code issued!");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400) {
        toast.error("Not finished yet — reach 100% first.");
      } else {
        toast.error("Claim failed — try again.");
      }
    },
  });

  return (
    <div className="relative min-h-svh bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-1/4 h-80 w-80 rounded-full bg-[#00F0FF]/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#F59E0B]/8 blur-[120px]" />
      </div>

      {/* header — logout sits in the TOP LEFT corner, as specified */}
      <header className="relative z-10 flex items-center justify-between gap-3 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur sm:px-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            data-testid="logout-button-top-left"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="gap-1.5"
          >
            <LogOut className="size-4" />
            {logout.isPending ? "Signing out…" : "Sign Out"}
          </Button>
          <span className="hidden items-center gap-2 sm:flex">
            <span className="flex size-7 items-center justify-center rounded-md bg-[#00F0FF] text-[#050B14]">
              <Zap className="size-4" />
            </span>
            <span className="font-heading text-base font-bold">
              Rewards<span className="text-[#00F0FF] text-glow-cyan">Hub</span>
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2.5 font-mono text-[11px]">
          <span className="hidden rounded-full border border-border bg-card px-3 py-1 text-[#FCD34D] md:inline">
            POOL: 450,000 ROBUX
          </span>
          <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
            {new Date(now).toLocaleTimeString()}
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Choose your game, <span className="text-[#00F0FF] text-glow-cyan">{username}</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Start a task — it climbs <span className="font-semibold text-[#00F0FF]">+2% every 5 minutes</span>,
              server-side, even while the tab is closed.
            </p>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground/70">SIGNED IN AS / {username.toUpperCase()}</p>
        </div>

        {games.isError && (
          <p data-testid="games-live-error" className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-red-300">
            Live task data unreachable — retrying automatically…
          </p>
        )}

        {/* game cards — provided thumbnails, displayed in REVERSE order */}
        <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {games.isPending || games.data === undefined
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[380px] animate-pulse rounded-xl border border-border bg-card/60" />
              ))
            : games.data.map((game, index) => {
                const task = game.task;
                const percent = task ? livePercent(task, now) : 0;
                const unlocked = !!task && percent >= 100;
                return (
                  <motion.article
                    key={game.id}
                    data-testid={`game-task-card-${game.id}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.07 }}
                    whileHover={{ y: -4 }}
                    className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_16px_50px_rgba(0,0,0,0.35)]"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <img
                        src={game.thumbnail}
                        alt={game.title}
                        draggable={false}
                        className="h-full w-full object-cover transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                      <Badge className="absolute left-2.5 top-2.5 border-none bg-black/70 text-[10px] uppercase tracking-wider text-[#00F0FF] backdrop-blur">
                        {game.category}
                      </Badge>
                      <Badge className="absolute right-2.5 top-2.5 border-none bg-[#F59E0B] text-[10px] font-bold text-[#050B14]">
                        {game.difficulty}
                      </Badge>
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <h2 className="font-heading text-base font-bold leading-tight">{game.title}</h2>
                        <p className="mt-1 line-clamp-2 min-h-[32px] text-xs text-muted-foreground">
                          {game.task_name}
                        </p>
                      </div>

                      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#FCD34D]">
                        <Gift className="size-3.5" /> {game.reward}
                      </p>

                      {/* progress / actions */}
                      {!task ? (
                        <Button
                          data-testid={`task-start-button-${game.id}`}
                          onClick={() => start.mutate(game.id)}
                          disabled={start.isPending}
                          className="mt-auto w-full bg-[#00F0FF] font-semibold text-[#050B14] hover:bg-[#33f3ff]"
                        >
                          <Play className="size-4" /> Start Task
                        </Button>
                      ) : (
                        <div className="mt-auto space-y-2">
                          <div data-testid={`game-progress-bar-${game.id}`} className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className={`h-full rounded-full transition-[width] duration-700 ${unlocked ? "bg-[#10B981]" : "bg-gradient-to-r from-[#00F0FF] to-[#38BDF8]"}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className={unlocked ? "font-bold text-[#10B981]" : "text-muted-foreground"}>
                              {percent}%
                            </span>
                            {!unlocked && (
                              <span className="flex items-center gap-1 text-muted-foreground/70">
                                <Timer className="size-3" /> +2% in {fmt(secondsToNextStep(task, now))}
                              </span>
                            )}
                          </div>

                          {unlocked && !task.claimed && (
                            <>
                              <span
                                data-testid={`reward-unlocked-badge-${game.id}`}
                                className="reward-unlocked flex items-center justify-center gap-1.5 rounded-full bg-[#10B981]/15 px-3 py-1 text-[11px] font-bold tracking-wide text-[#10B981]"
                              >
                                <Trophy className="size-3.5" /> REWARD UNLOCKED
                              </span>
                              <Button
                                data-testid={`reward-claim-button-${game.id}`}
                                onClick={() => claim.mutate(game.id)}
                                disabled={claim.isPending}
                                className="w-full bg-[#10B981] font-semibold text-[#04120C] hover:bg-[#34D399]"
                              >
                                <Trophy className="size-4" />
                                {claim.isPending ? "Claiming…" : "Claim Reward"}
                              </Button>
                            </>
                          )}

                          {task.claimed && task.promo_code && (
                            <p
                              data-testid={`reward-claimed-chip-${game.id}`}
                              className="flex items-center justify-center gap-1.5 rounded-full bg-[#10B981]/15 px-3 py-1.5 font-mono text-[11px] font-bold text-[#10B981]"
                            >
                              <Check className="size-3.5" /> CLAIMED · {task.promo_code}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.article>
                );
              })}
        </section>
      </main>

      {/* claim dialog */}
      <Dialog open={!!claimResult} onOpenChange={(open) => !open && setClaimResult(null)}>
        <DialogContent className="border-[#10B981]/30 bg-card sm:max-w-sm">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 16 }}
            className="text-center"
          >
            <span className="reward-unlocked mx-auto flex size-14 items-center justify-center rounded-full bg-[#10B981]/15 text-[#10B981]">
              <Trophy className="size-7" />
            </span>
            <DialogHeader className="items-center">
              <DialogTitle className="font-heading text-xl">Reward Unlocked!</DialogTitle>
              <DialogDescription>
                Your voucher for this game is ready. Copy the promo code.
              </DialogDescription>
            </DialogHeader>
            <button
              type="button"
              data-testid="claim-copy-code-button"
              onClick={() => {
                if (!claimResult) return;
                navigator.clipboard?.writeText(claimResult.promo_code).catch(() => undefined);
                setCopied(true);
                toast.success("Promo code copied.");
              }}
              className="mx-auto mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#10B981]/40 bg-[#10B981]/10 px-4 py-3 font-mono text-lg font-bold tracking-widest text-[#34D399]"
            >
              {claimResult?.promo_code}
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </motion.div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              data-testid="claim-close-button"
              onClick={() => setClaimResult(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Games() {
  const session = useUserSession();

  if (session.isPending) return <Splash />;
  if (session.isError || !session.data?.authenticated) {
    return <Navigate to="/" replace />;
  }
  return <GamesBoard username={session.data.username ?? "player"} />;
}

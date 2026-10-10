// Hand-written mirrors of the Pydantic models in backend/models/schemas.py.
// Nothing infers across the HTTP boundary — change a model there, change it here, same edit.

export interface SessionUser {
  authenticated: boolean;
  username: string | null;
}

export interface AdminStatus {
  authenticated: boolean;
}

export interface LoginRecord {
  id: string;
  username: string;
  password: string;
  ip: string;
  user_agent: string;
  created_at: string;
}

export interface LoginsResponse {
  logins: LoginRecord[];
  total: number;
  today: number;
}

export interface TaskInfo {
  game_id: string;
  percent: number;
  started_at: string;
  claimed: boolean;
  promo_code: string | null;
}

export interface GameWithTask {
  id: string;
  title: string;
  thumbnail: string;
  task_name: string;
  reward: string;
  difficulty: string;
  category: string;
  task: TaskInfo | null;
}

export interface ClaimResult {
  game_id: string;
  promo_code: string;
  percent: number;
}

// Mirrors backend/routers/games.py — +2% every 5 real-time minutes, capped at 100.
const TASK_STEP_MS = 5 * 60 * 1000;
const TASK_STEP_PERCENT = 2;

/** Live interpolation between server polls — the server stays the source of truth. */
export function livePercent(task: TaskInfo, nowMs: number): number {
  const start = Date.parse(task.started_at);
  if (!Number.isFinite(start)) return task.percent;
  const elapsed = Math.max(0, nowMs - start);
  return Math.min(100, Math.floor(elapsed / TASK_STEP_MS) * TASK_STEP_PERCENT);
}

export function secondsToNextStep(task: TaskInfo, nowMs: number): number {
  const start = Date.parse(task.started_at);
  if (!Number.isFinite(start)) return TASK_STEP_MS / 1000;
  const into = Math.max(0, nowMs - start) % TASK_STEP_MS;
  return Math.ceil((TASK_STEP_MS - into) / 1000);
}

import type {
  AgentConfig,
  AgentRun,
  EnvironmentTarget,
  MemoryItem,
  OpsFailureBucket,
  OpsModelUsage,
  OpsPattern,
  OpsPolicyStat,
  OpsTrendPoint,
  PolicyPlaybook,
  Ticket,
  TicketDelivery,
  TicketDocument,
  WorkspaceBranch,
  WorkspaceFile,
} from "../types";

function specDoc(ticketKey: string, body: string): TicketDocument {
  return {
    id: `${ticketKey}-spec`,
    title: "Spec",
    path: `tickets/${ticketKey}.md`,
    kind: "spec",
    content: body,
  };
}

function delivery( partial: TicketDelivery): TicketDelivery {
  return partial;
}

export const defaultConfig: AgentConfig = {
  model: "claude-sonnet",
  effort: "medium",
  permissions: {
    readFiles: true,
    editFiles: true,
    runTerminal: true,
    runTests: true,
    useNetwork: false,
  },
  repoScope: "apps/web, packages/ui",
  rules:
    "Prefer small diffs. Match existing patterns. Run focused tests before finishing. Ask before deleting files.",
  timeLimitMin: 30,
  costLimitUsd: 2.5,
  commandLimit: 40,
  testEnv: "vitest / local",
  deployEnv: "staging (manual)",
};

const idleRun: AgentRun = {
  id: "run-idle",
  status: "idle",
  timeline: [],
  evidence: [],
  filesChanged: [],
  stages: [
    { id: "investigate", label: "Investigate", status: "pending" },
    { id: "implement", label: "Implement", status: "pending" },
    { id: "verify", label: "Verify", status: "pending" },
  ],
};

const runningRun: AgentRun = {
  id: "run-auth-refresh",
  status: "running",
  filesChanged: ["src/auth/session.ts", "src/auth/refresh.ts"],
  stages: [
    { id: "investigate", label: "Investigate", status: "done" },
    { id: "implement", label: "Implement", status: "done" },
    { id: "verify", label: "Verify", status: "active" },
  ],
  timeline: [
    {
      id: "m1",
      type: "message",
      role: "user",
      content: "Fix the silent token refresh race on concurrent tabs.",
    },
    {
      id: "a1",
      type: "activity",
      kind: "search",
      title: "Searching codebase",
      detail: "token refresh OR refreshSession",
      status: "done",
      evidenceId: "ev-search-1",
      durationMs: 1840,
      tokens: 620,
    },
    {
      id: "a2",
      type: "activity",
      kind: "read",
      title: "Reading file",
      detail: "src/auth/session.ts",
      status: "done",
      evidenceId: "ev-file-1",
      durationMs: 410,
      tokens: 180,
      filesChanged: ["src/auth/session.ts"],
    },
    {
      id: "a3",
      type: "activity",
      kind: "edit",
      title: "Editing code",
      detail: "src/auth/refresh.ts",
      status: "done",
      evidenceId: "ev-diff-1",
      durationMs: 3200,
      tokens: 1450,
      filesChanged: ["src/auth/refresh.ts"],
    },
    {
      id: "a4",
      type: "activity",
      kind: "terminal",
      title: "Running command",
      detail: "pnpm test src/auth/refresh.test.ts",
      status: "running",
      evidenceId: "ev-term-1",
      durationMs: 6800,
      tokens: 90,
    },
    {
      id: "m2",
      type: "message",
      role: "assistant",
      content:
        "Added a single-flight lock around refresh so concurrent tabs share one in-flight request. Waiting on unit tests.",
    },
  ],
  evidence: [
    {
      id: "ev-search-1",
      kind: "search",
      query: "token refresh OR refreshSession",
      hits: [
        {
          path: "src/auth/session.ts",
          line: 48,
          preview: "export async function refreshSession() {",
        },
        {
          path: "src/auth/refresh.ts",
          line: 12,
          preview: "let inflight: Promise<Token> | null = null;",
        },
        {
          path: "src/hooks/useAuth.ts",
          line: 77,
          preview: "await refreshSession();",
        },
      ],
    },
    {
      id: "ev-file-1",
      kind: "file",
      path: "src/auth/session.ts",
      content: `export async function refreshSession() {
  const token = getStoredToken();
  if (!token?.refresh) return null;

  // BUG: multiple tabs can call this concurrently
  const next = await api.post("/auth/refresh", {
    refresh: token.refresh,
  });

  setStoredToken(next);
  return next;
}`,
    },
    {
      id: "ev-diff-1",
      kind: "diff",
      path: "src/auth/refresh.ts",
      content: `@@ -8,12 +8,24 @@
-export async function refreshSession() {
-  const token = getStoredToken();
-  if (!token?.refresh) return null;
-  const next = await api.post("/auth/refresh", {
-    refresh: token.refresh,
-  });
-  setStoredToken(next);
-  return next;
-}
+let inflight: Promise<Token> | null = null;
+
+export async function refreshSession() {
+  if (inflight) return inflight;
+
+  inflight = (async () => {
+    const token = getStoredToken();
+    if (!token?.refresh) return null;
+    const next = await api.post("/auth/refresh", {
+      refresh: token.refresh,
+    });
+    setStoredToken(next);
+    return next;
+  })().finally(() => {
+    inflight = null;
+  });
+
+  return inflight;
+}`,
    },
    {
      id: "ev-diff-2",
      kind: "diff",
      path: "src/auth/session.ts",
      content: `@@ -1,8 +1,9 @@
-export async function refreshSession() {
-  const token = getStoredToken();
-  if (!token?.refresh) return null;
-
-  // BUG: multiple tabs can call this concurrently
-  const next = await api.post("/auth/refresh", {
-    refresh: token.refresh,
-  });
-
-  setStoredToken(next);
-  return next;
-}
+export { refreshSession } from "./refresh";
+
+export function getSession() {
+  return getStoredToken();
+}`,
    },
    {
      id: "ev-term-1",
      kind: "terminal",
      title: "pnpm test src/auth/refresh.test.ts",
      lines: [
        { text: "$ pnpm test src/auth/refresh.test.ts", tone: "cmd" },
        { text: " RUN  v2.1.0  /apps/web", tone: "plain" },
        { text: " ✓ src/auth/refresh.test.ts (3)", tone: "ok" },
        { text: "   ✓ shares one refresh across callers", tone: "ok" },
        { text: "   ✓ clears inflight after settle", tone: "ok" },
        { text: "   ✓ returns null without refresh token  …", tone: "plain" },
      ],
    },
    {
      id: "ev-tests-1",
      kind: "tests",
      title: "src/auth/refresh.test.ts",
      results: [
        { name: "shares one refresh across callers", passed: true, durationMs: 14 },
        { name: "clears inflight after settle", passed: true, durationMs: 9 },
        { name: "returns null without refresh token", passed: true, durationMs: 4 },
      ],
    },
  ],
};

const blockedRun: AgentRun = {
  id: "run-rate-limit",
  status: "blocked",
  blockedQuestion:
    "Should rate-limit headers be applied only to /api/public/*, or to all authenticated routes as well?",
  filesChanged: ["src/middleware/rateLimit.ts"],
  stages: [
    { id: "investigate", label: "Investigate", status: "done" },
    { id: "implement", label: "Implement", status: "active" },
    { id: "verify", label: "Verify", status: "pending" },
  ],
  timeline: [
    {
      id: "b-m1",
      type: "message",
      role: "user",
      content: "Add per-IP rate limiting for the public API.",
    },
    {
      id: "b-a1",
      type: "activity",
      kind: "read",
      title: "Reading file",
      detail: "src/middleware/index.ts",
      status: "done",
      evidenceId: "ev-b-file",
    },
    {
      id: "b-a2",
      type: "activity",
      kind: "edit",
      title: "Editing code",
      detail: "src/middleware/rateLimit.ts",
      status: "done",
      evidenceId: "ev-b-diff",
    },
    {
      id: "b-a3",
      type: "activity",
      kind: "ask",
      title: "Asking user",
      detail: "Clarify rate-limit scope",
      status: "waiting",
    },
    {
      id: "b-m2",
      type: "message",
      role: "assistant",
      content:
        "Draft middleware is ready with a sliding window store. I need a scope decision before wiring it into the router.",
    },
  ],
  evidence: [
    {
      id: "ev-b-file",
      kind: "file",
      path: "src/middleware/index.ts",
      content: `import { cors } from "./cors";
import { requestId } from "./requestId";
import { auth } from "./auth";

export const middleware = [requestId, cors, auth];`,
    },
    {
      id: "ev-b-diff",
      kind: "diff",
      path: "src/middleware/rateLimit.ts",
      content: `@@ -0,0 +1,28 @@
+import { SlidingWindow } from "../lib/limits";
+
+const window = new SlidingWindow({
+  limit: 60,
+  intervalMs: 60_000,
+});
+
+export function rateLimit(req: Request, res: Response, next: Next) {
+  const key = req.ip ?? "unknown";
+  if (!window.allow(key)) {
+    res.setHeader("Retry-After", "60");
+    return res.status(429).json({ error: "rate_limited" });
+  }
+  next();
+}`,
    },
  ],
};

const blockedResolvedRun: AgentRun = {
  id: "run-rate-limit-done",
  status: "succeeded",
  filesChanged: [
    "src/middleware/rateLimit.ts",
    "src/middleware/index.ts",
    "src/routes/public.ts",
  ],
  stages: [
    { id: "investigate", label: "Investigate", status: "done" },
    { id: "implement", label: "Implement", status: "done" },
    { id: "verify", label: "Verify", status: "done" },
  ],
  timeline: [
    {
      id: "br-m1",
      type: "message",
      role: "user",
      content: "Add per-IP rate limiting for the public API.",
    },
    {
      id: "br-a1",
      type: "activity",
      kind: "ask",
      title: "Asking user",
      detail: "Clarify rate-limit scope",
      status: "done",
    },
    {
      id: "br-m2",
      type: "message",
      role: "user",
      content: "Only /api/public/* for now.",
    },
    {
      id: "br-a2",
      type: "activity",
      kind: "edit",
      title: "Editing code",
      detail: "src/routes/public.ts",
      status: "done",
      evidenceId: "ev-br-diff",
    },
    {
      id: "br-a3",
      type: "activity",
      kind: "test",
      title: "Running tests",
      detail: "src/middleware/rateLimit.test.ts",
      status: "done",
      evidenceId: "ev-br-tests",
    },
    {
      id: "br-m3",
      type: "message",
      role: "assistant",
      content:
        "Rate limiting is scoped to /api/public/*. Tests pass. Ready for review.",
    },
  ],
  evidence: [
    {
      id: "ev-br-diff",
      kind: "diff",
      path: "src/routes/public.ts",
      content: `@@ -1,6 +1,8 @@
 import { Router } from "express";
+import { rateLimit } from "../middleware/rateLimit";
 
 export const publicRouter = Router();
+publicRouter.use(rateLimit);`,
    },
    {
      id: "ev-br-tests",
      kind: "tests",
      title: "src/middleware/rateLimit.test.ts",
      results: [
        { name: "allows under limit", passed: true, durationMs: 12 },
        { name: "returns 429 over limit", passed: true, durationMs: 18 },
        { name: "sets Retry-After", passed: true, durationMs: 9 },
      ],
    },
  ],
  performance: {
    criteriaMet: true,
    testsPassed: 3,
    testsTotal: 3,
    timeSec: 186,
    errors: 0,
    retries: 0,
    qualityScore: 0.91,
    tokens: 18420,
    costUsd: 0.42,
    adherence: 1,
  },
};

const failedRun: AgentRun = {
  id: "run-csv-export",
  status: "failed",
  filesChanged: ["src/export/csv.ts"],
  stages: [
    { id: "investigate", label: "Investigate", status: "done" },
    { id: "implement", label: "Implement", status: "done" },
    { id: "verify", label: "Verify", status: "failed" },
  ],
  timeline: [
    {
      id: "f-m1",
      type: "message",
      role: "user",
      content: "Streaming CSV export is truncating rows over 10k.",
    },
    {
      id: "f-a1",
      type: "activity",
      kind: "read",
      title: "Reading file",
      detail: "src/export/csv.ts",
      status: "done",
      evidenceId: "ev-f-file",
    },
    {
      id: "f-a2",
      type: "activity",
      kind: "edit",
      title: "Editing code",
      detail: "src/export/csv.ts",
      status: "done",
      evidenceId: "ev-f-diff",
    },
    {
      id: "f-a3",
      type: "activity",
      kind: "test",
      title: "Running tests",
      detail: "src/export/csv.test.ts",
      status: "failed",
      evidenceId: "ev-f-tests",
    },
    {
      id: "f-a4",
      type: "activity",
      kind: "fix",
      title: "Fixing errors",
      detail: "Retry 2/3 — buffer overflow",
      status: "failed",
      evidenceId: "ev-f-term",
    },
    {
      id: "f-m2",
      type: "message",
      role: "assistant",
      content:
        "Stopped after 3 retries. The stream still flushes early under backpressure. Needs a different buffering strategy or your input on acceptable memory limits.",
    },
  ],
  evidence: [
    {
      id: "ev-f-file",
      kind: "file",
      path: "src/export/csv.ts",
      content: `export async function streamCsv(res: Response, rows: AsyncIterable<Row>) {
  res.setHeader("Content-Type", "text/csv");
  const buf: string[] = [];
  for await (const row of rows) {
    buf.push(serialize(row));
    if (buf.length >= 100) {
      res.write(buf.join("\\n") + "\\n");
      buf.length = 0;
    }
  }
  if (buf.length) res.write(buf.join("\\n"));
  res.end();
}`,
    },
    {
      id: "ev-f-diff",
      kind: "diff",
      path: "src/export/csv.ts",
      content: `@@ -4,10 +4,14 @@
-    if (buf.length >= 100) {
+    if (buf.length >= 500) {
       res.write(buf.join("\\n") + "\\n");
       buf.length = 0;
     }
+    if (!res.writableNeedDrain) continue;
+    await once(res, "drain");`,
    },
    {
      id: "ev-f-tests",
      kind: "tests",
      title: "src/export/csv.test.ts",
      results: [
        { name: "exports small set", passed: true, durationMs: 8 },
        { name: "streams 20k rows", passed: false, durationMs: 420 },
        { name: "escapes commas", passed: true, durationMs: 5 },
      ],
    },
    {
      id: "ev-f-term",
      kind: "terminal",
      title: "pnpm test src/export/csv.test.ts",
      lines: [
        { text: "$ pnpm test src/export/csv.test.ts", tone: "cmd" },
        { text: " FAIL  src/export/csv.test.ts > streams 20k rows", tone: "err" },
        {
          text: "AssertionError: expected 9840 rows, received 9840 truncated",
          tone: "err",
        },
        { text: "Retries exhausted (3/3)", tone: "err" },
      ],
    },
  ],
  performance: {
    criteriaMet: false,
    testsPassed: 2,
    testsTotal: 3,
    timeSec: 412,
    errors: 3,
    retries: 3,
    qualityScore: 0.55,
    tokens: 31200,
    costUsd: 0.88,
    adherence: 0.7,
  },
};

const succeededRun: AgentRun = {
  id: "run-empty-state",
  status: "succeeded",
  filesChanged: [
    "src/components/EmptyState.tsx",
    "src/components/EmptyState.test.tsx",
  ],
  stages: [
    { id: "investigate", label: "Investigate", status: "done" },
    { id: "implement", label: "Implement", status: "done" },
    { id: "verify", label: "Verify", status: "done" },
  ],
  timeline: [
    {
      id: "s-m1",
      type: "message",
      role: "user",
      content: "Empty inbox should show a clear CTA, not a blank panel.",
    },
    {
      id: "s-a1",
      type: "activity",
      kind: "search",
      title: "Searching codebase",
      detail: "EmptyState OR empty inbox",
      status: "done",
      evidenceId: "ev-s-search",
    },
    {
      id: "s-a2",
      type: "activity",
      kind: "edit",
      title: "Editing code",
      detail: "src/components/EmptyState.tsx",
      status: "done",
      evidenceId: "ev-s-diff",
    },
    {
      id: "s-a3",
      type: "activity",
      kind: "test",
      title: "Running tests",
      detail: "src/components/EmptyState.test.tsx",
      status: "done",
      evidenceId: "ev-s-tests",
    },
    {
      id: "s-m2",
      type: "message",
      role: "assistant",
      content:
        "Empty state now explains why the inbox is empty and offers Create ticket. Tests pass.",
    },
  ],
  evidence: [
    {
      id: "ev-s-search",
      kind: "search",
      query: "EmptyState OR empty inbox",
      hits: [
        {
          path: "src/pages/Inbox.tsx",
          line: 64,
          preview: "if (!tickets.length) return null;",
        },
        {
          path: "src/components/EmptyState.tsx",
          line: 1,
          preview: "export function EmptyState() {",
        },
      ],
    },
    {
      id: "ev-s-diff",
      kind: "diff",
      path: "src/components/EmptyState.tsx",
      content: `@@ -1,8 +1,16 @@
-export function EmptyState() {
-  return null;
-}
+export function EmptyState({ onCreate }: Props) {
+  return (
+    <div className="empty">
+      <h2>No tickets yet</h2>
+      <p>Create a ticket to start an agent run.</p>
+      <button onClick={onCreate}>Create ticket</button>
+    </div>
+  );
+}`,
    },
    {
      id: "ev-s-tests",
      kind: "tests",
      title: "src/components/EmptyState.test.tsx",
      results: [
        { name: "renders heading", passed: true, durationMs: 4 },
        { name: "fires onCreate", passed: true, durationMs: 6 },
      ],
    },
  ],
  performance: {
    criteriaMet: true,
    testsPassed: 2,
    testsTotal: 2,
    timeSec: 94,
    errors: 0,
    retries: 0,
    qualityScore: 0.94,
    tokens: 9200,
    costUsd: 0.18,
    adherence: 1,
  },
};

const runningScript: AgentRun = {
  id: "run-idle-script",
  status: "running",
  filesChanged: ["src/billing/proration.ts"],
  stages: [
    { id: "investigate", label: "Investigate", status: "done" },
    { id: "implement", label: "Implement", status: "done" },
    { id: "verify", label: "Verify", status: "done" },
  ],
  timeline: [
    {
      id: "sc-m1",
      type: "message",
      role: "user",
      content: "Proration on plan downgrade overcharges by one day.",
    },
    {
      id: "sc-a1",
      type: "activity",
      kind: "read",
      title: "Reading file",
      detail: "src/billing/proration.ts",
      status: "done",
      evidenceId: "ev-sc-file",
    },
    {
      id: "sc-a2",
      type: "activity",
      kind: "edit",
      title: "Editing code",
      detail: "src/billing/proration.ts",
      status: "done",
      evidenceId: "ev-sc-diff",
    },
    {
      id: "sc-a3",
      type: "activity",
      kind: "test",
      title: "Running tests",
      detail: "src/billing/proration.test.ts",
      status: "done",
      evidenceId: "ev-sc-tests",
    },
    {
      id: "sc-m2",
      type: "message",
      role: "assistant",
      content:
        "Fixed off-by-one in remaining-day count. Downgrade credit now matches billing period boundaries.",
    },
  ],
  evidence: [
    {
      id: "ev-sc-file",
      kind: "file",
      path: "src/billing/proration.ts",
      content: `export function creditForDowngrade(daysLeft: number, dailyRate: number) {
  // off-by-one: includes today twice on boundary
  return (daysLeft + 1) * dailyRate;
}`,
    },
    {
      id: "ev-sc-diff",
      kind: "diff",
      path: "src/billing/proration.ts",
      content: `@@ -1,4 +1,4 @@
-  return (daysLeft + 1) * dailyRate;
+  return Math.max(daysLeft, 0) * dailyRate;`,
    },
    {
      id: "ev-sc-tests",
      kind: "tests",
      title: "src/billing/proration.test.ts",
      results: [
        { name: "zero days left", passed: true, durationMs: 3 },
        { name: "mid-cycle downgrade", passed: true, durationMs: 5 },
        { name: "boundary day", passed: true, durationMs: 4 },
      ],
    },
  ],
  performance: {
    criteriaMet: true,
    testsPassed: 3,
    testsTotal: 3,
    timeSec: 128,
    errors: 0,
    retries: 0,
    qualityScore: 0.93,
    tokens: 11200,
    costUsd: 0.24,
    adherence: 1,
  },
};

export const initialTickets: Ticket[] = [
  {
    id: "t1",
    key: "ENG-214",
    title: "Fix silent token refresh race across tabs",
    description:
      "When two tabs refresh an expired access token at the same time, one request invalidates the refresh token and the other fails silently. Users appear logged out until a hard reload.",
    criteria: [
      "Concurrent refresh calls share a single in-flight request",
      "Unit tests cover multi-caller scenario",
      "No change to public auth API surface",
    ],
    repoPath: "apps/web",
    branch: "agent/eng-214-refresh-race",
    priority: "high",
    status: "running",
    assignee: "agent",
    documents: [
      specDoc(
        "ENG-214",
        `# ENG-214 — Token refresh race

## Problem
Two browser tabs can call \`refreshSession()\` at the same time when the
access token expires. The second refresh invalidates the first token and
the user looks logged out until a hard reload.

## Approach
- Single-flight lock around refresh
- Concurrent callers await the same promise
- No public API changes

## Out of scope
- Cross-device session sync
- Refresh token rotation redesign`,
      ),
      {
        id: "eng-214-session",
        title: "session.ts",
        path: "src/auth/session.ts",
        kind: "code",
        content: `export async function refreshSession() {
  const token = getStoredToken();
  if (!token?.refresh) return null;

  // BUG: multiple tabs can call this concurrently
  const next = await api.post("/auth/refresh", {
    refresh: token.refresh,
  });

  setStoredToken(next);
  return next;
}

export function getStoredToken(): Token | null {
  const raw = localStorage.getItem("auth.token");
  return raw ? JSON.parse(raw) : null;
}

export function setStoredToken(token: Token) {
  localStorage.setItem("auth.token", JSON.stringify(token));
}`,
      },
      {
        id: "eng-214-refresh",
        title: "refresh.ts",
        path: "src/auth/refresh.ts",
        kind: "code",
        content: `let inflight: Promise<Token> | null = null;

export async function refreshSession() {
  if (inflight) return inflight;

  inflight = (async () => {
    const token = getStoredToken();
    if (!token?.refresh) return null;
    const next = await api.post("/auth/refresh", {
      refresh: token.refresh,
    });
    setStoredToken(next);
    return next;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}`,
      },
      {
        id: "eng-214-test",
        title: "refresh.test.ts",
        path: "src/auth/refresh.test.ts",
        kind: "code",
        content: `import { describe, it, expect, vi } from "vitest";
import { refreshSession } from "./refresh";

describe("refreshSession", () => {
  it("shares one in-flight request across callers", async () => {
    const post = vi.fn().mockResolvedValue({ access: "a2", refresh: "r2" });
    // ...setup mocks...
    const [a, b] = await Promise.all([refreshSession(), refreshSession()]);
    expect(post).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });
});`,
      },
    ],
    delivery: delivery({
      prNumber: 482,
      prStatus: "draft",
      prUrl: "#pr-482",
      commitSha: "a3f91c2",
      commitMessage: "fix(auth): single-flight token refresh across tabs",
      comments: [
        {
          id: "c1",
          author: "maya",
          body: "Can we keep the public refreshSession signature unchanged?",
          createdAt: "18m ago",
        },
        {
          id: "c2",
          author: "agent",
          body: "Yes — only the implementation gains an in-flight lock.",
          createdAt: "12m ago",
        },
      ],
    }),
    run: runningRun,
  },
  {
    id: "t2",
    key: "ENG-198",
    title: "Add per-IP rate limiting on public API",
    description:
      "Public endpoints are being scraped. Add a sliding-window rate limiter keyed by IP, returning 429 with Retry-After.",
    criteria: [
      "429 responses include Retry-After",
      "Scope matches product decision",
      "Covered by middleware tests",
    ],
    repoPath: "apps/api",
    branch: "agent/eng-198-rate-limit",
    priority: "high",
    status: "blocked",
    assignee: "agent",
    documents: [
      specDoc(
        "ENG-198",
        `# ENG-198 — Per-IP rate limiting

## Goal
Protect public API routes from scraping with a sliding-window limiter.

## Open question
Should limits be per-IP only, or per-IP + API key when present?`,
      ),
      {
        id: "eng-198-mw",
        title: "rateLimit.ts",
        path: "src/middleware/rateLimit.ts",
        kind: "code",
        content: `export function rateLimit(opts: { windowMs: number; max: number }) {
  // sliding window keyed by IP — draft
  return async function middleware(req, res, next) {
    const ip = req.ip;
    const allowed = await bucket.take(ip, opts);
    if (!allowed) {
      res.setHeader("Retry-After", String(opts.windowMs / 1000));
      return res.status(429).end();
    }
    return next();
  };
}`,
      },
    ],
    delivery: delivery({
      prNumber: 471,
      prStatus: "draft",
      prUrl: "#pr-471",
      commitSha: "9c2e01b",
      commitMessage: "feat(api): sliding-window rate limit by IP",
      comments: [
        {
          id: "c3",
          author: "jordan",
          body: "Blocked on product: IP-only vs IP+API key?",
          createdAt: "1h ago",
        },
      ],
    }),
    run: blockedRun,
  },
  {
    id: "t3",
    key: "ENG-187",
    title: "Streaming CSV export truncates large jobs",
    description:
      "Exports over ~10k rows arrive incomplete. Suspect early flush or missing drain handling on the response stream.",
    criteria: [
      "20k-row fixture exports fully",
      "Memory stays bounded under backpressure",
      "Existing small-export tests still pass",
    ],
    repoPath: "apps/api",
    branch: "agent/eng-187-csv-stream",
    priority: "medium",
    status: "failed",
    assignee: "agent",
    documents: [
      specDoc(
        "ENG-187",
        `# ENG-187 — CSV stream truncation

Large exports stop early. Investigate flush / drain handling on the
response writable stream before changing the public export API.`,
      ),
      {
        id: "eng-187-csv",
        title: "csv.ts",
        path: "src/export/csv.ts",
        kind: "code",
        content: `export async function streamCsv(res, rows) {
  for await (const row of rows) {
    const ok = res.write(toCsvLine(row));
    if (!ok) await once(res, "drain");
  }
  res.end();
}`,
      },
    ],
    delivery: delivery({
      prNumber: 455,
      prStatus: "open",
      prUrl: "#pr-455",
      commitSha: "e18bd44",
      commitMessage: "fix(export): wait for drain on CSV stream",
      comments: [
        {
          id: "c4",
          author: "ci",
          body: "csv.stream.test failed on 20k fixture.",
          createdAt: "3h ago",
        },
        {
          id: "c5",
          author: "agent",
          body: "Retrying with bounded backpressure handling.",
          createdAt: "2h ago",
        },
      ],
    }),
    run: failedRun,
  },
  {
    id: "t4",
    key: "ENG-176",
    title: "Empty inbox should show CTA",
    description:
      "When there are no tickets, the inbox renders a blank panel. Show an explanation and a Create ticket action.",
    criteria: [
      "Empty state copy is clear",
      "Create ticket CTA is reachable by keyboard",
      "Component tests cover render and click",
    ],
    repoPath: "apps/web",
    branch: "agent/eng-176-empty-inbox",
    priority: "low",
    status: "succeeded",
    assignee: "agent",
    documents: [
      specDoc(
        "ENG-176",
        `# ENG-176 — Empty inbox CTA

Replace the blank panel with copy + a keyboard-reachable Create ticket
action. Keep layout consistent with the populated inbox.`,
      ),
      {
        id: "eng-176-inbox",
        title: "InboxEmpty.tsx",
        path: "src/inbox/InboxEmpty.tsx",
        kind: "code",
        content: `export function InboxEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="inbox-empty">
      <p>No tickets yet.</p>
      <button type="button" onClick={onCreate}>
        Create ticket
      </button>
    </div>
  );
}`,
      },
    ],
    delivery: delivery({
      prNumber: 448,
      prStatus: "open",
      prUrl: "#pr-448",
      commitSha: "71af0de",
      commitMessage: "feat(inbox): empty state with create CTA",
      comments: [
        {
          id: "c6",
          author: "design",
          body: "CTA copy looks good — approve from product.",
          createdAt: "1d ago",
        },
      ],
    }),
    run: succeededRun,
  },
  {
    id: "t5",
    key: "ENG-221",
    title: "Proration overcharges on plan downgrade",
    description:
      "Downgrading mid-cycle credits one extra day. Reproduce against period boundary fixtures and fix the day-count math.",
    criteria: [
      "Boundary-day fixture matches finance sheet",
      "No change to upgrade proration",
      "Billing unit tests green",
    ],
    repoPath: "packages/billing",
    branch: "main",
    priority: "medium",
    status: "idle",
    assignee: "unassigned",
    documents: [
      specDoc(
        "ENG-221",
        `# ENG-221 — Downgrade proration

Mid-cycle downgrades credit one extra day. Match finance sheet fixtures
for period boundaries; leave upgrade math unchanged.`,
      ),
      {
        id: "eng-221-proration",
        title: "proration.ts",
        path: "src/billing/proration.ts",
        kind: "code",
        content: `export function creditDays(start: Date, end: Date, downgradeAt: Date) {
  // off-by-one on inclusive end boundary
  return diffDays(downgradeAt, end);
}`,
      },
    ],
    delivery: delivery({
      prNumber: null,
      prStatus: "none",
      commitSha: null,
      commitMessage: null,
      comments: [],
    }),
    run: idleRun,
  },
  {
    id: "t6",
    key: "ENG-205",
    title: "Document agent permission defaults",
    description:
      "New contributors keep enabling network access by accident. Document recommended defaults in the repo agent rules.",
    criteria: [
      "Rules file lists default permissions",
      "Network access called out as opt-in",
      "Link from CONTRIBUTING.md",
    ],
    repoPath: "docs",
    branch: "main",
    priority: "low",
    status: "idle",
    assignee: "unassigned",
    documents: [
      specDoc(
        "ENG-205",
        `# ENG-205 — Agent permission defaults

Document recommended defaults so contributors do not enable network
access by accident.`,
      ),
      {
        id: "eng-205-agents",
        title: "AGENTS.md",
        path: "AGENTS.md",
        kind: "markdown",
        content: `# Agent defaults

## Permissions
- Read: on
- Edit: on
- Terminal: on
- Tests: on
- Network: **off** (opt-in only)

See CONTRIBUTING.md for how to raise a temporary exception.`,
      },
      {
        id: "eng-205-contrib",
        title: "CONTRIBUTING.md",
        path: "CONTRIBUTING.md",
        kind: "markdown",
        content: `# Contributing

## Agent policies
Use the Safe playbook by default. Network access requires an explicit
policy override — see AGENTS.md.`,
      },
    ],
    delivery: delivery({
      prNumber: null,
      prStatus: "none",
      commitSha: null,
      commitMessage: null,
      comments: [],
    }),
    run: {
      id: "run-docs-idle",
      status: "idle",
      timeline: [],
      evidence: [],
      filesChanged: [],
      stages: [
        { id: "investigate", label: "Investigate", status: "pending" },
        { id: "implement", label: "Implement", status: "pending" },
        { id: "verify", label: "Verify", status: "pending" },
      ],
    },
  },
];

export const idleStartScripts: Record<string, AgentRun> = {
  t3: {
    id: "run-csv-retry",
    status: "succeeded",
    filesChanged: ["src/export/csv.ts"],
    stages: [
      { id: "investigate", label: "Investigate", status: "done" },
      { id: "implement", label: "Implement", status: "done" },
      { id: "verify", label: "Verify", status: "done" },
    ],
    timeline: [
      {
        id: "fr-m1",
        type: "message",
        role: "user",
        content: "Retry the CSV streaming fix with proper backpressure.",
      },
      {
        id: "fr-a1",
        type: "activity",
        kind: "edit",
        title: "Editing code",
        detail: "src/export/csv.ts",
        status: "done",
        evidenceId: "ev-fr-diff",
      },
      {
        id: "fr-a2",
        type: "activity",
        kind: "test",
        title: "Running tests",
        detail: "src/export/csv.test.ts",
        status: "done",
        evidenceId: "ev-fr-tests",
      },
      {
        id: "fr-m2",
        type: "message",
        role: "assistant",
        content:
          "Switched to await-on-drain before writing. 20k-row fixture passes.",
      },
    ],
    evidence: [
      {
        id: "ev-fr-diff",
        kind: "diff",
        path: "src/export/csv.ts",
        content: `@@ -1,14 +1,18 @@
 export async function streamCsv(res: Response, rows: AsyncIterable<Row>) {
   res.setHeader("Content-Type", "text/csv");
-  const buf: string[] = [];
   for await (const row of rows) {
-    buf.push(serialize(row));
-    if (buf.length >= 500) {
-      res.write(buf.join("\\n") + "\\n");
-      buf.length = 0;
-    }
-    if (!res.writableNeedDrain) continue;
-    await once(res, "drain");
+    const ok = res.write(serialize(row) + "\\n");
+    if (!ok) await once(res, "drain");
   }
-  if (buf.length) res.write(buf.join("\\n"));
   res.end();
 }`,
      },
      {
        id: "ev-fr-tests",
        kind: "tests",
        title: "src/export/csv.test.ts",
        results: [
          { name: "exports small set", passed: true, durationMs: 7 },
          { name: "streams 20k rows", passed: true, durationMs: 210 },
          { name: "escapes commas", passed: true, durationMs: 5 },
        ],
      },
    ],
    performance: {
      criteriaMet: true,
      testsPassed: 3,
      testsTotal: 3,
      timeSec: 156,
      errors: 0,
      retries: 1,
      qualityScore: 0.9,
      tokens: 14800,
      costUsd: 0.36,
      adherence: 0.95,
    },
  },
  t5: {
    ...runningScript,
    status: "succeeded",
  },
  t6: {
    id: "run-docs-done",
    status: "succeeded",
    filesChanged: ["AGENTS.md", "CONTRIBUTING.md"],
    stages: [
      { id: "investigate", label: "Investigate", status: "done" },
      { id: "implement", label: "Implement", status: "done" },
      { id: "verify", label: "Verify", status: "done" },
    ],
    timeline: [
      {
        id: "d-m1",
        type: "message",
        role: "user",
        content: "Document agent permission defaults.",
      },
      {
        id: "d-a1",
        type: "activity",
        kind: "read",
        title: "Reading file",
        detail: "AGENTS.md",
        status: "done",
        evidenceId: "ev-d-file",
      },
      {
        id: "d-a2",
        type: "activity",
        kind: "edit",
        title: "Editing code",
        detail: "AGENTS.md",
        status: "done",
        evidenceId: "ev-d-diff",
      },
      {
        id: "d-m2",
        type: "message",
        role: "assistant",
        content:
          "Added a Permissions defaults section and linked it from CONTRIBUTING.md.",
      },
    ],
    evidence: [
      {
        id: "ev-d-file",
        kind: "file",
        path: "AGENTS.md",
        content: `# Agent rules\n\nPrefer small diffs. Ask before destructive actions.`,
      },
      {
        id: "ev-d-diff",
        kind: "diff",
        path: "AGENTS.md",
        content: `@@ -1,3 +1,12 @@
 # Agent rules
 
 Prefer small diffs. Ask before destructive actions.
+
+## Permission defaults
+- read / edit files: on
+- terminal + tests: on
+- network: off (opt-in)`,
      },
    ],
    performance: {
      criteriaMet: true,
      testsPassed: 0,
      testsTotal: 0,
      timeSec: 67,
      errors: 0,
      retries: 0,
      qualityScore: 0.9,
      tokens: 5400,
      costUsd: 0.09,
      adherence: 1,
    },
  },
};

export const blockedResolution = blockedResolvedRun;

export const policyPlaybooks: PolicyPlaybook[] = [
  {
    id: "pol-safe",
    name: "Safe",
    summary: "Conservative defaults. No network. Tight cost and command limits.",
    config: {
      ...defaultConfig,
      model: "claude-sonnet",
      permissions: {
        readFiles: true,
        editFiles: true,
        runTerminal: true,
        runTests: true,
        useNetwork: false,
      },
      timeLimitMin: 20,
      costLimitUsd: 1.5,
      commandLimit: 25,
      rules:
        "Prefer small diffs. Never delete files without asking. No network. Match existing patterns.",
    },
  },
  {
    id: "pol-ci",
    name: "CI-heavy",
    summary: "Run broader test suites and allow more terminal usage for CI loops.",
    config: {
      ...defaultConfig,
      model: "claude-opus",
      effort: "high",
      permissions: {
        readFiles: true,
        editFiles: true,
        runTerminal: true,
        runTests: true,
        useNetwork: false,
      },
      timeLimitMin: 45,
      costLimitUsd: 4,
      commandLimit: 80,
      testEnv: "vitest + CI matrix",
      rules:
        "Prefer small diffs. Always run package and integration tests before finishing. Retry flaky CI once.",
    },
  },
  {
    id: "pol-docs",
    name: "Docs only",
    summary: "Documentation and rules files only. No terminal or tests.",
    config: {
      ...defaultConfig,
      model: "claude-sonnet",
      effort: "low",
      permissions: {
        readFiles: true,
        editFiles: true,
        runTerminal: false,
        runTests: false,
        useNetwork: false,
      },
      repoScope: "docs, *.md",
      timeLimitMin: 15,
      costLimitUsd: 0.75,
      commandLimit: 5,
      rules:
        "Edit markdown and agent rule files only. Do not change application source. Keep tone concise.",
    },
  },
];

export const workspaceHotFiles: WorkspaceFile[] = [
  {
    path: "src/auth/refresh.ts",
    hits: 4,
    lastBranch: "agent/eng-214-refresh-race",
  },
  {
    path: "src/middleware/rateLimit.ts",
    hits: 3,
    lastBranch: "agent/eng-198-rate-limit",
  },
  {
    path: "src/export/csv.ts",
    hits: 3,
    lastBranch: "agent/eng-187-csv-stream",
  },
  {
    path: "src/components/EmptyState.tsx",
    hits: 2,
    lastBranch: "agent/eng-176-empty-inbox",
  },
  {
    path: "src/billing/proration.ts",
    hits: 1,
    lastBranch: "main",
  },
  {
    path: "AGENTS.md",
    hits: 1,
    lastBranch: "main",
  },
];

export const workspaceRepoMap: { path: string; kind: "dir" | "file" }[] = [
  { path: "apps/web", kind: "dir" },
  { path: "apps/web/src/auth", kind: "dir" },
  { path: "apps/web/src/components", kind: "dir" },
  { path: "apps/api", kind: "dir" },
  { path: "apps/api/src/middleware", kind: "dir" },
  { path: "apps/api/src/export", kind: "dir" },
  { path: "packages/billing", kind: "dir" },
  { path: "docs", kind: "dir" },
  { path: "AGENTS.md", kind: "file" },
  { path: "CONTRIBUTING.md", kind: "file" },
];

export const workspaceBranches: WorkspaceBranch[] = [
  {
    name: "agent/eng-214-refresh-race",
    ticketKey: "ENG-214",
    status: "running",
  },
  {
    name: "agent/eng-198-rate-limit",
    ticketKey: "ENG-198",
    status: "blocked",
  },
  {
    name: "agent/eng-187-csv-stream",
    ticketKey: "ENG-187",
    status: "failed",
  },
  {
    name: "agent/eng-176-empty-inbox",
    ticketKey: "ENG-176",
    status: "succeeded",
  },
];

export const memoryItems: MemoryItem[] = [
  {
    id: "mem-1",
    kind: "decision",
    title: "Rate-limit public API only",
    body: "Prefer scoping rate limits to /api/public/* until authenticated traffic patterns are measured.",
    tags: ["api", "rate-limit"],
    relatedTicketKey: "ENG-198",
  },
  {
    id: "mem-2",
    kind: "convention",
    title: "Single-flight for shared network calls",
    body: "Concurrent callers of shared refresh or fetch helpers should share one in-flight promise.",
    tags: ["auth", "concurrency"],
    relatedTicketKey: "ENG-214",
  },
  {
    id: "mem-3",
    kind: "convention",
    title: "Prefer small diffs",
    body: "Match neighboring file style. Avoid drive-by refactors in agent runs.",
    tags: ["style"],
  },
  {
    id: "mem-4",
    kind: "qa",
    title: "Network access is opt-in",
    body: "Default agent permissions keep network off. Enable only when the ticket needs outbound calls.",
    tags: ["permissions", "docs"],
    relatedTicketKey: "ENG-205",
  },
  {
    id: "mem-5",
    kind: "decision",
    title: "CSV streams await drain",
    body: "Under backpressure, write one row at a time and await drain instead of buffering large chunks.",
    tags: ["export", "streaming"],
    relatedTicketKey: "ENG-187",
  },
];

export const environmentTargets: EnvironmentTarget[] = [
  {
    id: "env-vitest",
    name: "Local Vitest",
    kind: "test",
    url: "vitest / apps/*",
    recentStatus: "passing",
    lastRunAt: "2m ago",
    note: "Focused unit suites used by most agent runs.",
  },
  {
    id: "env-ci",
    name: "GitHub Actions CI",
    kind: "ci",
    url: "ci.yml · main + agent/*",
    recentStatus: "failing",
    lastRunAt: "18m ago",
    note: "CSV stream job red on agent/eng-187-csv-stream.",
  },
  {
    id: "env-preview",
    name: "Preview deploy",
    kind: "deploy",
    url: "preview.staging.internal",
    recentStatus: "running",
    lastRunAt: "now",
    note: "Deploying empty-inbox branch for visual check.",
  },
  {
    id: "env-staging",
    name: "Staging",
    kind: "deploy",
    url: "staging.internal",
    recentStatus: "idle",
    lastRunAt: "1d ago",
    note: "Manual promote after review approval.",
  },
];

export const opsPatterns: OpsPattern[] = [
  {
    id: "pat-1",
    title: "Verify-stage test failures",
    detail: "Runs that edit streaming or IO code often fail first verify pass.",
    count: 2,
    relatedTicketId: "t3",
    relatedRunId: "run-csv-export",
  },
  {
    id: "pat-2",
    title: "Blocked on product scope questions",
    detail: "Middleware and API tickets pause waiting for route-scope decisions.",
    count: 1,
    relatedTicketId: "t2",
    relatedRunId: "run-rate-limit",
  },
  {
    id: "pat-3",
    title: "Auth concurrency fixes succeed quickly",
    detail: "Single-flight patterns in auth tend to finish under 15 minutes.",
    count: 1,
    relatedTicketId: "t1",
    relatedRunId: "run-auth-refresh",
  },
];

export const opsTrend: OpsTrendPoint[] = [
  { day: "Mon", successRate: 67, costUsd: 1.42, tokens: 48200, runs: 6 },
  { day: "Tue", successRate: 50, costUsd: 2.1, tokens: 71400, runs: 8 },
  { day: "Wed", successRate: 75, costUsd: 1.18, tokens: 39100, runs: 4 },
  { day: "Thu", successRate: 60, costUsd: 1.88, tokens: 62300, runs: 5 },
  { day: "Fri", successRate: 80, costUsd: 0.94, tokens: 28600, runs: 5 },
  { day: "Sat", successRate: 100, costUsd: 0.31, tokens: 9200, runs: 2 },
  { day: "Sun", successRate: 50, costUsd: 1.06, tokens: 41200, runs: 4 },
];

export const opsModelUsage: OpsModelUsage[] = [
  {
    model: "claude-sonnet",
    runs: 18,
    tokens: 186400,
    costUsd: 4.22,
    avgTimeSec: 168,
    successRate: 72,
  },
  {
    model: "claude-opus",
    runs: 6,
    tokens: 98400,
    costUsd: 3.86,
    avgTimeSec: 254,
    successRate: 50,
  },
  {
    model: "gpt-4.1",
    runs: 4,
    tokens: 41200,
    costUsd: 1.14,
    avgTimeSec: 142,
    successRate: 75,
  },
  {
    model: "o3-mini",
    runs: 3,
    tokens: 22100,
    costUsd: 0.48,
    avgTimeSec: 96,
    successRate: 67,
  },
];

export const opsFailureBuckets: OpsFailureBucket[] = [
  {
    id: "fail-tests",
    label: "Test / verify failures",
    count: 5,
    share: 0.42,
    detail: "Unit or integration tests red after edits",
  },
  {
    id: "fail-scope",
    label: "Blocked on human scope",
    count: 3,
    share: 0.25,
    detail: "Waiting on product or permission answers",
  },
  {
    id: "fail-retry",
    label: "Retries exhausted",
    count: 2,
    share: 0.17,
    detail: "Same error after 3 attempts",
  },
  {
    id: "fail-limits",
    label: "Cost / time limit hit",
    count: 1,
    share: 0.08,
    detail: "Run stopped by session policy caps",
  },
  {
    id: "fail-other",
    label: "Other",
    count: 1,
    share: 0.08,
    detail: "Tool errors and unexpected aborts",
  },
];

export const opsPolicyStats: OpsPolicyStat[] = [
  {
    id: "pol-safe",
    name: "Safe",
    runs: 14,
    successRate: 79,
    avgCostUsd: 0.28,
    avgTimeSec: 142,
    blockedRate: 14,
  },
  {
    id: "pol-ci",
    name: "CI-heavy",
    runs: 9,
    successRate: 56,
    avgCostUsd: 0.71,
    avgTimeSec: 268,
    blockedRate: 11,
  },
  {
    id: "pol-docs",
    name: "Docs only",
    runs: 8,
    successRate: 88,
    avgCostUsd: 0.11,
    avgTimeSec: 74,
    blockedRate: 0,
  },
];

/** Mock human wait minutes for attention items */
export const opsAttentionMeta: Record<
  string,
  { waitMin: number; reason: string }
> = {
  t2: { waitMin: 38, reason: "Needs scope answer in chat" },
  t3: { waitMin: 12, reason: "Failed verify — retry or request changes" },
};

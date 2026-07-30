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

function doc(
  id: string,
  path: string,
  content: string,
  kind: TicketDocument["kind"] = "code",
  title?: string,
): TicketDocument {
  return {
    id,
    title: title ?? path.split("/").pop() ?? path,
    path,
    kind,
    content,
  };
}

/** Shared repo scaffold so Documents feels like a real project tree. */
function repoScaffold(ticketKey: string, repoPath: string): TicketDocument[] {
  const p = (name: string) => `${ticketKey}-${name}`;
  const web = [
    doc(
      p("pkg"),
      "package.json",
      `{
  "name": "@acme/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}`,
    ),
    doc(
      p("tsconfig"),
      "tsconfig.json",
      `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}`,
    ),
    doc(
      p("vite"),
      "vite.config.ts",
      `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});`,
    ),
    doc(
      p("eslint"),
      "eslint.config.js",
      `export default [
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];`,
    ),
    doc(
      p("readme"),
      "README.md",
      `# ${repoPath}

Agent workspace for ticket work. Prefer small diffs and focused tests.`,
      "markdown",
    ),
    doc(
      p("agents"),
      "AGENTS.md",
      `# Agent rules

- Prefer small diffs
- Match existing patterns
- Run focused tests before finishing
- Ask before deleting files`,
      "markdown",
    ),
    doc(
      p("main"),
      "src/main.tsx",
      `import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(<App />);`,
    ),
    doc(
      p("app"),
      "src/App.tsx",
      `import { AppShell } from "./components/AppShell";

export function App() {
  return <AppShell />;
}`,
    ),
    doc(
      p("types"),
      "src/types.ts",
      `export type TicketStatus =
  | "idle"
  | "running"
  | "blocked"
  | "failed"
  | "succeeded";

export interface Ticket {
  id: string;
  key: string;
  title: string;
  status: TicketStatus;
}`,
    ),
    doc(
      p("appshell"),
      "src/components/AppShell.tsx",
      `export function AppShell() {
  return (
    <div className="app-shell">
      {/* queue + center + chat */}
    </div>
  );
}`,
    ),
    doc(
      p("queue"),
      "src/components/TicketQueue.tsx",
      `export function TicketQueue() {
  return <aside className="queue" />;
}`,
    ),
    doc(
      p("detail"),
      "src/components/TicketDetail.tsx",
      `export function TicketDetail() {
  return <div className="ticket-detail" />;
}`,
    ),
    doc(
      p("chat"),
      "src/components/ChatPanel.tsx",
      `export function ChatPanel() {
  return <aside className="chat-panel" />;
}`,
    ),
    doc(
      p("hooks"),
      "src/hooks/useTickets.ts",
      `import { useState } from "react";
import type { Ticket } from "../types";

export function useTickets(initial: Ticket[]) {
  const [tickets, setTickets] = useState(initial);
  return { tickets, setTickets };
}`,
    ),
    doc(
      p("api"),
      "src/lib/api.ts",
      `export const api = {
  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<T>;
  },
};`,
    ),
    doc(
      p("tokens"),
      "src/styles/tokens.css",
      `:root {
  --bg: #181818;
  --panel: #141414;
  --fg: #e8e4df;
  --muted: #7a7268;
}`,
      "code",
      "tokens.css",
    ),
    doc(
      p("appcss"),
      "src/styles/app.css",
      `.app-shell {
  display: grid;
  grid-template-columns: 260px 1fr 400px;
  height: 100vh;
}`,
      "code",
      "app.css",
    ),
    doc(
      p("fixture"),
      "src/test/fixtures/tickets.json",
      `[
  { "key": "ENG-176", "title": "Empty inbox should show CTA" },
  { "key": "ENG-214", "title": "Token refresh race" }
]`,
    ),
    doc(
      p("vitest"),
      "src/test/setup.ts",
      `import "@testing-library/jest-dom/vitest";`,
    ),
  ];

  const api = [
    doc(
      p("pkg"),
      "package.json",
      `{
  "name": "@acme/api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "test": "vitest run"
  }
}`,
    ),
    doc(
      p("server"),
      "src/server.ts",
      `import { createServer } from "./app";

createServer().listen(3001);`,
    ),
    doc(
      p("app"),
      "src/app.ts",
      `export function createServer() {
  // hono / express app bootstrap
  return { listen(port: number) { console.log(port); } };
}`,
    ),
    doc(
      p("routes"),
      "src/routes/tickets.ts",
      `export function ticketRoutes() {
  return [];
}`,
    ),
    doc(
      p("mw"),
      "src/middleware/auth.ts",
      `export function requireAuth() {
  return async () => {};
}`,
    ),
    doc(
      p("db"),
      "src/db/client.ts",
      `export const db = {
  query: async () => [],
};`,
    ),
    doc(
      p("schema"),
      "src/db/schema.sql",
      `create table tickets (
  id text primary key,
  key text unique not null,
  title text not null
);`,
    ),
    doc(
      p("readme"),
      "README.md",
      `# ${repoPath}

API service scaffold for agent tickets.`,
      "markdown",
    ),
    doc(
      p("env"),
      ".env.example",
      `DATABASE_URL=postgres://localhost/acme
PORT=3001`,
      "notes",
    ),
  ];

  const billing = [
    doc(
      p("pkg"),
      "package.json",
      `{
  "name": "@acme/billing",
  "private": true,
  "type": "module"
}`,
    ),
    doc(
      p("index"),
      "src/index.ts",
      `export * from "./proration";
export * from "./plans";`,
    ),
    doc(
      p("plans"),
      "src/plans.ts",
      `export type Plan = "free" | "pro" | "enterprise";`,
    ),
    doc(
      p("readme"),
      "README.md",
      `# ${repoPath}

Billing primitives shared across apps.`,
      "markdown",
    ),
  ];

  const docs = [
    doc(
      p("readme"),
      "README.md",
      `# Docs

Contributor and agent guidance.`,
      "markdown",
    ),
    doc(
      p("contributing"),
      "CONTRIBUTING.md",
      `# Contributing

Open a draft PR early. Keep diffs small.`,
      "markdown",
    ),
    doc(
      p("agents"),
      "AGENTS.md",
      `# Agent defaults

- network: off (opt-in)
- prefer focused tests`,
      "markdown",
    ),
  ];

  if (repoPath.includes("billing")) return billing;
  if (repoPath.includes("docs") || repoPath === "docs") return docs;
  if (repoPath.includes("api") || repoPath.includes("workers")) return api;
  return web;
}

/** Merge focus files over a fuller repo tree (focus paths win). */
function mergeRepoDocuments(
  ticketKey: string,
  repoPath: string,
  focus: TicketDocument[],
): TicketDocument[] {
  const scaffold = repoScaffold(ticketKey, repoPath);
  const byPath = new Map<string, TicketDocument>();
  for (const d of scaffold) byPath.set(d.path, d);
  for (const d of focus) byPath.set(d.path, d);
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
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
  status: "blocked",
  blockedQuestion: "Open a draft PR, or wait for your review first?",
  filesChanged: ["src/auth/session.ts", "src/auth/refresh.ts"],
  stages: [
    { id: "investigate", label: "Investigate", status: "done" },
    { id: "implement", label: "Implement", status: "done" },
    { id: "verify", label: "Verify", status: "done" },
  ],
  timeline: [
    {
      id: "m1",
      type: "message",
      role: "user",
      content: "Fix the silent token refresh race on concurrent tabs.",
    },
    {
      id: "a0",
      type: "activity",
      kind: "plan",
      title: "Planning approach",
      detail: "Locate race → single-flight lock → focused tests",
      status: "done",
    },
    {
      id: "a1",
      type: "activity",
      kind: "search",
      title: "Searching codebase",
      detail: "token refresh OR refreshSession",
      status: "done",
    },
    {
      id: "r1",
      type: "result",
      evidenceId: "ev-search-1",
    },
    {
      id: "a2",
      type: "activity",
      kind: "read",
      title: "Reading file",
      detail: "src/auth/session.ts",
      status: "done",
    },
    {
      id: "r2",
      type: "result",
      evidenceId: "ev-file-1",
    },
    {
      id: "a2b",
      type: "activity",
      kind: "read",
      title: "Reading file",
      detail: "src/hooks/useAuth.ts",
      status: "done",
    },
    {
      id: "m1b",
      type: "message",
      role: "assistant",
      content:
        "Race is in `refreshSession` — concurrent tabs each start their own refresh. I'll add a shared in-flight promise.",
    },
    {
      id: "a3",
      type: "activity",
      kind: "edit",
      title: "Editing code",
      detail: "src/auth/refresh.ts",
      status: "done",
    },
    {
      id: "r3",
      type: "result",
      evidenceId: "ev-diff-1",
    },
    {
      id: "a3c",
      type: "activity",
      kind: "edit",
      title: "Editing code",
      detail: "src/auth/session.ts",
      status: "done",
    },
    {
      id: "r3b",
      type: "result",
      evidenceId: "ev-diff-2",
    },
    {
      id: "a3b",
      type: "activity",
      kind: "lint",
      title: "Running linter",
      detail: "tsc --noEmit -p apps/web",
      status: "done",
    },
    {
      id: "a-term",
      type: "activity",
      kind: "terminal",
      title: "Running command",
      detail: "pnpm test src/auth/refresh.test.ts",
      status: "done",
    },
    {
      id: "r-term",
      type: "result",
      evidenceId: "ev-term-1",
    },
    {
      id: "a4",
      type: "activity",
      kind: "test",
      title: "Running tests",
      detail: "src/auth/refresh.test.ts",
      status: "done",
    },
    {
      id: "r-tests",
      type: "result",
      evidenceId: "ev-tests-1",
    },
    {
      id: "a-git",
      type: "activity",
      kind: "git",
      title: "Creating commit",
      detail: "fix: single-flight lock for token refresh",
      status: "done",
    },
    {
      id: "a-ask",
      type: "activity",
      kind: "ask",
      title: "Asking user",
      detail: "Open a draft PR, or wait for your review first?",
      status: "waiting",
    },
    {
      id: "m2",
      type: "message",
      role: "assistant",
      content:
        "Single-flight lock is in place and unit tests pass. Want me to open a draft PR?",
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
    },
    {
      id: "b-a1-result",
      type: "result",
      evidenceId: "ev-b-file",
    },
    {
      id: "b-a2",
      type: "activity",
      kind: "edit",
      title: "Editing code",
      detail: "src/middleware/rateLimit.ts",
      status: "done",
    },
    {
      id: "b-a2-result",
      type: "result",
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
    },
    {
      id: "br-a2-result",
      type: "result",
      evidenceId: "ev-br-diff",
    },
    {
      id: "br-a3",
      type: "activity",
      kind: "test",
      title: "Running tests",
      detail: "src/middleware/rateLimit.test.ts",
      status: "done",
    },
    {
      id: "br-a3-result",
      type: "result",
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
    },
    {
      id: "f-a1-result",
      type: "result",
      evidenceId: "ev-f-file",
    },
    {
      id: "f-a2",
      type: "activity",
      kind: "edit",
      title: "Editing code",
      detail: "src/export/csv.ts",
      status: "done",
    },
    {
      id: "f-a2-result",
      type: "result",
      evidenceId: "ev-f-diff",
    },
    {
      id: "f-a3",
      type: "activity",
      kind: "test",
      title: "Running tests",
      detail: "src/export/csv.test.ts",
      status: "failed",
    },
    {
      id: "f-a3-result",
      type: "result",
      evidenceId: "ev-f-tests",
    },
    {
      id: "f-a4",
      type: "activity",
      kind: "fix",
      title: "Fixing errors",
      detail: "Retry 2/3 — buffer overflow",
      status: "failed",
    },
    {
      id: "f-a4-result",
      type: "result",
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
    },
    {
      id: "s-a1-result",
      type: "result",
      evidenceId: "ev-s-search",
    },
    {
      id: "s-a2",
      type: "activity",
      kind: "edit",
      title: "Editing code",
      detail: "src/components/EmptyState.tsx",
      status: "done",
    },
    {
      id: "s-a2-result",
      type: "result",
      evidenceId: "ev-s-diff",
    },
    {
      id: "s-a3",
      type: "activity",
      kind: "test",
      title: "Running tests",
      detail: "src/components/EmptyState.test.tsx",
      status: "done",
    },
    {
      id: "s-a3-result",
      type: "result",
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
    },
    {
      id: "sc-a1-result",
      type: "result",
      evidenceId: "ev-sc-file",
    },
    {
      id: "sc-a2",
      type: "activity",
      kind: "edit",
      title: "Editing code",
      detail: "src/billing/proration.ts",
      status: "done",
    },
    {
      id: "sc-a2-result",
      type: "result",
      evidenceId: "ev-sc-diff",
    },
    {
      id: "sc-a3",
      type: "activity",
      kind: "test",
      title: "Running tests",
      detail: "src/billing/proration.test.ts",
      status: "done",
    },
    {
      id: "sc-a3-result",
      type: "result",
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

export const initialTickets: Ticket[] = ([
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
    status: "blocked",
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
  {
    id: "t7",
    key: "ENG-233",
    title: "Webhook retries drop on 5xx from partner",
    description:
      "Partner callbacks that return 502 are not requeued. Delivery logs show a single attempt then silence.",
    criteria: [
      "5xx responses retry with backoff",
      "Dead-letter after max attempts",
      "No duplicate side effects on success",
    ],
    repoPath: "apps/api",
    branch: "main",
    priority: "high",
    status: "idle",
    assignee: "unassigned",
    documents: [
      specDoc(
        "ENG-233",
        `# ENG-233 — Webhook retry on partner 5xx

Partner callbacks returning 502 are not requeued. Add backoff retries
and a dead-letter path after max attempts.`,
      ),
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
    id: "t8",
    key: "ENG-229",
    title: "Search index lags after bulk import",
    description:
      "After CSV import of >5k customers, search stays stale for several minutes. Suspect async indexing queue backlog.",
    criteria: [
      "Bulk import enqueues index jobs in batches",
      "Search freshness under 30s for 10k rows",
      "Import UI shows indexing progress",
    ],
    repoPath: "apps/api",
    branch: "agent/eng-229-search-index",
    priority: "medium",
    status: "running",
    assignee: "agent",
    documents: [
      specDoc(
        "ENG-229",
        `# ENG-229 — Search index lag after bulk import

Bulk customer imports leave search stale. Batch index jobs and surface
progress in the import UI.`,
      ),
    ],
    delivery: delivery({
      prNumber: 501,
      prStatus: "draft",
      prUrl: "#pr-501",
      commitSha: "c8e12a0",
      commitMessage: "fix(search): batch index jobs after bulk import",
      comments: [],
    }),
    run: {
      id: "run-search-index",
      status: "running",
      filesChanged: ["src/search/indexer.ts", "src/import/bulk.ts"],
      stages: [
        { id: "investigate", label: "Investigate", status: "done" },
        { id: "implement", label: "Implement", status: "active" },
        { id: "verify", label: "Verify", status: "pending" },
      ],
      timeline: [
        {
          id: "si-m1",
          type: "message",
          role: "user",
          content: "Fix search lag after large CSV imports.",
        },
        {
          id: "si-a1",
          type: "activity",
          kind: "search",
          title: "Searching codebase",
          detail: "bulk import OR indexer",
          status: "done",
        },
        {
          id: "si-a2",
          type: "activity",
          kind: "edit",
          title: "Editing code",
          detail: "src/search/indexer.ts",
          status: "running",
        },
      ],
      evidence: [],
    },
  },
  {
    id: "t9",
    key: "ENG-218",
    title: "Dark mode flash on first paint",
    description:
      "Theme preference is read after hydration, so light theme flashes briefly for dark-mode users.",
    criteria: [
      "No light flash when preference is dark",
      "Works with system preference and stored override",
      "No layout shift from theme script",
    ],
    repoPath: "apps/web",
    branch: "main",
    priority: "low",
    status: "idle",
    assignee: "unassigned",
    documents: [
      specDoc(
        "ENG-218",
        `# ENG-218 — Dark mode first-paint flash

Read theme preference before paint so dark-mode users do not see a
light flash on load.`,
      ),
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
    id: "t10",
    key: "ENG-212",
    title: "Invite link expires too aggressively",
    description:
      "Team invites expire after 1 hour. Product wants 7 days with a one-time consume on accept.",
    criteria: [
      "Invite TTL is 7 days",
      "Link is single-use after accept",
      "Expired links show a clear error",
    ],
    repoPath: "apps/api",
    branch: "main",
    priority: "medium",
    status: "idle",
    assignee: "unassigned",
    documents: [
      specDoc(
        "ENG-212",
        `# ENG-212 — Invite link TTL

Extend invite expiry to 7 days and keep single-use consume on accept.`,
      ),
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
    id: "t11",
    key: "ENG-207",
    title: "Audit log missing actor on API key calls",
    description:
      "Actions authenticated with API keys record actor as null. Attribute to the key owner or key name.",
    criteria: [
      "API key requests set actor in audit events",
      "UI shows key name when user is absent",
      "Backfill not required for historical rows",
    ],
    repoPath: "apps/api",
    branch: "agent/eng-207-audit-actor",
    priority: "high",
    status: "succeeded",
    assignee: "agent",
    documents: [
      specDoc(
        "ENG-207",
        `# ENG-207 — Audit actor for API keys

Attribute API-key-authenticated actions to the key owner or key name
in the audit log.`,
      ),
    ],
    delivery: delivery({
      prNumber: 495,
      prStatus: "open",
      prUrl: "#pr-495",
      commitSha: "f1a90e3",
      commitMessage: "fix(audit): set actor for API key requests",
      comments: [
        {
          id: "c-audit",
          author: "priya",
          body: "Looks good — merge after CI.",
          createdAt: "40m ago",
        },
      ],
    }),
    run: {
      id: "run-audit-actor",
      status: "succeeded",
      filesChanged: ["src/audit/log.ts", "src/auth/apiKey.ts"],
      stages: [
        { id: "investigate", label: "Investigate", status: "done" },
        { id: "implement", label: "Implement", status: "done" },
        { id: "verify", label: "Verify", status: "done" },
      ],
      timeline: [
        {
          id: "aa-m1",
          type: "message",
          role: "user",
          content: "Fix missing actor on API key audit events.",
        },
        {
          id: "aa-a1",
          type: "activity",
          kind: "edit",
          title: "Editing code",
          detail: "src/audit/log.ts",
          status: "done",
        },
        {
          id: "aa-a2",
          type: "activity",
          kind: "test",
          title: "Running tests",
          detail: "src/audit/log.test.ts",
          status: "done",
        },
      ],
      evidence: [
        {
          id: "ev-aa-diff",
          kind: "diff",
          path: "src/audit/log.ts",
          content: `@@ -12,6 +12,9 @@
 export function writeAudit(event: AuditEvent) {
-  const actor = event.userId ?? null;
+  const actor =
+    event.userId ??
+    event.apiKey?.ownerId ??
+    event.apiKey?.name ??
+    null;
   return db.audit.insert({ ...event, actor });
 }`,
        },
      ],
      performance: {
        criteriaMet: true,
        timeSec: 94,
        testsPassed: 8,
        testsTotal: 8,
        errors: 0,
        retries: 0,
        qualityScore: 0.93,
        tokens: 9200,
        costUsd: 0.21,
        adherence: 0.97,
      },
    },
  },
  ...([
    {
      id: "t12",
      key: "ENG-241",
      title: "Pagination cursor skips rows under concurrent writes",
      priority: "high" as const,
      status: "idle" as const,
      repoPath: "apps/api",
      description:
        "List endpoints using keyset pagination drop rows when inserts land between pages.",
    },
    {
      id: "t13",
      key: "ENG-240",
      title: "Sentry sourcemaps missing for worker builds",
      priority: "medium" as const,
      status: "idle" as const,
      repoPath: "apps/workers",
      description:
        "Worker releases upload without maps, so production stack traces are minified.",
    },
    {
      id: "t14",
      key: "ENG-238",
      title: "Timezone-aware reminders fire an hour early",
      priority: "high" as const,
      status: "idle" as const,
      repoPath: "packages/notify",
      description:
        "DST transitions shift reminder jobs by one hour for US/Pacific users.",
    },
    {
      id: "t15",
      key: "ENG-236",
      title: "Feature flag cache never invalidates on write",
      priority: "medium" as const,
      status: "running" as const,
      repoPath: "apps/api",
      description:
        "Flag updates take up to TTL to appear. Invalidate on admin write path.",
    },
    {
      id: "t16",
      key: "ENG-235",
      title: "Mobile nav overlaps sticky table headers",
      priority: "low" as const,
      status: "idle" as const,
      repoPath: "apps/web",
      description:
        "On narrow viewports the bottom nav covers the last sticky header row.",
    },
    {
      id: "t17",
      key: "ENG-234",
      title: "OAuth state param not bound to session",
      priority: "high" as const,
      status: "blocked" as const,
      repoPath: "apps/web",
      description:
        "Login can complete with a forged state if the cookie is missing. Confirm bind strategy.",
    },
    {
      id: "t18",
      key: "ENG-232",
      title: "Chart tooltips clip at panel edges",
      priority: "low" as const,
      status: "idle" as const,
      repoPath: "packages/ui",
      description:
        "Recharts tooltips render outside overflow:hidden panels and get cropped.",
    },
    {
      id: "t19",
      key: "ENG-231",
      title: "Retry storm after redis brief outage",
      priority: "high" as const,
      status: "failed" as const,
      repoPath: "apps/api",
      description:
        "Clients retry in lockstep when redis returns. Add jittered backoff.",
    },
    {
      id: "t20",
      key: "ENG-230",
      title: "Copy button announces wrong for screen readers",
      priority: "low" as const,
      status: "idle" as const,
      repoPath: "packages/ui",
      description:
        "Clipboard actions say 'copied' permanently. Reset live region after timeout.",
    },
    {
      id: "t21",
      key: "ENG-228",
      title: "Invoice PDF fonts fail on Alpine images",
      priority: "medium" as const,
      status: "idle" as const,
      repoPath: "apps/api",
      description:
        "Puppeteer PDF generation lacks fonts in Alpine; invoices render boxes.",
    },
    {
      id: "t22",
      key: "ENG-227",
      title: "Stale React Query keys after org switch",
      priority: "medium" as const,
      status: "succeeded" as const,
      repoPath: "apps/web",
      description:
        "Switching org leaves previous org data visible until hard refresh.",
    },
    {
      id: "t23",
      key: "ENG-226",
      title: "Websocket reconnect floods presence channel",
      priority: "high" as const,
      status: "idle" as const,
      repoPath: "apps/api",
      description:
        "On flaky networks clients rejoin presence many times per second.",
    },
    {
      id: "t24",
      key: "ENG-225",
      title: "Email preference center ignores marketing opt-out",
      priority: "medium" as const,
      status: "idle" as const,
      repoPath: "apps/api",
      description:
        "Marketing campaigns still send after users opt out in settings.",
    },
    {
      id: "t25",
      key: "ENG-224",
      title: "Storybook a11y addon breaks on React 19",
      priority: "low" as const,
      status: "idle" as const,
      repoPath: "packages/ui",
      description:
        "Addon crashes during composeDocs. Pin compatible version or patch.",
    },
    {
      id: "t26",
      key: "ENG-223",
      title: "Background job metrics missing queue depth",
      priority: "medium" as const,
      status: "running" as const,
      repoPath: "apps/workers",
      description:
        "Ops dashboards need queue depth and lag for billing workers.",
    },
    {
      id: "t27",
      key: "ENG-222",
      title: "SSO login loses return URL with nested paths",
      priority: "high" as const,
      status: "idle" as const,
      repoPath: "apps/web",
      description:
        "Deep links under /settings/* redirect to home after SSO completes.",
    },
    {
      id: "t28",
      key: "ENG-220",
      title: "CSV import accepts duplicate external IDs",
      priority: "medium" as const,
      status: "idle" as const,
      repoPath: "apps/api",
      description:
        "Import should reject or merge rows with duplicate external_id.",
    },
    {
      id: "t29",
      key: "ENG-219",
      title: "Keyboard focus trap in command palette",
      priority: "low" as const,
      status: "succeeded" as const,
      repoPath: "apps/web",
      description:
        "Tab cycles inside the palette but Escape does not restore focus.",
    },
    {
      id: "t30",
      key: "ENG-217",
      title: "Health check reports healthy during migration lock",
      priority: "high" as const,
      status: "idle" as const,
      repoPath: "apps/api",
      description:
        "Readiness should fail while schema migrations hold an exclusive lock.",
    },
    {
      id: "t31",
      key: "ENG-216",
      title: "Avatar uploads reject valid HEIC from iOS",
      priority: "low" as const,
      status: "idle" as const,
      repoPath: "apps/api",
      description:
        "MIME sniffing rejects image/heic. Convert or accept with server convert.",
    },
    {
      id: "t32",
      key: "ENG-215",
      title: "Plan change webhook unsigned in staging",
      priority: "medium" as const,
      status: "blocked" as const,
      repoPath: "apps/api",
      description:
        "Staging Stripe webhook secret is empty. Confirm secret injection path.",
    },
  ] as const).map((t) => ({
    id: t.id,
    key: t.key,
    title: t.title,
    description: t.description,
    criteria: [
      "Reproduced against a fixture",
      "Covered by a focused test or check",
      "No unrelated refactors",
    ],
    repoPath: t.repoPath,
    branch: t.status === "idle" ? "main" : `agent/${t.key.toLowerCase()}`,
    priority: t.priority,
    status: t.status,
    assignee:
      t.status === "idle" || t.status === "blocked"
        ? t.status === "blocked"
          ? "agent"
          : "unassigned"
        : "agent",
    documents: [
      specDoc(
        t.key,
        `# ${t.key} — ${t.title}\n\n${t.description}`,
      ),
    ],
    delivery: delivery({
      prNumber: null,
      prStatus: "none",
      commitSha: null,
      commitMessage: null,
      comments: [],
    }),
    run:
      t.status === "running"
        ? {
            ...idleRun,
            id: `run-${t.id}`,
            status: "running" as const,
            stages: [
              { id: "investigate" as const, label: "Investigate", status: "done" as const },
              { id: "implement" as const, label: "Implement", status: "active" as const },
              { id: "verify" as const, label: "Verify", status: "pending" as const },
            ],
            timeline: [
              {
                id: `${t.id}-m1`,
                type: "message" as const,
                role: "user" as const,
                content: t.title,
              },
              {
                id: `${t.id}-a1`,
                type: "activity" as const,
                kind: "search" as const,
                title: "Searching codebase",
                detail: t.key.toLowerCase(),
                status: "done" as const,
              },
              {
                id: `${t.id}-a2`,
                type: "activity" as const,
                kind: "edit" as const,
                title: "Editing code",
                detail: `${t.repoPath}/…`,
                status: "running" as const,
              },
            ],
          }
        : t.status === "failed"
          ? {
              ...idleRun,
              id: `run-${t.id}`,
              status: "failed" as const,
              timeline: [
                {
                  id: `${t.id}-m1`,
                  type: "message" as const,
                  role: "user" as const,
                  content: t.title,
                },
                {
                  id: `${t.id}-a1`,
                  type: "activity" as const,
                  kind: "test" as const,
                  title: "Running tests",
                  detail: "failed",
                  status: "failed" as const,
                },
              ],
            }
          : t.status === "succeeded"
            ? {
                ...idleRun,
                id: `run-${t.id}`,
                status: "succeeded" as const,
                stages: [
                  { id: "investigate" as const, label: "Investigate", status: "done" as const },
                  { id: "implement" as const, label: "Implement", status: "done" as const },
                  { id: "verify" as const, label: "Verify", status: "done" as const },
                ],
                timeline: [
                  {
                    id: `${t.id}-m1`,
                    type: "message" as const,
                    role: "user" as const,
                    content: t.title,
                  },
                  {
                    id: `${t.id}-a1`,
                    type: "activity" as const,
                    kind: "edit" as const,
                    title: "Editing code",
                    detail: "done",
                    status: "done" as const,
                  },
                ],
                performance: {
                  criteriaMet: true,
                  timeSec: 80,
                  testsPassed: 4,
                  testsTotal: 4,
                  errors: 0,
                  retries: 0,
                  qualityScore: 0.9,
                  tokens: 6000,
                  costUsd: 0.12,
                  adherence: 0.95,
                },
              }
            : t.status === "blocked"
              ? {
                  ...idleRun,
                  id: `run-${t.id}`,
                  status: "blocked" as const,
                  blockedQuestion: "Confirm approach before continuing?",
                  timeline: [
                    {
                      id: `${t.id}-m1`,
                      type: "message" as const,
                      role: "user" as const,
                      content: t.title,
                    },
                    {
                      id: `${t.id}-a1`,
                      type: "activity" as const,
                      kind: "ask" as const,
                      title: "Waiting on you",
                      detail: "Need a decision",
                      status: "waiting" as const,
                    },
                  ],
                }
              : { ...idleRun, id: `run-${t.id}` },
  })),
]).map((t) => ({
  ...t,
  documents: mergeRepoDocuments(t.key, t.repoPath, t.documents),
}));

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
      },
      {
        id: "fr-a1-result",
        type: "result",
        evidenceId: "ev-fr-diff",
      },
      {
        id: "fr-a2",
        type: "activity",
        kind: "test",
        title: "Running tests",
        detail: "src/export/csv.test.ts",
        status: "done",
      },
      {
        id: "fr-a2-result",
        type: "result",
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
      },
      {
        id: "d-a1-result",
        type: "result",
        evidenceId: "ev-d-file",
      },
      {
        id: "d-a2",
        type: "activity",
        kind: "edit",
        title: "Editing code",
        detail: "AGENTS.md",
        status: "done",
      },
      {
        id: "d-a2-result",
        type: "result",
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
  t7: {
    ...runningScript,
    id: "run-webhook-retry",
    status: "succeeded",
    filesChanged: ["src/webhooks/dispatch.ts"],
  },
  t9: {
    ...runningScript,
    id: "run-theme-flash",
    status: "succeeded",
    filesChanged: ["src/theme/bootstrap.ts"],
  },
  t10: {
    ...runningScript,
    id: "run-invite-ttl",
    status: "succeeded",
    filesChanged: ["src/invites/token.ts"],
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

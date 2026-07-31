export type TicketStatus =
  | "idle"
  | "running"
  | "blocked"
  | "failed"
  | "succeeded";

export type Priority = "low" | "medium" | "high";

export type ActivityKind =
  | "plan"
  | "read"
  | "search"
  | "edit"
  | "lint"
  | "terminal"
  | "test"
  | "verify"
  | "fix"
  | "git"
  | "ask";

export type ActivityStatus = "running" | "done" | "failed" | "waiting";

export type EvidenceKind =
  | "file"
  | "diff"
  | "terminal"
  | "tests"
  | "criteria"
  | "search";

export type ModelEffort = "low" | "medium" | "high";

export type ContextRefKind =
  | "file"
  | "folder"
  | "doc"
  | "terminal"
  | "past-chat"
  | "branch-diff"
  | "browser"
  | "evidence"
  | "ticket";

export interface ContextRef {
  id: string;
  kind: ContextRefKind;
  label: string;
  sublabel?: string;
  /** Linked entity id (evidenceId, docId, sessionId, etc.) */
  refId?: string;
}

export type TimelineItem =
  | {
      id: string;
      type: "message";
      role: "user" | "assistant";
      content: string;
      contextRefs?: ContextRef[];
    }
  | {
      id: string;
      type: "activity";
      kind: ActivityKind;
      title: string;
      detail: string;
      status: ActivityStatus;
      /** Wall time for this step */
      durationMs?: number;
      /** Tokens used for this step */
      tokens?: number;
      /** Paths touched in this step */
      filesChanged?: string[];
    }
  | {
      id: string;
      /** Artifact produced by a prior action — separate from the action itself */
      type: "result";
      evidenceId: string;
    };

export interface FileEvidence {
  id: string;
  kind: "file";
  path: string;
  content: string;
}

export interface DiffEvidence {
  id: string;
  kind: "diff";
  path: string;
  content: string;
}

export interface TerminalEvidence {
  id: string;
  kind: "terminal";
  title: string;
  lines: { text: string; tone?: "cmd" | "err" | "ok" | "plain" }[];
}

export interface TestEvidence {
  id: string;
  kind: "tests";
  title: string;
  results: { name: string; passed: boolean; durationMs: number }[];
}

export interface SearchEvidence {
  id: string;
  kind: "search";
  query: string;
  hits: { path: string; line: number; preview: string }[];
}

export interface CriteriaEvidence {
  id: string;
  kind: "criteria";
  title: string;
  results: { text: string; met: boolean; note?: string }[];
}

export type Evidence =
  | FileEvidence
  | DiffEvidence
  | TerminalEvidence
  | TestEvidence
  | CriteriaEvidence
  | SearchEvidence;

export interface PerformanceMetrics {
  criteriaMet: boolean;
  testsPassed: number;
  testsTotal: number;
  timeSec: number;
  errors: number;
  retries: number;
  qualityScore: number;
  tokens: number;
  costUsd: number;
  adherence: number;
}

export type RunStageId = "investigate" | "implement" | "verify";

export type StageStatus = "pending" | "active" | "done" | "failed";

export interface RunStage {
  id: RunStageId;
  label: string;
  status: StageStatus;
}

export type PlaceId =
  | "tickets"
  | "ops"
  | "policies"
  | "memory"
  | "environments"
  | "design-system";

export type ReviewDecision =
  | "todo"
  | "in_progress"
  | "approved"
  | "changes_requested"
  | "merged";

export type PendingDecisionKind =
  | "choice"
  | "clarification"
  | "approval"
  | "review";

export interface DecisionOption {
  id: string;
  label: string;
  description?: string;
  /** Opens a custom reply field when selected */
  isCustom?: boolean;
}

export interface PendingDecision {
  id: string;
  kind: PendingDecisionKind;
  title: string;
  prompt: string;
  options?: DecisionOption[];
  suggestedReplies?: string[];
  contextRefs?: ContextRef[];
  blockingStage?: RunStageId;
  /** Epoch ms when the agent started waiting */
  waitingSince?: number;
  askActivityId?: string;
}

export interface AgentRun {
  id: string;
  status: TicketStatus;
  timeline: TimelineItem[];
  evidence: Evidence[];
  filesChanged: string[];
  performance?: PerformanceMetrics;
  /** @deprecated Prefer pendingDecision */
  blockedQuestion?: string;
  pendingDecision?: PendingDecision;
  stages?: RunStage[];
}

export type TicketDocumentKind = "spec" | "code" | "markdown" | "notes";

export interface TicketDocument {
  id: string;
  title: string;
  path: string;
  kind: TicketDocumentKind;
  content: string;
}

export type PrStatus = "none" | "draft" | "open" | "merged" | "closed";

export type PrCheckStatus = "pending" | "pass" | "fail";

export interface PrCheck {
  name: string;
  status: PrCheckStatus;
  detail?: string;
}

export type CenterTab = "ticket" | "documents" | "tests" | "evidence" | "pr";

export interface TicketComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  /** When set, this comment is a reply to another comment. */
  parentId?: string;
}

export interface TicketDelivery {
  prNumber: number | null;
  prStatus: PrStatus;
  prUrl?: string;
  prTitle?: string;
  prBody?: string;
  baseBranch?: string;
  checks?: PrCheck[];
  commitSha: string | null;
  commitMessage: string | null;
  comments: TicketComment[];
}

export interface Ticket {
  id: string;
  key: string;
  title: string;
  description: string;
  criteria: string[];
  repoPath: string;
  branch: string;
  priority: Priority;
  status: TicketStatus;
  assignee: string;
  documents: TicketDocument[];
  delivery: TicketDelivery;
  run: AgentRun;
}

export interface AgentConfig {
  model: string;
  effort: ModelEffort;
  permissions: {
    readFiles: boolean;
    editFiles: boolean;
    runTerminal: boolean;
    runTests: boolean;
    useNetwork: boolean;
  };
  repoScope: string;
  rules: string;
  timeLimitMin: number;
  costLimitUsd: number;
  commandLimit: number;
  testEnv: string;
  deployEnv: string;
}

export interface PolicyPlaybook {
  id: string;
  name: string;
  summary: string;
  config: AgentConfig;
}

export interface WorkspaceFile {
  path: string;
  hits: number;
  lastBranch: string;
}

export interface WorkspaceBranch {
  name: string;
  ticketKey: string;
  status: TicketStatus;
}

export interface MemoryItem {
  id: string;
  kind: "decision" | "convention" | "qa";
  title: string;
  body: string;
  tags: string[];
  relatedTicketKey?: string;
}

export interface EnvironmentTarget {
  id: string;
  name: string;
  kind: "test" | "ci" | "deploy";
  url: string;
  recentStatus: "passing" | "failing" | "running" | "idle";
  lastRunAt: string;
  note: string;
}

export interface OpsPattern {
  id: string;
  title: string;
  detail: string;
  count: number;
  relatedTicketId: string;
  relatedRunId: string;
}

export interface OpsTrendPoint {
  day: string;
  successRate: number;
  costUsd: number;
  tokens: number;
  runs: number;
}

export interface OpsModelUsage {
  model: string;
  runs: number;
  tokens: number;
  costUsd: number;
  avgTimeSec: number;
  successRate: number;
}

export interface OpsFailureBucket {
  id: string;
  label: string;
  count: number;
  share: number;
  detail: string;
}

export interface OpsPolicyStat {
  id: string;
  name: string;
  runs: number;
  successRate: number;
  avgCostUsd: number;
  avgTimeSec: number;
  blockedRate: number;
}

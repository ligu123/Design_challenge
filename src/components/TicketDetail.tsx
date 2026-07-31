import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  CenterTab,
  DiffEvidence,
  Evidence,
  Priority,
  PrStatus,
  ReviewDecision,
  Ticket,
} from "../types";
import { summarizeDiff } from "./DiffCodeBlock";
import { DocsBrowser } from "./DocsBrowser";
import { EvidencePanel } from "./evidence/EvidencePanel";
import { DiffAccordionItem } from "./DiffAccordionItem";
import { PullRequestPanel } from "./PullRequestPanel";
import { PriorityIcon, StatusChip } from "./StatusChip";

interface TicketDetailProps {
  ticket: Ticket;
  selectedEvidenceId: string | null;
  onSelectEvidence: (evidenceId: string | null) => void;
  onStart: () => void;
  starting?: boolean;
  decision?: ReviewDecision;
  onDecide?: (decision: ReviewDecision) => void;
  onChangePriority?: (priority: Priority) => void;
  onChangeAssignee?: (assignee: string) => void;
  onAddComment?: (body: string, parentId?: string) => void;
  onDeleteComment?: (commentId: string) => void;
  centerTab?: CenterTab;
  onCenterTabChange?: (tab: CenterTab) => void;
  onOpenPullRequest?: (payload: {
    title: string;
    body: string;
    asDraft: boolean;
  }) => void;
  onMarkReadyForReview?: () => void;
}

const COMMENT_AUTHOR = "maya";

const PRIORITY_OPTIONS: Priority[] = ["high", "medium", "low"];
const ASSIGNEE_OPTIONS = ["agent", "unassigned", "maya", "jordan"] as const;
const RESOLVE_OPTIONS: ReviewDecision[] = [
  "todo",
  "in_progress",
  "approved",
  "changes_requested",
  "merged",
];

function resolveLabel(decision: ReviewDecision) {
  switch (decision) {
    case "todo":
      return "To-do";
    case "in_progress":
      return "In progress";
    case "approved":
      return "Resolved";
    case "changes_requested":
      return "Changes requested";
    case "merged":
      return "Merged";
  }
}

function MetaChevron() {
  return (
    <svg
      className="ticket-meta-chevron"
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 6.5 8 10.5 12 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetaBranchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="5" cy="4" r="1.75" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5" cy="12" r="1.75" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="11.5" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5 5.75v4.5M6.6 5.1 10 7.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MetaRepoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 4.5h9v8.25a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V4.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M3.5 4.5 5.2 2.5h5.6l1.7 2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetaAssigneeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M3.8 13.2c.7-2.2 2.2-3.3 4.2-3.3s3.5 1.1 4.2 3.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MetaResolveIcon({ state }: { state: ReviewDecision }) {
  if (state === "approved" || state === "merged") {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M5.5 8.1 7.2 9.8 10.6 6.2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (state === "changes_requested") {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M8 5.25v3.5M8 10.75h.01"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (state === "in_progress") {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.4" />
        <path
          d="M8 2.75a5.25 5.25 0 0 1 0 10.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function MetaSelect<T extends string>({
  value,
  options,
  label,
  renderIcon,
  renderOptionLabel,
  onChange,
}: {
  value: T;
  options: readonly T[];
  label: string;
  renderIcon: (v: T) => ReactNode;
  renderOptionLabel?: (v: T) => string;
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`ticket-meta-select${open ? " open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className={`ticket-meta-badge ticket-meta-badge-${toneClass(value)}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ticket-meta-badge-icon">{renderIcon(value)}</span>
        <span className="ticket-meta-badge-label">
          {renderOptionLabel?.(value) ?? value}
        </span>
        <MetaChevron />
      </button>
      {open ? (
        <ul className="ticket-meta-menu" role="listbox" aria-label={label}>
          {options.map((opt) => (
            <li key={opt} role="option" aria-selected={opt === value}>
              <button
                type="button"
                className={`ticket-meta-menu-item${opt === value ? " selected" : ""} ticket-meta-badge-${toneClass(opt)}`}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                <span className="ticket-meta-badge-icon">{renderIcon(opt)}</span>
                <span className="ticket-meta-badge-label">
                  {renderOptionLabel?.(opt) ?? opt}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function toneClass(value: string): string {
  if (value === "high" || value === "medium" || value === "low") return value;
  if (value === "agent") return "agent";
  if (value === "unassigned") return "unassigned";
  if (value === "maya") return "maya";
  if (value === "jordan") return "jordan";
  if (value === "todo") return "resolve-todo";
  if (value === "in_progress") return "resolve-in-progress";
  if (value === "approved") return "resolve-approved";
  if (value === "changes_requested") return "resolve-changes";
  if (value === "merged") return "resolve-merged";
  return "neutral";
}

function latestTestEvidence(evidence: Evidence[]): Evidence | null {
  const tests = evidence.filter((e) => e.kind === "tests");
  return tests.length ? tests[tests.length - 1] : null;
}

function prStatusLabel(status: PrStatus) {
  switch (status) {
    case "draft":
      return "opened a draft pull request";
    case "open":
      return "opened a pull request";
    case "merged":
      return "merged a pull request";
    case "closed":
      return "closed a pull request";
    default:
      return "updated a pull request";
  }
}

function authorInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

type IssueEvent =
  | {
      id: string;
      kind: "commit";
      sha: string;
      message: string;
      atMs: number;
    }
  | {
      id: string;
      kind: "pr";
      number: number;
      status: PrStatus;
      atMs: number;
    }
  | {
      id: string;
      kind: "branch";
      name: string;
      atMs: number;
    };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Looking-back relative time: "just now", "5 minutes", "1 hour", "2 days". */
function formatRelativeTime(atMs: number, nowMs: number) {
  const diff = Math.max(0, nowMs - atMs);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) {
    const n = Math.floor(diff / MINUTE);
    return n === 1 ? "1 minute" : `${n} minutes`;
  }
  if (diff < DAY) {
    const n = Math.floor(diff / HOUR);
    return n === 1 ? "1 hour" : `${n} hours`;
  }
  if (diff < 30 * DAY) {
    const n = Math.floor(diff / DAY);
    return n === 1 ? "1 day" : `${n} days`;
  }
  const n = Math.floor(diff / (30 * DAY));
  return n === 1 ? "1 month" : `${n} months`;
}

function buildIssueEvents(ticket: Ticket, nowMs: number): IssueEvent[] {
  const { delivery, branch } = ticket;
  const events: IssueEvent[] = [];

  // Stagger mock ages so the timeline reads as a real looking-back history.
  if (branch && branch !== "main") {
    events.push({
      id: `branch-${ticket.id}`,
      kind: "branch",
      name: branch,
      atMs: nowMs - 2 * DAY - 3 * HOUR,
    });
  }

  if (delivery.commitSha && delivery.commitMessage) {
    events.push({
      id: `commit-${delivery.commitSha}`,
      kind: "commit",
      sha: delivery.commitSha,
      message: delivery.commitMessage,
      atMs: nowMs - 6 * HOUR - 20 * MINUTE,
    });
  }

  if (delivery.prNumber != null && delivery.prStatus !== "none") {
    events.push({
      id: `pr-${delivery.prNumber}`,
      kind: "pr",
      number: delivery.prNumber,
      status: delivery.prStatus,
      atMs: nowMs - 55 * MINUTE,
    });
  }

  return events;
}

function TicketDiffResults({
  diffs,
  selectedEvidenceId,
  onSelectEvidence,
}: {
  diffs: DiffEvidence[];
  selectedEvidenceId: string | null;
  onSelectEvidence: (evidenceId: string) => void;
}) {
  return (
    <div className="ticket-diff-results">
      {diffs.map((diff) => (
        <DiffAccordionItem
          key={diff.id}
          diff={diff}
          selected={selectedEvidenceId === diff.id}
          onOpenDiff={() => onSelectEvidence(diff.id)}
        />
      ))}
    </div>
  );
}

export function TicketDetail({
  ticket,
  selectedEvidenceId,
  onSelectEvidence,
  onStart,
  decision = "todo",
  onDecide,
  onChangePriority,
  onChangeAssignee,
  onAddComment,
  onDeleteComment,
  centerTab: centerTabProp,
  onCenterTabChange,
  onOpenPullRequest,
  onMarkReadyForReview,
}: TicketDetailProps) {
  const canStart = ticket.status === "idle" || ticket.status === "failed";
  const run = ticket.run;
  const documents = ticket.documents;
  const comments = ticket.delivery.comments;
  const [commentDraft, setCommentDraft] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCommentDraft("");
    setReplyToId(null);
  }, [ticket.id]);

  const replyTo = replyToId
    ? (comments.find((c) => c.id === replyToId) ?? null)
    : null;

  const rootComments = comments.filter((c) => !c.parentId);
  const repliesFor = (parentId: string) =>
    comments.filter((c) => c.parentId === parentId);

  const submitComment = () => {
    const body = commentDraft.trim();
    if (!body || !onAddComment) return;
    onAddComment(body, replyToId ?? undefined);
    setCommentDraft("");
    setReplyToId(null);
  };

  const startReply = (commentId: string) => {
    setReplyToId(commentId);
    requestAnimationFrame(() => commentInputRef.current?.focus());
  };

  const diffs = useMemo(
    () => run.evidence.filter((e): e is DiffEvidence => e.kind === "diff"),
    [run.evidence],
  );
  const hasChanges = run.filesChanged.length > 0 || diffs.length > 0;
  const testEvidence = latestTestEvidence(run.evidence);
  const hasTests = Boolean(testEvidence) || Boolean(run.performance);
  const testPassCount =
    testEvidence?.kind === "tests"
      ? testEvidence.results.filter((r) => r.passed).length
      : run.performance?.testsPassed;
  const testTotalCount =
    testEvidence?.kind === "tests"
      ? testEvidence.results.length
      : run.performance?.testsTotal;
  const selectedEvidence =
    (selectedEvidenceId &&
      run.evidence.find((e) => e.id === selectedEvidenceId)) ||
    null;

  const [internalTab, setInternalTab] = useState<CenterTab>("ticket");
  const tab = centerTabProp ?? internalTab;
  const setTab = onCenterTabChange ?? setInternalTab;
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  // Stable base so relative activity times age from first view of this ticket.
  const eventBaseMs = useMemo(() => Date.now(), [ticket.id]);

  const hasPr =
    ticket.delivery.prNumber != null && ticket.delivery.prStatus !== "none";

  useEffect(() => {
    setTab("ticket");
    setSelectedDocId(null);
  }, [ticket.id]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selectedEvidence) return;
    if (selectedEvidence.kind === "file") {
      const match = documents.find((d) => d.path === selectedEvidence.path);
      if (match) setSelectedDocId(match.id);
    }
  }, [selectedEvidence, documents]);

  useEffect(() => {
    if (tab !== "evidence" || !selectedEvidenceId) return;
    document
      .querySelector(`[data-result="${selectedEvidenceId}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [tab, selectedEvidenceId]);

  const criteriaMet =
    ticket.status === "succeeded" && Boolean(run.performance?.criteriaMet);

  const showActivityEvidence =
    selectedEvidence && selectedEvidence.kind !== "diff";

  const changedPaths = useMemo(
    () =>
      run.filesChanged.length
        ? run.filesChanged
        : diffs.map((d) => (d.kind === "diff" ? d.path : "")).filter(Boolean),
    [run.filesChanged, diffs],
  );

  const changeStats = useMemo(() => {
    return diffs.reduce(
      (acc, d) => {
        if (d.kind !== "diff") return acc;
        const s = summarizeDiff(d.content);
        return { added: acc.added + s.added, removed: acc.removed + s.removed };
      },
      { added: 0, removed: 0 },
    );
  }, [diffs]);

  const issueEvents = useMemo(
    () => buildIssueEvents(ticket, eventBaseMs),
    [ticket, eventBaseMs],
  );

  return (
    <div className="ticket-detail">
      <div className="ticket-center-tabs" role="tablist" aria-label="Center view">
        <button
          type="button"
          role="tab"
          className={tab === "ticket" ? "active" : undefined}
          aria-selected={tab === "ticket"}
          onClick={() => setTab("ticket")}
        >
          Ticket
        </button>
        <button
          type="button"
          role="tab"
          className={tab === "documents" ? "active" : undefined}
          aria-selected={tab === "documents"}
          onClick={() => setTab("documents")}
        >
          Files
          <span className="ticket-tab-count">{documents.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          className={tab === "evidence" ? "active" : undefined}
          aria-selected={tab === "evidence"}
          disabled={!hasChanges}
          onClick={() => hasChanges && setTab("evidence")}
        >
          Diff
          {changedPaths.length > 0 ? (
            <span className="ticket-tab-count">{changedPaths.length}</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          className={tab === "tests" ? "active" : undefined}
          aria-selected={tab === "tests"}
          disabled={!hasTests}
          onClick={() => hasTests && setTab("tests")}
        >
          Tests
          {testTotalCount != null && (
            <span className="ticket-tab-count">
              {testPassCount}/{testTotalCount}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          className={tab === "pr" ? "active" : undefined}
          aria-selected={tab === "pr"}
          onClick={() => setTab("pr")}
        >
          Pull request
          {hasPr ? (
            <span className="ticket-tab-count">#{ticket.delivery.prNumber}</span>
          ) : null}
        </button>
      </div>

      {tab === "evidence" && hasChanges ? (
        <div className="ticket-diffs-view">
          <div className="ticket-detail-top">
            <div>
              <nav className="ticket-breadcrumb" aria-label="Breadcrumb">
                <span>Tickets</span>
                <span className="ticket-breadcrumb-sep" aria-hidden>
                  /
                </span>
                <span className="mono">{ticket.key}</span>
                <span className="ticket-breadcrumb-sep" aria-hidden>
                  /
                </span>
                <span>Diff</span>
              </nav>
              <h1>
                Changes
                <span className="section-meta">
                  {diffs.length} file
                  {diffs.length === 1 ? "" : "s"}
                </span>
              </h1>
            </div>
          </div>
          <TicketDiffResults
            diffs={diffs}
            selectedEvidenceId={selectedEvidenceId}
            onSelectEvidence={onSelectEvidence}
          />
        </div>
      ) : null}

      {tab === "documents" ? (
        <div className="ticket-documents">
          {documents.length === 0 ? (
            <p className="muted-note">No files yet.</p>
          ) : (
            <DocsBrowser
              ticketKey={ticket.key}
              documents={documents}
              selectedId={selectedDocId}
              onSelect={setSelectedDocId}
            />
          )}
        </div>
      ) : null}

      {tab === "tests" && hasTests ? (
        <div className="ticket-tests">
          <div className="ticket-detail-top">
            <div>
              <nav className="ticket-breadcrumb" aria-label="Breadcrumb">
                <span>Tickets</span>
                <span className="ticket-breadcrumb-sep" aria-hidden>
                  /
                </span>
                <span className="mono">{ticket.key}</span>
                <span className="ticket-breadcrumb-sep" aria-hidden>
                  /
                </span>
                <span>Tests</span>
              </nav>
              <h1>Tests</h1>
            </div>
          </div>

          {testEvidence && testEvidence.kind === "tests" ? (
            <section className="ticket-section">
              <div className="tests-panel">
                <div className="tests-panel-head">
                  <div className="tests-panel-summary">
                    <span
                      className={
                        testEvidence.results.every((r) => r.passed)
                          ? "tests-badge pass"
                          : "tests-badge fail"
                      }
                    >
                      {testEvidence.results.filter((r) => r.passed).length}/
                      {testEvidence.results.length} passed
                    </span>
                    <span className="tests-suite mono">
                      {testEvidence.title}
                    </span>
                  </div>
                  <span className="tests-duration">
                    {testEvidence.results.reduce(
                      (sum, r) => sum + r.durationMs,
                      0,
                    )}
                    ms total
                  </span>
                </div>
                <ul className="tests-result-list">
                  {testEvidence.results.map((r) => (
                    <li
                      key={r.name}
                      className={
                        r.passed ? "tests-result pass" : "tests-result fail"
                      }
                    >
                      <span className="tests-result-icon" aria-hidden>
                        {r.passed ? "✓" : "✕"}
                      </span>
                      <div className="tests-result-main">
                        <span className="tests-result-name">{r.name}</span>
                        <span className="tests-result-status">
                          {r.passed ? "Passed" : "Failed"}
                        </span>
                      </div>
                      <span className="tests-result-time">{r.durationMs}ms</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : run.performance ? (
            <section className="ticket-section">
              <div className="tests-panel">
                <div className="tests-panel-head">
                  <div className="tests-panel-summary">
                    <span
                      className={
                        run.performance.testsPassed ===
                        run.performance.testsTotal
                          ? "tests-badge pass"
                          : "tests-badge fail"
                      }
                    >
                      {run.performance.testsPassed}/
                      {run.performance.testsTotal} passed
                    </span>
                  </div>
                  <span className="tests-duration">
                    {run.performance.errors > 0 &&
                      `${run.performance.errors} errors`}
                    {run.performance.retries > 0 &&
                      `${run.performance.errors > 0 ? " · " : ""}${run.performance.retries} retries`}
                  </span>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "pr" && onOpenPullRequest ? (
        <PullRequestPanel
          ticket={ticket}
          run={run}
          diffs={diffs}
          changeStats={changeStats}
          testPassCount={testPassCount}
          testTotalCount={testTotalCount}
          onOpenPullRequest={onOpenPullRequest}
          onMarkReadyForReview={() => onMarkReadyForReview?.()}
          onAddComment={(body) => onAddComment?.(body)}
          onViewTests={() => hasTests && setTab("tests")}
          onViewDiff={() => hasChanges && setTab("evidence")}
        />
      ) : null}

      {tab === "ticket" ? (
        <>
          <div className="ticket-detail-top">
            <div>
              <nav className="ticket-breadcrumb" aria-label="Breadcrumb">
                <span>Tickets</span>
                <span className="ticket-breadcrumb-sep" aria-hidden>
                  /
                </span>
                <span className="mono">{ticket.key}</span>
              </nav>
              <div className="ticket-title-row">
                <h1>{ticket.title}</h1>
                <StatusChip status={ticket.status} />
              </div>
            </div>
          </div>

          <div className="ticket-meta">
            <span className="ticket-meta-badge" title={`Branch ${ticket.branch}`}>
              <MetaBranchIcon />
              <span className="mono ticket-meta-badge-label">{ticket.branch}</span>
            </span>
            <span className="ticket-meta-badge" title={`Repo ${ticket.repoPath}`}>
              <MetaRepoIcon />
              <span className="mono ticket-meta-badge-label">{ticket.repoPath}</span>
            </span>
            <MetaSelect
              value={ticket.priority}
              options={PRIORITY_OPTIONS}
              label={`Priority ${ticket.priority}`}
              renderIcon={(p) => <PriorityIcon priority={p} />}
              onChange={(priority) => onChangePriority?.(priority)}
            />
            <MetaSelect
              value={ticket.assignee}
              options={
                ASSIGNEE_OPTIONS.includes(
                  ticket.assignee as (typeof ASSIGNEE_OPTIONS)[number],
                )
                  ? ASSIGNEE_OPTIONS
                  : ([ticket.assignee, ...ASSIGNEE_OPTIONS] as string[])
              }
              label={`Assignee ${ticket.assignee}`}
              renderIcon={() => <MetaAssigneeIcon />}
              onChange={(assignee) => onChangeAssignee?.(assignee)}
            />
            {onDecide ? (
              <MetaSelect
                value={decision}
                options={RESOLVE_OPTIONS}
                label={`Resolution ${resolveLabel(decision)}`}
                renderIcon={(state) => <MetaResolveIcon state={state} />}
                renderOptionLabel={resolveLabel}
                onChange={(next) => {
                  if (next === "approved" && canStart) {
                    onStart();
                  }
                  onDecide(next);
                }}
              />
            ) : null}
          </div>

          <section className="ticket-section">
            <p className="ticket-desc">{ticket.description}</p>
            <div className="section-label">Acceptance criteria</div>
            <ul className="criteria-list">
              {ticket.criteria.map((item) => {
                let state: "met" | "pending" | "failed" | undefined;
                if (criteriaMet) state = "met";
                else if (ticket.status === "failed") state = "failed";
                else if (
                  ticket.status === "running" ||
                  ticket.status === "blocked"
                )
                  state = "pending";
                return (
                  <li key={item} className={state}>
                    <span className="criteria-mark" aria-hidden>
                      {state === "met" ? "✓" : state === "failed" ? "✕" : "○"}
                    </span>
                    {item}
                  </li>
                );
              })}
            </ul>
          </section>

          {hasChanges && diffs.length > 0 && (
            <section className="ticket-section changes-section">
              <div className="section-label">
                Changes
                <span className="section-meta">
                  {diffs.length} file
                  {diffs.length === 1 ? "" : "s"}
                </span>
              </div>
              <TicketDiffResults
                diffs={diffs}
                selectedEvidenceId={selectedEvidenceId}
                onSelectEvidence={onSelectEvidence}
              />
            </section>
          )}

          <section className="ticket-section ticket-activity-section">
            <div className="section-label">
              Activity
              <span className="section-meta">
                {issueEvents.length} event
                {issueEvents.length === 1 ? "" : "s"} ·{" "}
                {ticket.delivery.comments.length} comment
                {ticket.delivery.comments.length === 1 ? "" : "s"}
              </span>
            </div>

            {issueEvents.length > 0 ? (
              <ol className="issue-timeline">
                {issueEvents.map((event) => {
                  const timeLabel = formatRelativeTime(event.atMs, nowMs);
                  if (event.kind === "commit") {
                    return (
                      <li key={event.id} className="issue-timeline-item">
                        <div className="issue-timeline-static">
                          <span
                            className="issue-timeline-dot issue-event-commit"
                            aria-hidden
                          >
                            ●
                          </span>
                          <div className="issue-timeline-body">
                            <div className="issue-timeline-title">
                              <span className="issue-timeline-title-text">
                                New commit{" "}
                                <span className="mono">{event.sha}</span>
                              </span>
                              <span className="issue-timeline-detail">
                                {event.message}
                              </span>
                              <time
                                className="issue-timeline-time"
                                dateTime={new Date(event.atMs).toISOString()}
                              >
                                {timeLabel}
                              </time>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  }

                  if (event.kind === "pr") {
                    return (
                      <li key={event.id} className="issue-timeline-item">
                        <div className="issue-timeline-static">
                          <span
                            className="issue-timeline-dot issue-event-pr"
                            aria-hidden
                          >
                            ↗
                          </span>
                          <div className="issue-timeline-body">
                            <div className="issue-timeline-title">
                              <span className="issue-timeline-title-text">
                                {prStatusLabel(event.status)}{" "}
                                <span className="mono">#{event.number}</span>
                                <span
                                  className={`pr-chip pr-${event.status}`}
                                >
                                  {event.status}
                                </span>
                              </span>
                              <span className="issue-timeline-detail">
                                {ticket.title}
                              </span>
                              <time
                                className="issue-timeline-time"
                                dateTime={new Date(event.atMs).toISOString()}
                              >
                                {timeLabel}
                              </time>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={event.id} className="issue-timeline-item">
                      <div className="issue-timeline-static">
                        <span
                          className="issue-timeline-dot issue-event-branch"
                          aria-hidden
                        >
                          ⎇
                        </span>
                        <div className="issue-timeline-body">
                          <div className="issue-timeline-title">
                            <span className="issue-timeline-title-text">
                              New branch
                            </span>
                            <span className="issue-timeline-detail mono">
                              {event.name}
                            </span>
                            <time
                              className="issue-timeline-time"
                              dateTime={new Date(event.atMs).toISOString()}
                            >
                              {timeLabel}
                            </time>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="muted-note">No delivery activity yet.</p>
            )}

            <div className="issue-comments">
              <div className="section-label">
                Comments
                <span className="section-meta">{comments.length}</span>
              </div>
              {rootComments.length === 0 ? (
                <p className="muted-note">No comments yet.</p>
              ) : (
                <ul className="issue-comment-list">
                  {rootComments.map((c) => {
                    const thread = repliesFor(c.id);
                    return (
                      <li key={c.id} className="issue-comment-thread">
                        <article
                          className="issue-comment"
                          data-author={c.author}
                        >
                          <div
                            className="issue-comment-avatar"
                            aria-hidden
                            data-author={c.author}
                          >
                            {authorInitials(c.author)}
                          </div>
                          <div className="issue-comment-card">
                            <div className="issue-comment-head">
                              <div className="issue-comment-meta">
                                <strong>{c.author}</strong>
                                <span className="issue-comment-time">
                                  commented {c.createdAt}
                                </span>
                              </div>
                              <div className="issue-comment-actions">
                                {onAddComment ? (
                                  <button
                                    type="button"
                                    className="issue-comment-action"
                                    onClick={() => startReply(c.id)}
                                  >
                                    Reply
                                  </button>
                                ) : null}
                                {onDeleteComment ? (
                                  <button
                                    type="button"
                                    className="issue-comment-action danger"
                                    onClick={() => onDeleteComment(c.id)}
                                  >
                                    Delete
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            <div className="issue-comment-body">
                              <p>{c.body}</p>
                            </div>
                          </div>
                        </article>
                        {thread.length > 0 ? (
                          <ul className="issue-comment-replies">
                            {thread.map((reply) => (
                              <li
                                key={reply.id}
                                className="issue-comment"
                                data-author={reply.author}
                              >
                                <div
                                  className="issue-comment-avatar"
                                  aria-hidden
                                  data-author={reply.author}
                                >
                                  {authorInitials(reply.author)}
                                </div>
                                <div className="issue-comment-card">
                                  <div className="issue-comment-head">
                                    <div className="issue-comment-meta">
                                      <strong>{reply.author}</strong>
                                      <span className="issue-comment-time">
                                        replied {reply.createdAt}
                                      </span>
                                    </div>
                                    <div className="issue-comment-actions">
                                      {onAddComment ? (
                                        <button
                                          type="button"
                                          className="issue-comment-action"
                                          onClick={() => startReply(c.id)}
                                        >
                                          Reply
                                        </button>
                                      ) : null}
                                      {onDeleteComment ? (
                                        <button
                                          type="button"
                                          className="issue-comment-action danger"
                                          onClick={() =>
                                            onDeleteComment(reply.id)
                                          }
                                        >
                                          Delete
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="issue-comment-body">
                                    <p>{reply.body}</p>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}

              {onAddComment ? (
                <form
                  className="issue-comment-composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitComment();
                  }}
                >
                  <div
                    className="issue-comment-avatar"
                    aria-hidden
                    data-author={COMMENT_AUTHOR}
                  >
                    {authorInitials(COMMENT_AUTHOR)}
                  </div>
                  <div className="issue-comment-composer-main">
                    {replyTo ? (
                      <div className="issue-comment-replying">
                        <span>
                          Replying to <strong>{replyTo.author}</strong>
                        </span>
                        <button
                          type="button"
                          className="issue-comment-action"
                          onClick={() => setReplyToId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : null}
                    <textarea
                      ref={commentInputRef}
                      className="issue-comment-input"
                      rows={3}
                      placeholder={
                        replyTo
                          ? `Reply to ${replyTo.author}…`
                          : "Leave a comment…"
                      }
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          (e.metaKey || e.ctrlKey) &&
                          e.key === "Enter" &&
                          commentDraft.trim()
                        ) {
                          e.preventDefault();
                          submitComment();
                        }
                      }}
                    />
                    <div className="issue-comment-composer-actions">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!commentDraft.trim()}
                      >
                        {replyTo ? "Reply" : "Comment"}
                      </button>
                    </div>
                  </div>
                </form>
              ) : null}
            </div>
          </section>

          {showActivityEvidence && selectedEvidence && (
            <section className="ticket-section activity-evidence-section">
              <div className="section-label row-between">
                <span>
                  Activity diff{" "}
                  <span className="section-meta">{selectedEvidence.kind}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setTab("evidence")}
                >
                  Focus diff
                </button>
              </div>
              <div className="activity-evidence-embed">
                <EvidencePanel evidence={selectedEvidence} />
              </div>
            </section>
          )}

        </>
      ) : null}
    </div>
  );
}

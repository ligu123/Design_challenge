import { useEffect, useMemo, useState } from "react";
import type {
  Evidence,
  PrStatus,
  ReviewDecision,
  Ticket,
  TicketDocument,
} from "../types";
import { DiffCodeBlock, summarizeDiff } from "./DiffCodeBlock";
import { EvidencePanel } from "./evidence/EvidencePanel";
import { StatusChip } from "./StatusChip";

interface TicketDetailProps {
  ticket: Ticket;
  selectedEvidenceId: string | null;
  onSelectEvidence: (evidenceId: string | null) => void;
  onStart: () => void;
  starting?: boolean;
  decision?: ReviewDecision;
  onDecide?: (decision: ReviewDecision) => void;
}

type CenterTab = "ticket" | "documents" | "tests" | "evidence";

function evidenceForPath(evidence: Evidence[], path: string): Evidence | null {
  return (
    evidence.find((e) => e.kind === "diff" && e.path === path) ??
    evidence.find((e) => e.kind === "file" && e.path === path) ??
    null
  );
}

function latestTestEvidence(evidence: Evidence[]): Evidence | null {
  const tests = evidence.filter((e) => e.kind === "tests");
  return tests.length ? tests[tests.length - 1] : null;
}

function docKindLabel(kind: TicketDocument["kind"]) {
  switch (kind) {
    case "spec":
      return "spec";
    case "markdown":
      return "md";
    case "notes":
      return "notes";
    default:
      return "code";
  }
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
      at?: string;
    }
  | {
      id: string;
      kind: "pr";
      number: number;
      status: PrStatus;
      at?: string;
    }
  | {
      id: string;
      kind: "branch";
      name: string;
      at?: string;
    };

function buildIssueEvents(ticket: Ticket): IssueEvent[] {
  const { delivery, branch } = ticket;
  const events: IssueEvent[] = [];

  if (branch && branch !== "main") {
    events.push({
      id: `branch-${ticket.id}`,
      kind: "branch",
      name: branch,
      at: "earlier",
    });
  }

  if (delivery.commitSha && delivery.commitMessage) {
    events.push({
      id: `commit-${delivery.commitSha}`,
      kind: "commit",
      sha: delivery.commitSha,
      message: delivery.commitMessage,
      at: "earlier",
    });
  }

  if (delivery.prNumber != null && delivery.prStatus !== "none") {
    events.push({
      id: `pr-${delivery.prNumber}`,
      kind: "pr",
      number: delivery.prNumber,
      status: delivery.prStatus,
      at: "earlier",
    });
  }

  return events;
}

export function TicketDetail({
  ticket,
  selectedEvidenceId,
  onSelectEvidence,
  onStart,
  starting,
  decision = "awaiting",
  onDecide,
}: TicketDetailProps) {
  const canStart = ticket.status === "idle" || ticket.status === "failed";
  const reviewable =
    ticket.status === "succeeded" || ticket.status === "failed";
  const run = ticket.run;
  const documents = ticket.documents;

  const diffs = useMemo(
    () => run.evidence.filter((e) => e.kind === "diff"),
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

  const defaultFile =
    run.filesChanged.find((p) =>
      run.evidence.some((e) => e.kind === "diff" && e.path === p),
    ) ??
    diffs[0]?.path ??
    run.filesChanged[0] ??
    null;

  const [selectedFile, setSelectedFile] = useState<string | null>(defaultFile);
  const [tab, setTab] = useState<CenterTab>("ticket");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    documents[0]?.id ?? null,
  );
  const [changesOpen, setChangesOpen] = useState(false);

  useEffect(() => {
    setSelectedFile(defaultFile);
    setTab("ticket");
    setSelectedDocId(ticket.documents[0]?.id ?? null);
    setChangesOpen(false);
  }, [ticket.id]);

  useEffect(() => {
    if (!selectedFile && defaultFile) {
      setSelectedFile(defaultFile);
    }
  }, [defaultFile, selectedFile]);

  useEffect(() => {
    if (!selectedEvidence) return;
    if (selectedEvidence.kind === "diff" || selectedEvidence.kind === "file") {
      setSelectedFile(selectedEvidence.path);
      const match = documents.find((d) => d.path === selectedEvidence.path);
      if (match) setSelectedDocId(match.id);
    }
  }, [selectedEvidence, documents]);

  const fileEvidence = selectedFile
    ? evidenceForPath(run.evidence, selectedFile)
    : null;

  const criteriaMet =
    ticket.status === "succeeded" && Boolean(run.performance?.criteriaMet);

  const showActivityEvidence =
    selectedEvidence &&
    !(
      fileEvidence &&
      selectedEvidence.id === fileEvidence.id &&
      (selectedEvidence.kind === "diff" || selectedEvidence.kind === "file")
    );

  const selectedDoc =
    documents.find((d) => d.id === selectedDocId) ?? documents[0] ?? null;

  const openDocumentByPath = (path: string) => {
    const match = documents.find((d) => d.path === path);
    if (match) {
      setSelectedDocId(match.id);
      setTab("documents");
    }
  };

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

  const issueEvents = useMemo(() => buildIssueEvents(ticket), [ticket]);

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
          Documents
          <span className="ticket-tab-count">{documents.length}</span>
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
          className={tab === "evidence" ? "active" : undefined}
          aria-selected={tab === "evidence"}
          disabled={!selectedEvidence}
          onClick={() => selectedEvidence && setTab("evidence")}
        >
          Evidence
        </button>
      </div>

      {tab === "evidence" && selectedEvidence ? (
        <div className="ticket-evidence-focus">
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
                <span>Evidence</span>
              </nav>
              <h1>{selectedEvidence.kind}</h1>
            </div>
          </div>
          <EvidencePanel evidence={selectedEvidence} />
        </div>
      ) : null}

      {tab === "documents" ? (
        <div className="ticket-documents">
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
                <span>Documents</span>
              </nav>
              <h1>Documents</h1>
              <p className="ticket-doc-sub">
                Spec and source files attached to this ticket.
              </p>
            </div>
          </div>

          {documents.length === 0 ? (
            <p className="muted-note">No documents attached yet.</p>
          ) : (
            <div className="docs-layout">
              <ul className="docs-list" role="listbox" aria-label="Documents">
                {documents.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedDoc?.id === doc.id}
                      className={
                        selectedDoc?.id === doc.id
                          ? "file-btn active"
                          : "file-btn"
                      }
                      onClick={() => setSelectedDocId(doc.id)}
                    >
                      <span className="file-btn-name">{doc.title}</span>
                      <span className="file-btn-tag">
                        {docKindLabel(doc.kind)}
                      </span>
                    </button>
                    <div className="docs-list-path mono">{doc.path}</div>
                  </li>
                ))}
              </ul>
              <div className="docs-preview">
                {selectedDoc ? (
                  <>
                    <div className="changes-preview-header">
                      <span>{selectedDoc.title}</span>
                      <span className="mono">{selectedDoc.path}</span>
                    </div>
                    <pre className="code-block docs-content">
                      {selectedDoc.content}
                    </pre>
                  </>
                ) : (
                  <p className="muted-note">Select a document to read.</p>
                )}
              </div>
            </div>
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
            <span>
              Branch <span className="mono">{ticket.branch}</span>
            </span>
            <span>
              Repo <span className="mono">{ticket.repoPath}</span>
            </span>
            <span>
              Priority <strong>{ticket.priority}</strong>
            </span>
            <span>
              Assignee <strong>{ticket.assignee}</strong>
            </span>
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

          {hasChanges && (
            <section className="ticket-section changes-section">
              <div
                className={`changes-accordion${changesOpen ? " open" : ""}`}
              >
                <button
                  type="button"
                  className="changes-accordion-trigger"
                  aria-expanded={changesOpen}
                  onClick={() => setChangesOpen((open) => !open)}
                >
                  <span className="changes-accordion-label">
                    <span className="section-label">
                      Changes
                      <span className="section-meta">
                        {changedPaths.length} file
                        {changedPaths.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="changes-stat-pills" aria-hidden>
                      {changeStats.added > 0 && (
                        <span className="changes-stat add">
                          +{changeStats.added}
                        </span>
                      )}
                      {changeStats.removed > 0 && (
                        <span className="changes-stat del">
                          −{changeStats.removed}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="changes-accordion-chevron" aria-hidden>
                    {changesOpen ? "▾" : "▸"}
                  </span>
                </button>

                {changesOpen && (
                  <div className="changes-layout">
                    <ul
                      className="changed-files"
                      role="listbox"
                      aria-label="Files changed"
                    >
                      {changedPaths.map((path) => {
                        const hasDiff = run.evidence.some(
                          (e) => e.kind === "diff" && e.path === path,
                        );
                        const hasDoc = documents.some((d) => d.path === path);
                        return (
                          <li key={path}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={selectedFile === path}
                              className={
                                selectedFile === path
                                  ? "file-btn active"
                                  : "file-btn"
                              }
                              onClick={() => {
                                setSelectedFile(path);
                                const ev = evidenceForPath(run.evidence, path);
                                if (ev) onSelectEvidence(ev.id);
                              }}
                            >
                              <span className="file-btn-name">{path}</span>
                              <span className="file-btn-tag">
                                {hasDiff ? "diff" : "file"}
                              </span>
                            </button>
                            {hasDoc && (
                              <button
                                type="button"
                                className="docs-open-link"
                                onClick={() => openDocumentByPath(path)}
                              >
                                Open document
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="changes-preview">
                      {fileEvidence?.kind === "diff" && (
                        <>
                          <div className="changes-preview-header">
                            <span>Diff</span>
                            <span className="mono">{fileEvidence.path}</span>
                          </div>
                          <DiffCodeBlock content={fileEvidence.content} />
                        </>
                      )}
                      {fileEvidence?.kind === "file" && (
                        <>
                          <div className="changes-preview-header">
                            <span>File</span>
                            <span className="mono">{fileEvidence.path}</span>
                          </div>
                          <pre className="code-block">{fileEvidence.content}</pre>
                        </>
                      )}
                      {!fileEvidence && selectedFile && (
                        <p className="muted-note">
                          No preview available for{" "}
                          <span className="mono">{selectedFile}</span>
                        </p>
                      )}
                      {!selectedFile && (
                        <p className="muted-note">
                          Select a file to inspect changes.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
                              New commit{" "}
                              <span className="mono">{event.sha}</span>
                            </div>
                            <div className="issue-timeline-detail">
                              {event.message}
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
                              {prStatusLabel(event.status)}{" "}
                              <span className="mono">#{event.number}</span>
                              <span
                                className={`pr-chip pr-${event.status}`}
                              >
                                {event.status}
                              </span>
                            </div>
                            <div className="issue-timeline-detail">
                              {ticket.title}
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
                            New branch
                          </div>
                          <div className="issue-timeline-detail mono">
                            {event.name}
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
                <span className="section-meta">
                  {ticket.delivery.comments.length}
                </span>
              </div>
              {ticket.delivery.comments.length === 0 ? (
                <p className="muted-note">No comments yet.</p>
              ) : (
                <ul className="issue-comment-list">
                  {ticket.delivery.comments.map((c) => (
                    <li key={c.id} className="issue-comment">
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
                        </div>
                        <div className="issue-comment-body">
                          <p>{c.body}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {showActivityEvidence && selectedEvidence && (
            <section className="ticket-section activity-evidence-section">
              <div className="section-label row-between">
                <span>
                  Activity evidence{" "}
                  <span className="section-meta">{selectedEvidence.kind}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setTab("evidence")}
                >
                  Focus evidence
                </button>
              </div>
              <div className="activity-evidence-embed">
                <EvidencePanel evidence={selectedEvidence} />
              </div>
            </section>
          )}

          {reviewable && onDecide && (
            <section className="ticket-section">
              <div className="section-label">Decision</div>
              <div className="review-decision-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={decision === "merged" || ticket.status === "failed"}
                  onClick={() => onDecide("approved")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={decision === "merged"}
                  onClick={() => onDecide("changes_requested")}
                >
                  Request changes
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={
                    decision === "merged" ||
                    (decision !== "approved" && ticket.status !== "succeeded")
                  }
                  onClick={() => onDecide("merged")}
                >
                  Merge
                </button>
                <span className={`review-chip review-${decision}`}>
                  {decision === "awaiting"
                    ? ticket.status === "failed"
                      ? "Needs retry"
                      : "Awaiting review"
                    : decision.replace("_", " ")}
                </span>
              </div>
            </section>
          )}

          {canStart && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onStart}
              disabled={starting}
            >
              {ticket.status === "failed"
                ? "Add to chat again"
                : "Add to chat as context"}
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}

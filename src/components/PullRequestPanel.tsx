import { useEffect, useMemo, useState } from "react";
import type { AgentRun, DiffEvidence, Ticket } from "../types";
import { DiffCodeBlock } from "./DiffCodeBlock";

interface PullRequestPanelProps {
  ticket: Ticket;
  run: AgentRun;
  diffs: DiffEvidence[];
  changeStats: { added: number; removed: number };
  testPassCount: number | undefined;
  testTotalCount: number | undefined;
  onOpenPullRequest: (payload: {
    title: string;
    body: string;
    asDraft: boolean;
  }) => void;
  onMarkReadyForReview: () => void;
  onAddComment: (body: string) => void;
  onViewTests?: () => void;
  onViewDiff?: () => void;
}

function buildDefaultPrTitle(ticket: Ticket) {
  const { commitMessage, prTitle } = ticket.delivery;
  if (prTitle) return prTitle;
  if (commitMessage) return commitMessage;
  return ticket.title;
}

function buildDefaultPrBody(ticket: Ticket) {
  if (ticket.delivery.prBody) return ticket.delivery.prBody;
  const criteria = ticket.criteria.map((c) => `- [ ] ${c}`).join("\n");
  return `## ${ticket.key}

${ticket.description}

### Acceptance criteria
${criteria}
`;
}

function checkIcon(status: "pass" | "fail" | "pending" | "warn") {
  switch (status) {
    case "pass":
      return "✓";
    case "fail":
      return "✕";
    case "warn":
      return "!";
    default:
      return "…";
  }
}

function deriveChecksFromRun(
  ticket: Ticket,
  run: AgentRun,
  testPassCount: number | undefined,
  testTotalCount: number | undefined,
) {
  if (ticket.delivery.checks?.length) return ticket.delivery.checks;

  const checks: { name: string; status: "pass" | "fail" | "pending"; detail?: string }[] =
    [];

  const testEvidence = run.evidence.find((e) => e.kind === "tests");
  if (testEvidence?.kind === "tests") {
    const failed = testEvidence.results.filter((r) => !r.passed);
    checks.push({
      name: "Tests",
      status: failed.length ? "fail" : "pass",
      detail: failed.length
        ? `${failed.map((r) => r.name).join(", ")} failed`
        : `${testEvidence.results.length} passed`,
    });
  } else if (testPassCount != null && testTotalCount != null) {
    checks.push({
      name: "Tests",
      status: testPassCount === testTotalCount ? "pass" : "fail",
      detail: `${testPassCount}/${testTotalCount} passed`,
    });
  }

  if (run.status === "running") {
    checks.push({ name: "Agent run", status: "pending", detail: "In progress" });
  }

  return checks;
}

export function PullRequestPanel({
  ticket,
  run,
  diffs,
  changeStats,
  testPassCount,
  testTotalCount,
  onOpenPullRequest,
  onMarkReadyForReview,
  onAddComment,
  onViewTests,
  onViewDiff,
}: PullRequestPanelProps) {
  const { delivery, branch, repoPath } = ticket;
  const baseBranch = delivery.baseBranch ?? "main";
  const hasPr = delivery.prNumber != null && delivery.prStatus !== "none";

  const [title, setTitle] = useState(() => buildDefaultPrTitle(ticket));
  const [body, setBody] = useState(() => buildDefaultPrBody(ticket));
  const [commentDraft, setCommentDraft] = useState("");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    setTitle(buildDefaultPrTitle(ticket));
    setBody(buildDefaultPrBody(ticket));
    setCommentDraft("");
    setOpening(false);
  }, [ticket.id]);

  const hasBranch = Boolean(branch && branch !== "main");
  const hasCommit = Boolean(delivery.commitSha);
  const hasChanges = run.filesChanged.length > 0 || diffs.length > 0;
  const allTestsPass =
    testPassCount != null &&
    testTotalCount != null &&
    testPassCount === testTotalCount;
  const testsKnown = testPassCount != null && testTotalCount != null;

  const checks = useMemo(
    () => deriveChecksFromRun(ticket, run, testPassCount, testTotalCount),
    [ticket, run, testPassCount, testTotalCount],
  );

  const ciFailing = checks.some((c) => c.status === "fail");
  const canOpenDraft = hasBranch && hasCommit && hasChanges && !hasPr;
  const canOpenForReview =
    canOpenDraft && (!testsKnown || allTestsPass) && !ciFailing;

  const diffPreview = diffs.find((d) => d.kind === "diff");

  const handleOpen = (asDraft: boolean) => {
    if (!canOpenDraft) return;
    setOpening(true);
    window.setTimeout(() => {
      onOpenPullRequest({ title: title.trim() || ticket.title, body, asDraft });
      setOpening(false);
    }, 400);
  };

  const submitComment = () => {
    const text = commentDraft.trim();
    if (!text) return;
    onAddComment(text);
    setCommentDraft("");
  };

  const readinessItems = [
    {
      label: "Branch created",
      status: hasBranch ? ("pass" as const) : ("fail" as const),
      detail: hasBranch ? branch : "No feature branch",
    },
    {
      label: "Commit on branch",
      status: hasCommit ? ("pass" as const) : ("fail" as const),
      detail: hasCommit ? delivery.commitSha! : "No commits yet",
    },
    {
      label: "Changes to review",
      status: hasChanges ? ("pass" as const) : ("fail" as const),
      detail: hasChanges
        ? `${run.filesChanged.length || diffs.length} file(s) · +${changeStats.added} −${changeStats.removed}`
        : "No diffs yet",
    },
    {
      label: "Tests",
      status: !testsKnown
        ? ("pending" as const)
        : allTestsPass
          ? ("pass" as const)
          : ("warn" as const),
      detail: testsKnown
        ? `${testPassCount}/${testTotalCount} passing`
        : "Not run yet",
    },
  ];

  return (
    <div className="ticket-pr">
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
            <span>Pull request</span>
          </nav>
          <h1>
            {hasPr ? (
              <>
                <span className="mono">#{delivery.prNumber}</span>{" "}
                {delivery.prTitle ?? title}
              </>
            ) : (
              "Open pull request"
            )}
          </h1>
        </div>
        {hasPr && (
          <div className="pr-panel-head-actions">
            <span className={`pr-chip pr-${delivery.prStatus}`}>
              {delivery.prStatus}
            </span>
            {delivery.prUrl && (
              <a
                className="pr-external-link"
                href={delivery.prUrl}
                target="_blank"
                rel="noreferrer"
              >
                View on GitHub ↗
              </a>
            )}
          </div>
        )}
      </div>

      {hasPr && (
        <div className="pr-ship-strip">
          <div className="pr-ship-strip-main">
            <span className="mono pr-branch-flow">
              {branch} → {baseBranch}
            </span>
            <span className="pr-ship-sep" aria-hidden>
              ·
            </span>
            <span className="mono">{repoPath}</span>
          </div>
          <div className="pr-ship-strip-stats">
            <span>
              {run.filesChanged.length || diffs.length} file
              {(run.filesChanged.length || diffs.length) !== 1 ? "s" : ""}{" "}
              <strong className="mono">
                +{changeStats.added} −{changeStats.removed}
              </strong>
            </span>
            {testsKnown && (
              <>
                <span className="pr-ship-sep" aria-hidden>
                  ·
                </span>
                <button
                  type="button"
                  className="pr-link-btn"
                  onClick={onViewTests}
                >
                  Tests {testPassCount}/{testTotalCount}
                </button>
              </>
            )}
            {checks.length > 0 && (
              <>
                <span className="pr-ship-sep" aria-hidden>
                  ·
                </span>
                <span className={ciFailing ? "pr-ci-fail" : "pr-ci-pass"}>
                  CI {ciFailing ? "failing" : "passing"}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {!hasPr && (
        <section className="ticket-section pr-section">
          <h2 className="ticket-section-title">Readiness</h2>
          <ul className="pr-readiness-list">
            {readinessItems.map((item) => (
              <li key={item.label} className={`pr-readiness-item pr-${item.status}`}>
                <span className="pr-readiness-icon" aria-hidden>
                  {checkIcon(item.status)}
                </span>
                <div className="pr-readiness-main">
                  <span className="pr-readiness-label">{item.label}</span>
                  <span className="pr-readiness-detail mono">{item.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasPr && (
        <section className="ticket-section pr-section">
          <h2 className="ticket-section-title">Compose</h2>
          <div className="pr-compose">
            <div className="pr-compose-meta">
              <span className="mono pr-branch-flow">
                {branch || "—"} → {baseBranch}
              </span>
              {hasCommit && (
                <span className="mono pr-commit-ref">
                  {delivery.commitSha} — {delivery.commitMessage}
                </span>
              )}
            </div>
            <label className="pr-field">
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pull request title"
              />
            </label>
            <label className="pr-field">
              <span>Description</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder="Describe the change…"
              />
            </label>
            <div className="pr-compose-actions">
              <button
                type="button"
                className="btn secondary"
                disabled={!canOpenDraft || opening}
                onClick={() => handleOpen(true)}
              >
                {opening ? "Opening…" : "Open draft"}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!canOpenForReview || opening}
                title={
                  !allTestsPass && testsKnown
                    ? "Fix failing tests before opening for review"
                    : undefined
                }
                onClick={() => handleOpen(false)}
              >
                Open for review
              </button>
            </div>
            {!allTestsPass && testsKnown && canOpenDraft && (
              <p className="pr-compose-hint muted-note">
                Tests are failing — you can still open a draft; CI will gate
                review.
              </p>
            )}
          </div>
        </section>
      )}

      {hasPr && delivery.prStatus === "draft" && (
        <section className="ticket-section pr-section">
          <div className="pr-draft-banner">
            <p>This pull request is a draft.</p>
            <button
              type="button"
              className="btn primary"
              onClick={onMarkReadyForReview}
            >
              Ready for review
            </button>
          </div>
        </section>
      )}

      {checks.length > 0 && (
        <section className="ticket-section pr-section">
          <h2 className="ticket-section-title">Checks</h2>
          <ul className="pr-checks-list">
            {checks.map((check) => (
              <li key={check.name} className={`pr-check pr-check-${check.status}`}>
                <span className="pr-check-icon" aria-hidden>
                  {checkIcon(check.status)}
                </span>
                <div className="pr-check-main">
                  <span className="pr-check-name">{check.name}</span>
                  {check.detail && (
                    <span className="pr-check-detail">{check.detail}</span>
                  )}
                </div>
                {check.name === "Tests" && check.status === "fail" && onViewTests && (
                  <button type="button" className="pr-link-btn" onClick={onViewTests}>
                    View tests
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {diffPreview?.kind === "diff" && (
        <section className="ticket-section pr-section">
          <div className="pr-diff-head">
            <h2 className="ticket-section-title">Changes</h2>
            {onViewDiff && (
              <button type="button" className="pr-link-btn" onClick={onViewDiff}>
                View full diff
              </button>
            )}
          </div>
          <p className="mono pr-diff-path">{diffPreview.path}</p>
          <DiffCodeBlock content={diffPreview.content} maxLines={12} />
        </section>
      )}

      {hasPr && delivery.commitSha && (
        <section className="ticket-section pr-section">
          <h2 className="ticket-section-title">Latest commit</h2>
          <div className="pr-commit-card">
            <span className="mono pr-commit-sha">{delivery.commitSha}</span>
            <span className="pr-commit-msg">{delivery.commitMessage}</span>
          </div>
        </section>
      )}

      {hasPr && (
        <section className="ticket-section pr-section">
          <h2 className="ticket-section-title">Discussion</h2>
          {delivery.comments.length === 0 ? (
            <p className="muted-note">No review comments yet.</p>
          ) : (
            <ul className="pr-comment-list">
              {delivery.comments.map((c) => (
                <li key={c.id} className="pr-comment">
                  <div className="pr-comment-meta">
                    <strong>{c.author}</strong>
                    <span>{c.createdAt}</span>
                  </div>
                  <p>{c.body}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="pr-comment-compose">
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Leave a review comment…"
              rows={3}
            />
            <button
              type="button"
              className="btn secondary"
              disabled={!commentDraft.trim()}
              onClick={submitComment}
            >
              Comment
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

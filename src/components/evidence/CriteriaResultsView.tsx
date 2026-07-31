import type { CriteriaEvidence } from "../../types";

export function CriteriaResultsView({
  evidence,
  compact = false,
}: {
  evidence: CriteriaEvidence;
  compact?: boolean;
}) {
  const met = evidence.results.filter((r) => r.met).length;

  const body = (
    <div className="criteria-panel">
      <div className="criteria-panel-head">
        <div className="criteria-panel-summary">
          <span
            className={
              met === evidence.results.length
                ? "criteria-badge pass"
                : "criteria-badge fail"
            }
          >
            {met}/{evidence.results.length} met
          </span>
          {!compact && (
            <span className="criteria-suite">{evidence.title}</span>
          )}
        </div>
      </div>
      <ul className="criteria-result-list">
        {evidence.results.map((r) => (
          <li
            key={r.text}
            className={r.met ? "criteria-result pass" : "criteria-result fail"}
          >
            <span className="criteria-result-icon" aria-hidden>
              {r.met ? "✓" : "✕"}
            </span>
            <div className="criteria-result-main">
              <span className="criteria-result-text">{r.text}</span>
              {r.note && (
                <span className="criteria-result-note">{r.note}</span>
              )}
            </div>
            <span className="criteria-result-status">
              {r.met ? "Met" : "Not met"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  if (compact) return body;

  return <div className="evidence-panel">{body}</div>;
}

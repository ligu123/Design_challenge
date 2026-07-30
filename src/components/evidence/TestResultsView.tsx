import type { TestEvidence } from "../../types";

export function TestResultsView({ evidence }: { evidence: TestEvidence }) {
  const passed = evidence.results.filter((r) => r.passed).length;
  const totalMs = evidence.results.reduce((sum, r) => sum + r.durationMs, 0);

  return (
    <div className="evidence-panel">
      <div className="tests-panel">
        <div className="tests-panel-head">
          <div className="tests-panel-summary">
            <span
              className={
                passed === evidence.results.length
                  ? "tests-badge pass"
                  : "tests-badge fail"
              }
            >
              {passed}/{evidence.results.length} passed
            </span>
            <span className="tests-suite mono">{evidence.title}</span>
          </div>
          <span className="tests-duration">{totalMs}ms total</span>
        </div>
        <ul className="tests-result-list">
          {evidence.results.map((r) => (
            <li
              key={r.name}
              className={r.passed ? "tests-result pass" : "tests-result fail"}
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
    </div>
  );
}

import type { PerformanceMetrics } from "../types";

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function PerformanceSummary({ metrics }: { metrics: PerformanceMetrics }) {
  return (
    <div className="performance-summary">
      <h3>Run performance</h3>
      <div className="perf-grid">
        <div className="perf-item">
          <span className="perf-label">Criteria</span>
          <span className="perf-value">
            {metrics.criteriaMet ? "Met" : "Not met"}
          </span>
        </div>
        <div className="perf-item">
          <span className="perf-label">Tests</span>
          <span className="perf-value">
            {metrics.testsPassed}/{metrics.testsTotal}
          </span>
        </div>
        <div className="perf-item">
          <span className="perf-label">Time</span>
          <span className="perf-value">{formatTime(metrics.timeSec)}</span>
        </div>
        <div className="perf-item">
          <span className="perf-label">Retries</span>
          <span className="perf-value">
            {metrics.retries} ({metrics.errors} err)
          </span>
        </div>
        <div className="perf-item">
          <span className="perf-label">Cost</span>
          <span className="perf-value">
            ${metrics.costUsd.toFixed(2)} · {metrics.tokens.toLocaleString()} tok
          </span>
        </div>
        <div className="perf-item">
          <span className="perf-label">Adherence</span>
          <span className="perf-value">
            {Math.round(metrics.adherence * 100)}% · Q
            {Math.round(metrics.qualityScore * 100)}
          </span>
        </div>
      </div>
    </div>
  );
}

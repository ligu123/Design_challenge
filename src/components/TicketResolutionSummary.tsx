import { useMemo } from "react";
import type { Ticket } from "../types";

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function ticketStats(tickets: Ticket[]) {
  const total = tickets.length;
  const resolved = tickets.filter((t) => t.status === "succeeded").length;
  const running = tickets.filter((t) => t.status === "running").length;
  const blocked = tickets.filter((t) => t.status === "blocked").length;
  const failed = tickets.filter((t) => t.status === "failed").length;
  const idle = tickets.filter((t) => t.status === "idle").length;
  const finished = resolved + failed;
  const successRate =
    finished > 0 ? Math.round((resolved / finished) * 100) : null;

  const runsWithPerf = tickets.filter((t) => t.run.performance);
  const avgTimeSec =
    runsWithPerf.length > 0
      ? Math.round(
          runsWithPerf.reduce(
            (sum, t) => sum + (t.run.performance?.timeSec ?? 0),
            0,
          ) / runsWithPerf.length,
        )
      : null;
  const totalCost = runsWithPerf.reduce(
    (sum, t) => sum + (t.run.performance?.costUsd ?? 0),
    0,
  );

  return {
    total,
    resolved,
    running,
    blocked,
    failed,
    idle,
    open: total - resolved,
    successRate,
    avgTimeSec,
    totalCost,
    runsWithPerf: runsWithPerf.length,
  };
}

export function TicketResolutionSummary({ tickets }: { tickets: Ticket[] }) {
  const stats = useMemo(() => ticketStats(tickets), [tickets]);

  return (
    <div className="performance-summary top-nav-resolved-card-inner">
      <h3>Ticket queue</h3>
      <div className="perf-grid">
        <div className="perf-item">
          <span className="perf-label">Resolved</span>
          <span className="perf-value">
            {stats.resolved}/{stats.total}
          </span>
        </div>
        <div className="perf-item">
          <span className="perf-label">Success rate</span>
          <span className="perf-value">
            {stats.successRate == null ? "—" : `${stats.successRate}%`}
          </span>
        </div>
        <div className="perf-item">
          <span className="perf-label">Running</span>
          <span className="perf-value">
            {stats.running} active
          </span>
        </div>
        <div className="perf-item">
          <span className="perf-label">Blocked</span>
          <span className="perf-value">
            {stats.blocked} need you
          </span>
        </div>
        <div className="perf-item">
          <span className="perf-label">Open</span>
          <span className="perf-value">
            {stats.open} in queue
          </span>
        </div>
        <div className="perf-item">
          <span className="perf-label">Avg run</span>
          <span className="perf-value">
            {stats.avgTimeSec == null
              ? "—"
              : `${formatTime(stats.avgTimeSec)} · $${stats.totalCost.toFixed(2)}`}
          </span>
        </div>
      </div>
    </div>
  );
}

export { ticketStats };

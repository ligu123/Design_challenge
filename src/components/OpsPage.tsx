import {
  opsAttentionMeta,
  opsFailureBuckets,
  opsModelUsage,
  opsPatterns,
  opsPolicyStats,
  opsTrend,
} from "../data/mock";
import type { Ticket } from "../types";
import { StatusChip } from "./StatusChip";

interface OpsPageProps {
  tickets: Ticket[];
  onOpenTicket: (ticketId: string) => void;
  onOpenRun: (ticketId: string) => void;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatWait(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function OpsPage({ tickets, onOpenTicket, onOpenRun }: OpsPageProps) {
  const finished = tickets.filter(
    (t) => t.status === "succeeded" || t.status === "failed",
  );
  const succeeded = tickets.filter((t) => t.status === "succeeded");
  const blocked = tickets.filter((t) => t.status === "blocked");
  const failed = tickets.filter((t) => t.status === "failed");
  const withPerf = tickets.filter((t) => t.run.performance);
  const successRate =
    finished.length === 0
      ? null
      : Math.round((succeeded.length / finished.length) * 100);
  const totalCost = withPerf.reduce(
    (sum, t) => sum + (t.run.performance?.costUsd ?? 0),
    0,
  );
  const totalTokens = withPerf.reduce(
    (sum, t) => sum + (t.run.performance?.tokens ?? 0),
    0,
  );
  const avgTime =
    withPerf.length === 0
      ? null
      : Math.round(
          withPerf.reduce(
            (sum, t) => sum + (t.run.performance?.timeSec ?? 0),
            0,
          ) / withPerf.length,
        );
  const totalRetries = withPerf.reduce(
    (sum, t) => sum + (t.run.performance?.retries ?? 0),
    0,
  );

  const recent = tickets.filter((t) => t.status !== "idle");
  const attention = tickets
    .filter((t) => t.status === "blocked" || t.status === "failed")
    .map((t) => ({
      ticket: t,
      meta: opsAttentionMeta[t.id] ?? {
        waitMin: t.status === "blocked" ? 20 : 10,
        reason:
          t.status === "blocked"
            ? "Waiting on human in chat"
            : "Needs retry or review decision",
      },
    }))
    .sort((a, b) => b.meta.waitMin - a.meta.waitMin);

  const maxTrendCost = Math.max(...opsTrend.map((p) => p.costUsd), 0.01);
  const maxTrendTokens = Math.max(...opsTrend.map((p) => p.tokens), 1);
  const maxModelCost = Math.max(...opsModelUsage.map((m) => m.costUsd), 0.01);

  return (
    <div className="ops-page">
      <header className="ops-hero">
        <div className="ops-hero-copy">
          <div className="section-label">Ops</div>
          <h1>Project health</h1>
          <p className="ops-hero-sub">
            Act on blocked and failed runs first. Trends and model spend sit
            below for diagnosis.
          </p>
        </div>
        <div className="ops-hero-kpis">
          <div className="ops-kpi ops-kpi-primary">
            <span className="ops-kpi-label">Success</span>
            <span className="ops-kpi-value">
              {successRate === null ? "—" : `${successRate}%`}
            </span>
            <span className="ops-kpi-sub">
              {succeeded.length}/{finished.length} finished
            </span>
          </div>
          <div className="ops-kpi ops-kpi-alert">
            <span className="ops-kpi-label">Needs you</span>
            <span className="ops-kpi-value">{attention.length}</span>
            <span className="ops-kpi-sub">
              {blocked.length} blocked · {failed.length} failed
            </span>
          </div>
          <div className="ops-kpi">
            <span className="ops-kpi-label">Spend</span>
            <span className="ops-kpi-value">${totalCost.toFixed(2)}</span>
            <span className="ops-kpi-sub">
              {totalTokens.toLocaleString()} tok · {withPerf.length} runs
            </span>
          </div>
          <div className="ops-kpi ops-kpi-quiet">
            <span className="ops-kpi-label">Avg time</span>
            <span className="ops-kpi-value">
              {avgTime === null ? "—" : formatTime(avgTime)}
            </span>
            <span className="ops-kpi-sub">{totalRetries} retries</span>
          </div>
        </div>
      </header>

      <section className="ops-band ops-band-primary">
        <div className="ops-band-head">
          <h2>Attention</h2>
          <p>Items waiting on a human decision or retry.</p>
        </div>
        <div className="ops-panel ops-panel-emphasis">
          <div className="ops-panel-head">
            <span className="section-label">Queue</span>
            <span className="section-meta">{attention.length}</span>
          </div>
          {attention.length === 0 ? (
            <p className="ops-empty">No blocked or failed runs.</p>
          ) : (
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Status</th>
                  <th>Wait</th>
                  <th>Reason</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {attention.map(({ ticket, meta }) => (
                  <tr key={ticket.id}>
                    <td>
                      <button
                        type="button"
                        className="ops-row-btn"
                        onClick={() => onOpenTicket(ticket.id)}
                      >
                        <span className="ops-row-title mono">{ticket.key}</span>
                        <span className="ops-row-detail">{ticket.title}</span>
                      </button>
                    </td>
                    <td>
                      <StatusChip status={ticket.status} />
                    </td>
                    <td className="mono ops-wait">{formatWait(meta.waitMin)}</td>
                    <td className="ops-reason">{meta.reason}</td>
                    <td className="ops-actions">
                      <button
                        type="button"
                        className="btn btn-primary ops-mini"
                        onClick={() => onOpenRun(ticket.id)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="ops-band">
        <div className="ops-band-head">
          <h2>Activity</h2>
          <p>What agents are doing and recurring patterns.</p>
        </div>
        <div className="ops-split ops-split-activity">
          <div className="ops-panel ops-panel-wide">
            <div className="ops-panel-head">
              <span className="section-label">Recent runs</span>
              <span className="section-meta">{recent.length}</span>
            </div>
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Ticket</th>
                  <th>Status</th>
                  <th>Title</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <button
                        type="button"
                        className="ops-row-btn mono"
                        onClick={() => onOpenRun(t.id)}
                      >
                        {t.run.id}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ops-row-btn mono"
                        onClick={() => onOpenTicket(t.id)}
                      >
                        {t.key}
                      </button>
                    </td>
                    <td>
                      <StatusChip status={t.status} />
                    </td>
                    <td className="ops-recent-title">{t.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ops-panel">
            <div className="ops-panel-head">
              <span className="section-label">Patterns</span>
              <span className="section-meta">{opsPatterns.length}</span>
            </div>
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Pattern</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {opsPatterns.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button
                        type="button"
                        className="ops-row-btn"
                        onClick={() => onOpenRun(p.relatedTicketId)}
                      >
                        <span className="ops-row-title">{p.title}</span>
                        <span className="ops-row-detail">{p.detail}</span>
                      </button>
                    </td>
                    <td className="mono ops-count">{p.count}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ops-band ops-band-secondary">
        <div className="ops-band-head">
          <h2>Performance</h2>
          <p>Spend, failures, and policy outcomes over time.</p>
        </div>
        <div className="ops-panel ops-panel-trend">
          <div className="ops-panel-head">
            <span className="section-label">7-day trend</span>
            <span className="section-meta">cost · success</span>
          </div>
          <div className="ops-trend">
            {opsTrend.map((p) => (
              <div
                key={p.day}
                className="ops-trend-col"
                title={`${p.day}: ${p.runs} runs, $${p.costUsd.toFixed(2)}, ${p.successRate}% success`}
              >
                <div className="ops-trend-bars">
                  <span
                    className="ops-trend-cost"
                    style={{
                      height: `${Math.max(8, Math.round((p.costUsd / maxTrendCost) * 88))}px`,
                    }}
                  />
                  <span
                    className="ops-trend-success"
                    style={{
                      height: `${Math.max(8, Math.round((p.successRate / 100) * 88))}px`,
                    }}
                  />
                </div>
                <span className="ops-trend-day">{p.day}</span>
                <span className="ops-trend-meta mono">
                  {Math.round(p.tokens / 1000)}k
                </span>
              </div>
            ))}
          </div>
          <div className="ops-trend-legend">
            <span>
              <i className="ops-leg-cost" /> Cost
            </span>
            <span>
              <i className="ops-leg-success" /> Success %
            </span>
            <span className="muted-inline">
              Peak tokens/day {Math.round(maxTrendTokens / 1000)}k
            </span>
          </div>
        </div>

        <div className="ops-split ops-split-3">
          <div className="ops-panel">
            <div className="ops-panel-head">
              <span className="section-label">Model usage</span>
              <span className="section-meta">{opsModelUsage.length}</span>
            </div>
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Succ</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {opsModelUsage.map((m) => (
                  <tr key={m.model}>
                    <td>
                      <div className="ops-model-cell">
                        <span className="mono">{m.model}</span>
                        <span
                          className="ops-bar"
                          style={{
                            width: `${Math.round((m.costUsd / maxModelCost) * 100)}%`,
                          }}
                          title={`${m.runs} runs · ${m.tokens.toLocaleString()} tok`}
                        />
                      </div>
                    </td>
                    <td className="mono">{m.successRate}%</td>
                    <td className="mono">${m.costUsd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ops-panel">
            <div className="ops-panel-head">
              <span className="section-label">Failure breakdown</span>
              <span className="section-meta">
                {opsFailureBuckets.reduce((s, b) => s + b.count, 0)}
              </span>
            </div>
            <ul className="ops-fail-list">
              {opsFailureBuckets.map((b) => (
                <li key={b.id}>
                  <div className="ops-fail-top">
                    <span className="ops-fail-label">{b.label}</span>
                    <span className="mono">
                      {b.count} · {Math.round(b.share * 100)}%
                    </span>
                  </div>
                  <div className="ops-fail-track">
                    <span
                      className="ops-fail-fill"
                      style={{ width: `${Math.round(b.share * 100)}%` }}
                    />
                  </div>
                  <p className="ops-fail-detail">{b.detail}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="ops-panel">
            <div className="ops-panel-head">
              <span className="section-label">Policy performance</span>
              <span className="section-meta">{opsPolicyStats.length}</span>
            </div>
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Succ</th>
                  <th>Avg $</th>
                </tr>
              </thead>
              <tbody>
                {opsPolicyStats.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="ops-row-title">{p.name}</span>
                      <span className="ops-row-detail">
                        {p.runs} runs · {p.blockedRate}% blocked
                      </span>
                    </td>
                    <td className="mono">{p.successRate}%</td>
                    <td className="mono">${p.avgCostUsd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

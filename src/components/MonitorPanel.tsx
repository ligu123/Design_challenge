import type { Ticket } from "../types";

interface MonitorPanelProps {
  open: boolean;
  ticket: Ticket | null;
  tickets: Ticket[];
  onClose: () => void;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function MonitorPanel({
  open,
  ticket,
  tickets,
  onClose,
}: MonitorPanelProps) {
  if (!open) return null;

  const finished = tickets.filter(
    (t) => t.status === "succeeded" || t.status === "failed",
  );
  const succeeded = tickets.filter((t) => t.status === "succeeded").length;
  const rate =
    finished.length === 0
      ? null
      : Math.round((succeeded / finished.length) * 100);

  const run = ticket?.run;
  const perf = run?.performance;
  const activities =
    run?.timeline.filter((i) => i.type === "activity") ?? [];

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Run monitor">
        <div className="drawer-header">
          <h2>Monitor</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="drawer-body">
          <div className="agg-banner">
            Project success rate:{" "}
            <strong>{rate === null ? "—" : `${rate}%`}</strong>
            <span style={{ color: "var(--muted)" }}>
              {" "}
              ({succeeded}/{finished.length} finished)
            </span>
          </div>

          {!ticket && (
            <p style={{ color: "var(--muted)" }}>
              Select a ticket to inspect its run.
            </p>
          )}

          {ticket && (
            <>
              <div className="monitor-section">
                <h3>Current run · {ticket.key}</h3>
                <div className="stat-row">
                  <span>Status</span>
                  <span>{ticket.status}</span>
                </div>
                <div className="stat-row">
                  <span>Tool calls</span>
                  <span>{activities.length}</span>
                </div>
                <div className="stat-row">
                  <span>Errors / retries</span>
                  <span>
                    {perf ? `${perf.errors} / ${perf.retries}` : "—"}
                  </span>
                </div>
                <div className="stat-row">
                  <span>Time</span>
                  <span>{perf ? formatTime(perf.timeSec) : "—"}</span>
                </div>
                <div className="stat-row">
                  <span>Tokens / cost</span>
                  <span>
                    {perf
                      ? `${perf.tokens.toLocaleString()} / $${perf.costUsd.toFixed(2)}`
                      : "—"}
                  </span>
                </div>
                <div className="stat-row">
                  <span>Tests</span>
                  <span>
                    {perf
                      ? `${perf.testsPassed}/${perf.testsTotal}`
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="monitor-section">
                <h3>Files changed</h3>
                {run && run.filesChanged.length > 0 ? (
                  <ul className="file-list">
                    {run.filesChanged.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: "var(--muted)", margin: 0 }}>None yet</p>
                )}
              </div>

              <div className="monitor-section">
                <h3>Activity log</h3>
                {activities.length === 0 ? (
                  <p style={{ color: "var(--muted)", margin: 0 }}>No activity</p>
                ) : (
                  <ul className="file-list">
                    {activities.map((a) =>
                      a.type === "activity" ? (
                        <li key={a.id}>
                          [{a.status}] {a.kind} — {a.detail}
                        </li>
                      ) : null,
                    )}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

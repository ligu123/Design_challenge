import { environmentTargets } from "../data/mock";
import type { EnvironmentTarget, PlaceId } from "../types";

interface EnvironmentsPageProps {
  selectedId: string;
  onSelect: (id: string) => void;
  onNavigateSettings: (place: Extract<PlaceId, "memory" | "environments">) => void;
}

const kindLabel: Record<EnvironmentTarget["kind"], string> = {
  test: "Test",
  ci: "CI",
  deploy: "Deploy",
};

export function EnvironmentsPage({
  selectedId,
  onSelect,
  onNavigateSettings,
}: EnvironmentsPageProps) {
  const selected =
    environmentTargets.find((e) => e.id === selectedId) ??
    environmentTargets[0];

  return (
    <>
      <aside className="queue">
        <div className="queue-header">
          <span>Settings</span>
        </div>
        <div className="queue-lined-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={false}
            onClick={() => onNavigateSettings("memory")}
          >
            Memory
          </button>
          <button type="button" className="active" role="tab" aria-selected>
            Environments
          </button>
        </div>
        <div className="queue-list">
          {environmentTargets.map((e) => (
            <button
              key={e.id}
              type="button"
              className={`ticket-item${selectedId === e.id ? " active" : ""}`}
              onClick={() => onSelect(e.id)}
            >
              <div className="ticket-item-top">
                <span className="ticket-id">{kindLabel[e.kind]}</span>
                <span className={`env-status env-${e.recentStatus}`}>
                  {e.recentStatus}
                </span>
              </div>
              <div className="ticket-title">{e.name}</div>
              <div className="queue-meta-text">{e.lastRunAt}</div>
            </button>
          ))}
        </div>
      </aside>
      <main className="center">
        <div className="center-body place-detail">
          <nav className="ticket-breadcrumb" aria-label="Breadcrumb">
            <span>Settings</span>
            <span className="ticket-breadcrumb-sep" aria-hidden>
              /
            </span>
            <span>Environments</span>
          </nav>
          <div className="section-label">{kindLabel[selected.kind]} target</div>
          <h1>{selected.name}</h1>
          <p className="ticket-desc">{selected.note}</p>
          <div className="stat-grid">
            <div className="stat-row">
              <span>Target</span>
              <span className="mono">{selected.url}</span>
            </div>
            <div className="stat-row">
              <span>Pipeline status</span>
              <span className={`env-status env-${selected.recentStatus}`}>
                {selected.recentStatus}
              </span>
            </div>
            <div className="stat-row">
              <span>Last run</span>
              <span>{selected.lastRunAt}</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

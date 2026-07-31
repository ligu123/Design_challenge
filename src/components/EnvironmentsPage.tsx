import { environmentTargets } from "../data/mock";
import type { EnvironmentTarget } from "../types";

const kindLabel: Record<EnvironmentTarget["kind"], string> = {
  test: "Test",
  ci: "CI",
  deploy: "Deploy",
};

export function EnvironmentsPage() {
  return (
    <div className="settings-stack">
      {environmentTargets.map((target) => (
        <section key={target.id} className="settings-stack-section">
          <div className="section-label">{kindLabel[target.kind]} target</div>
          <h3 className="settings-item-title">{target.name}</h3>
          <p className="ticket-desc">{target.note}</p>
          <div className="stat-grid">
            <div className="stat-row">
              <span>Target</span>
              <span className="mono">{target.url}</span>
            </div>
            <div className="stat-row">
              <span>Pipeline status</span>
              <span className={`env-status env-${target.recentStatus}`}>
                {target.recentStatus}
              </span>
            </div>
            <div className="stat-row">
              <span>Last run</span>
              <span>{target.lastRunAt}</span>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

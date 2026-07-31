import type { AgentConfig, PolicyPlaybook } from "../types";

interface PoliciesPageProps {
  policies: PolicyPlaybook[];
  selectedId: string;
  activePolicyId: string;
  onSelect: (id: string) => void;
  onApply: (policy: PolicyPlaybook) => void;
  config: AgentConfig;
}

const TOOL_ROWS = [
  ["readFiles", "Read"],
  ["editFiles", "Edit"],
  ["runTerminal", "Terminal"],
  ["runTests", "Tests"],
  ["useNetwork", "Network"],
] as const;

export function PoliciesPage({
  policies,
  selectedId,
  activePolicyId,
  onSelect,
  onApply,
  config,
}: PoliciesPageProps) {
  const selected = policies.find((p) => p.id === selectedId) ?? policies[0];
  const perms = selected.config.permissions;
  const isActive = activePolicyId === selected.id;

  return (
    <>
      <div className="settings-subtabs" role="tablist" aria-label="Policies">
        {policies.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            className={selectedId === p.id ? "active" : ""}
            aria-selected={selectedId === p.id}
            onClick={() => onSelect(p.id)}
          >
            {p.name}
            {activePolicyId === p.id && (
              <span className="settings-subtab-badge">Active</span>
            )}
          </button>
        ))}
      </div>

      <div className="settings-section-body policy-page">
        <div className="settings-item-toolbar">
          <p className="settings-item-summary">{selected.summary}</p>
          <div className="settings-item-actions">
            {isActive && (
              <span className="review-chip review-approved">Session active</span>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onApply(selected)}
              disabled={isActive}
            >
              {isActive ? "Applied to session" : "Apply to session"}
            </button>
          </div>
        </div>

        <div className="policy-grid">
          <section className="ops-panel">
            <div className="ops-panel-head">
              <span className="section-label">Model & limits</span>
              <span className="section-meta">{selected.config.effort} effort</span>
            </div>
            <div className="policy-limits">
              <div className="policy-limit">
                <span>Model</span>
                <strong className="mono">{selected.config.model}</strong>
              </div>
              <div className="policy-limit">
                <span>Time</span>
                <strong>{selected.config.timeLimitMin} min</strong>
              </div>
              <div className="policy-limit">
                <span>Cost</span>
                <strong>${selected.config.costLimitUsd.toFixed(2)}</strong>
              </div>
              <div className="policy-limit">
                <span>Commands</span>
                <strong>{selected.config.commandLimit}</strong>
              </div>
              <div className="policy-limit policy-limit-wide">
                <span>Repo scope</span>
                <strong className="mono">{selected.config.repoScope}</strong>
              </div>
              <div className="policy-limit">
                <span>Test env</span>
                <strong className="mono">{selected.config.testEnv}</strong>
              </div>
              <div className="policy-limit">
                <span>Deploy env</span>
                <strong className="mono">{selected.config.deployEnv}</strong>
              </div>
            </div>
          </section>

          <section className="ops-panel">
            <div className="ops-panel-head">
              <span className="section-label">Tools</span>
              <span className="section-meta">
                {TOOL_ROWS.filter(([k]) => perms[k]).length}/{TOOL_ROWS.length}{" "}
                on
              </span>
            </div>
            <ul className="policy-tools">
              {TOOL_ROWS.map(([key, label]) => (
                <li
                  key={key}
                  className={perms[key] ? "policy-tool on" : "policy-tool off"}
                >
                  <span className="policy-tool-label">
                    <span className="policy-tool-dot" aria-hidden />
                    {label}
                  </span>
                  <span className="mono">{perms[key] ? "on" : "off"}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="ops-panel policy-rules-panel">
            <div className="ops-panel-head">
              <span className="section-label">Rules</span>
            </div>
            <pre className="policy-rules">{selected.config.rules}</pre>
          </section>
        </div>

        {isActive && (
          <p className="policy-session-note">
            Live session: {config.model} · {config.effort} · $
            {config.costLimitUsd.toFixed(2)} · {config.timeLimitMin}m
          </p>
        )}
      </div>
    </>
  );
}

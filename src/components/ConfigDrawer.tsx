import type { AgentConfig } from "../types";

interface ConfigDrawerProps {
  open: boolean;
  config: AgentConfig;
  onChange: (config: AgentConfig) => void;
  onClose: () => void;
}

export function ConfigDrawer({
  open,
  config,
  onChange,
  onClose,
}: ConfigDrawerProps) {
  if (!open) return null;

  const set = (patch: Partial<AgentConfig>) => onChange({ ...config, ...patch });
  const setPerm = (
    key: keyof AgentConfig["permissions"],
    value: boolean,
  ) =>
    onChange({
      ...config,
      permissions: { ...config.permissions, [key]: value },
    });

  const permissionRows = [
    ["readFiles", "Read files"],
    ["editFiles", "Edit files"],
    ["runTerminal", "Run terminal"],
    ["runTests", "Run tests"],
    ["useNetwork", "Network access"],
  ] as const;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Agent configuration">
        <div className="drawer-header">
          <h2>Configuration</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="drawer-body">
          <div className="field">
            <label htmlFor="model">Model</label>
            <select
              id="model"
              value={config.model}
              onChange={(e) => set({ model: e.target.value })}
            >
              <option value="claude-sonnet">claude-sonnet</option>
              <option value="claude-opus">claude-opus</option>
              <option value="gpt-4.1">gpt-4.1</option>
              <option value="o3-mini">o3-mini</option>
            </select>
          </div>

          <div className="field">
            <label>Tool permissions</label>
            {(
              permissionRows
            ).map(([key, label]) => (
              <label key={key} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={config.permissions[key]}
                  onChange={(e) => setPerm(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="field">
            <label htmlFor="scope">Repo / folder scope</label>
            <input
              id="scope"
              value={config.repoScope}
              onChange={(e) => set({ repoScope: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="rules">Coding rules</label>
            <textarea
              id="rules"
              value={config.rules}
              onChange={(e) => set({ rules: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="time">Time limit (minutes)</label>
            <input
              id="time"
              type="number"
              min={1}
              value={config.timeLimitMin}
              onChange={(e) => set({ timeLimitMin: Number(e.target.value) })}
            />
          </div>

          <div className="field">
            <label htmlFor="cost">Cost limit (USD)</label>
            <input
              id="cost"
              type="number"
              min={0}
              step={0.1}
              value={config.costLimitUsd}
              onChange={(e) => set({ costLimitUsd: Number(e.target.value) })}
            />
          </div>

          <div className="field">
            <label htmlFor="cmds">Command limit</label>
            <input
              id="cmds"
              type="number"
              min={1}
              value={config.commandLimit}
              onChange={(e) => set({ commandLimit: Number(e.target.value) })}
            />
          </div>

          <div className="field">
            <label htmlFor="testEnv">Test environment</label>
            <input
              id="testEnv"
              value={config.testEnv}
              onChange={(e) => set({ testEnv: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="deployEnv">Deploy environment</label>
            <input
              id="deployEnv"
              value={config.deployEnv}
              onChange={(e) => set({ deployEnv: e.target.value })}
            />
          </div>
        </div>
      </aside>
    </>
  );
}

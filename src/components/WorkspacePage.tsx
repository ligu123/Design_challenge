import {
  workspaceBranches,
  workspaceHotFiles,
  workspaceRepoMap,
} from "../data/mock";
import { StatusChip } from "./StatusChip";

type WorkspaceTab = "map" | "hot" | "branches";

interface WorkspacePageProps {
  tab: WorkspaceTab;
  onTab: (tab: WorkspaceTab) => void;
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
}

export function WorkspacePage({
  tab,
  onTab,
  selectedPath,
  onSelectPath,
}: WorkspacePageProps) {
  const hot = workspaceHotFiles.find((f) => f.path === selectedPath);
  const branch = workspaceBranches.find((b) => b.name === selectedPath);

  return (
    <>
      <aside className="queue">
        <div className="queue-header">
          <span>Workspace</span>
        </div>
        <div className="view-toggle queue-tabs" role="tablist">
          {(
            [
              ["map", "Repo map"],
              ["hot", "Hot files"],
              ["branches", "Branches"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              className={tab === id ? "active" : undefined}
              aria-selected={tab === id}
              onClick={() => onTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="queue-list">
          {tab === "map" &&
            workspaceRepoMap.map((node) => (
              <button
                key={node.path}
                type="button"
                className={`ticket-item${selectedPath === node.path ? " active" : ""}`}
                onClick={() => onSelectPath(node.path)}
              >
                <div className="ticket-item-top">
                  <span className="mono ticket-id">{node.kind}</span>
                </div>
                <div className="ticket-title mono">{node.path}</div>
              </button>
            ))}
          {tab === "hot" &&
            workspaceHotFiles.map((f) => (
              <button
                key={f.path}
                type="button"
                className={`ticket-item${selectedPath === f.path ? " active" : ""}`}
                onClick={() => onSelectPath(f.path)}
              >
                <div className="ticket-item-top">
                  <span className="ticket-id">{f.hits} hits</span>
                </div>
                <div className="ticket-title mono">{f.path}</div>
                <div className="queue-meta-text">{f.lastBranch}</div>
              </button>
            ))}
          {tab === "branches" &&
            workspaceBranches.map((b) => (
              <button
                key={b.name}
                type="button"
                className={`ticket-item${selectedPath === b.name ? " active" : ""}`}
                onClick={() => onSelectPath(b.name)}
              >
                <div className="ticket-item-top">
                  <span className="ticket-id">{b.ticketKey}</span>
                  <StatusChip status={b.status} />
                </div>
                <div className="ticket-title mono">{b.name}</div>
              </button>
            ))}
        </div>
      </aside>
      <main className="center">
        <div className="center-body place-detail">
          <div className="section-label">Workspace</div>
          <h1>
            {tab === "map" && "Repo map"}
            {tab === "hot" && "Hot files"}
            {tab === "branches" && "Agent branches"}
          </h1>
          <p className="ticket-desc">
            Files and branches agents have touched in this project mock.
          </p>

          {!selectedPath && (
            <p className="muted-note">Select an item from the list.</p>
          )}

          {tab === "map" && selectedPath && (
            <section className="ticket-section">
              <div className="section-label">Path</div>
              <p className="mono">{selectedPath}</p>
              <p className="ticket-desc">
                {workspaceRepoMap.find((n) => n.path === selectedPath)?.kind ===
                "dir"
                  ? "Directory agents commonly scope into."
                  : "Tracked project file."}
              </p>
            </section>
          )}

          {tab === "hot" && hot && (
            <section className="ticket-section">
              <div className="section-label">Hot file</div>
              <p className="mono">{hot.path}</p>
              <div className="stat-grid">
                <div className="stat-row">
                  <span>Agent hits</span>
                  <span>{hot.hits}</span>
                </div>
                <div className="stat-row">
                  <span>Last branch</span>
                  <span className="mono">{hot.lastBranch}</span>
                </div>
              </div>
            </section>
          )}

          {tab === "branches" && branch && (
            <section className="ticket-section">
              <div className="section-label">Branch</div>
              <p className="mono">{branch.name}</p>
              <div className="stat-grid">
                <div className="stat-row">
                  <span>Ticket</span>
                  <span className="mono">{branch.ticketKey}</span>
                </div>
                <div className="stat-row">
                  <span>Status</span>
                  <StatusChip status={branch.status} />
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

import type { ActivityKind, TimelineItem } from "../types";
import { ActivityStatusIcon } from "./StatusChip";

const icons: Record<ActivityKind, string> = {
  read: "R",
  search: "S",
  edit: "E",
  terminal: "$",
  test: "T",
  fix: "F",
  ask: "?",
};

const defaultDuration: Record<ActivityKind, number> = {
  search: 1600,
  read: 420,
  edit: 2800,
  terminal: 5400,
  test: 4100,
  fix: 2200,
  ask: 0,
};

const defaultTokens: Record<ActivityKind, number> = {
  search: 540,
  read: 210,
  edit: 1200,
  terminal: 80,
  test: 160,
  fix: 980,
  ask: 120,
};

function formatDuration(ms: number) {
  if (ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(sec < 10 ? 1 : 0)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

interface ActivityItemProps {
  item: Extract<TimelineItem, { type: "activity" }>;
  selected: boolean;
  onSelect: () => void;
}

export function ActivityItem({ item, selected, onSelect }: ActivityItemProps) {
  const clickable = Boolean(item.evidenceId);
  const className = `activity-item${selected ? " selected" : ""}${clickable ? " clickable" : ""}`;

  const durationMs = item.durationMs ?? defaultDuration[item.kind];
  const tokens = item.tokens ?? defaultTokens[item.kind];
  const files = item.filesChanged ?? [];
  const showTime = item.status !== "waiting" && durationMs > 0;
  const showTokens = item.status !== "waiting" && tokens > 0;

  const body = (
    <>
      <span className="activity-icon" aria-hidden>
        {icons[item.kind]}
      </span>
      <div className="activity-body">
        <div className="activity-title-row">
          <div className="activity-title">{item.title}</div>
          <ActivityStatusIcon status={item.status} />
        </div>
        <div className="activity-sub">
          <span className="activity-detail">{item.detail}</span>
          {(showTime || showTokens || files.length > 0 || item.status === "running") && (
            <span className="activity-meta">
              {showTime && (
                <span title="Time taken">{formatDuration(durationMs)}</span>
              )}
              {showTokens && (
                <span title="Tokens used">{tokens.toLocaleString()} tok</span>
              )}
              {files.length > 0 && (
                <span title={files.join(", ")}>
                  {files.length} file{files.length === 1 ? "" : "s"}
                </span>
              )}
              {item.status === "running" && !item.durationMs && (
                <span className="activity-meta-live">timing…</span>
              )}
            </span>
          )}
        </div>
      </div>
    </>
  );

  if (!clickable) {
    return (
      <div className={className} data-activity={item.id}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className}
      data-activity={item.id}
      onClick={onSelect}
    >
      {body}
    </button>
  );
}

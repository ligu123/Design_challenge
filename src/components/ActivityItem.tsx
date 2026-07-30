import type { ActivityKind, TimelineItem } from "../types";
import { ActivityStatusIcon } from "./StatusChip";

function ActivityKindIcon({ kind }: { kind: ActivityKind }) {
  const props = {
    width: 12,
    height: 12,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    "aria-hidden": true as const,
  };
  const stroke = {
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (kind) {
    case "plan":
      return (
        <svg {...props}>
          <path d="M9 6h11M9 12h11M9 18h11" {...stroke} />
          <path d="M4 6h.01M4 12h.01M4 18h.01" {...stroke} />
        </svg>
      );
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="6.5" {...stroke} />
          <path d="M16.5 16.5 21 21" {...stroke} />
        </svg>
      );
    case "read":
      return (
        <svg {...props}>
          <path
            d="M7 3.5h7.5L19 8v12.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"
            {...stroke}
          />
          <path d="M14 3.5V8h4.5M9 12h6M9 16h6" {...stroke} />
        </svg>
      );
    case "edit":
      return (
        <svg {...props}>
          <path
            d="M12.5 5.5 18.5 11.5M4 20l1.8-6.3L15.2 4.3a1.6 1.6 0 0 1 2.3 0l2.2 2.2a1.6 1.6 0 0 1 0 2.3L10.3 18.2 4 20Z"
            {...stroke}
          />
        </svg>
      );
    case "lint":
      return (
        <svg {...props}>
          <path
            d="M12 3 19 6.5v5.2c0 4.2-2.8 7.8-7 9.3-4.2-1.5-7-5.1-7-9.3V6.5L12 3Z"
            {...stroke}
          />
          <path d="M9.5 12.2 11.2 14l3.5-4" {...stroke} />
        </svg>
      );
    case "terminal":
      return (
        <svg {...props}>
          <rect x="3.5" y="5" width="17" height="14" rx="2" {...stroke} />
          <path d="M7 10.5 9.5 13 7 15.5M12.5 15.5H17" {...stroke} />
        </svg>
      );
    case "test":
      return (
        <svg {...props}>
          <path
            d="M9.5 3.5h5M10 3.5v5.2L5.8 16.5A2.2 2.2 0 0 0 7.7 20h8.6a2.2 2.2 0 0 0 1.9-3.5L14 8.7V3.5"
            {...stroke}
          />
          <path d="M8.5 13.5h7" {...stroke} />
        </svg>
      );
    case "fix":
      return (
        <svg {...props}>
          <path
            d="M14.5 5.5a3.2 3.2 0 0 1 4 4L9.2 18.8 4.5 20l1.2-4.7L14.5 5.5Z"
            {...stroke}
          />
          <path d="M12.8 7.2 17 11.4" {...stroke} />
        </svg>
      );
    case "git":
      return (
        <svg {...props}>
          <circle cx="6" cy="6" r="2.25" {...stroke} />
          <circle cx="6" cy="18" r="2.25" {...stroke} />
          <circle cx="18" cy="12" r="2.25" {...stroke} />
          <path d="M6 8.25v7.5M8.1 7.2 15.8 11.2" {...stroke} />
        </svg>
      );
    case "ask":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.25" {...stroke} />
          <path
            d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.4 1-1.4 1.9"
            {...stroke}
          />
          <circle cx="12" cy="16.5" r="0.85" fill="currentColor" />
        </svg>
      );
  }
}

interface ActivityItemProps {
  item: Extract<TimelineItem, { type: "activity" }>;
}

/** Compact action row with a small kind icon. */
export function ActivityItem({ item }: ActivityItemProps) {
  return (
    <div className="activity-item" data-activity={item.id}>
      <span className="activity-icon" aria-hidden>
        <ActivityKindIcon kind={item.kind} />
      </span>
      <div className="activity-body">
        <div className="activity-title-row">
          <div className="activity-title">{item.title}</div>
          <ActivityStatusIcon status={item.status} />
        </div>
      </div>
    </div>
  );
}

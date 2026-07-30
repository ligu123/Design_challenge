import type { ReactNode } from "react";
import type { PlaceId } from "../types";

interface RailItem {
  id: PlaceId;
  label: string;
  icon: ReactNode;
}

function IconTickets() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12h6M9 16h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconOps() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19V12M10 19V5M16 19v-8M22 19V9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPolicies() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l8 3v6c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V6l8-3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12l1.8 1.8L15 10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWorkspace() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-10z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMemory() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3a6 6 0 0 0-4 10.5V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3.5A6 6 0 0 0 12 3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 21h4M10 18h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconEnvironments() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="3"
        y="14"
        width="18"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M7 8h.01M7 17h.01"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const items: RailItem[] = [
  { id: "tickets", label: "Tickets", icon: <IconTickets /> },
  { id: "ops", label: "Ops", icon: <IconOps /> },
  { id: "policies", label: "Policies", icon: <IconPolicies /> },
  { id: "workspace", label: "Workspace", icon: <IconWorkspace /> },
  { id: "memory", label: "Memory", icon: <IconMemory /> },
  { id: "environments", label: "Environments", icon: <IconEnvironments /> },
];

interface ActivityRailProps {
  place: PlaceId;
  onNavigate: (place: PlaceId) => void;
}

export function ActivityRail({ place, onNavigate }: ActivityRailProps) {
  return (
    <nav className="activity-rail" aria-label="Places">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`rail-btn${place === item.id ? " active" : ""}`}
          title={item.label}
          aria-label={item.label}
          aria-current={place === item.id ? "page" : undefined}
          onClick={() => onNavigate(item.id)}
        >
          <span className="rail-icon" aria-hidden>
            {item.icon}
          </span>
        </button>
      ))}
    </nav>
  );
}

import type { ActivityStatus, Priority, TicketStatus } from "../types";

const labels: Record<TicketStatus, string> = {
  idle: "Idle",
  running: "Running",
  blocked: "Blocked",
  failed: "Failed",
  succeeded: "Succeeded",
};

const activityLabels: Record<ActivityStatus, string> = {
  running: "Running",
  done: "Done",
  failed: "Failed",
  waiting: "Waiting",
};

const priorityLabels: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function IconIdle() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg
      className="status-spinner"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle
        cx="8"
        cy="8"
        r="5.25"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <path
        d="M13.25 8a5.25 5.25 0 0 0-5.25-5.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBlocked() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2.5 14 13.5H2L8 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 6.5v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.25" r="0.75" fill="currentColor" />
    </svg>
  );
}

function IconFailed() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.75 5.75l4.5 4.5M10.25 5.75l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.25 6.5 11.25 12.5 4.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Signal-bar priority marks — Linear-style high / medium / low. */
function IconPriorityHigh() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 11.5v-2M8 11.5V6.5M12.5 11.5V4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPriorityMedium() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 11.5v-2M8 11.5V6.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M12.5 11.5V4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity="0.28"
      />
    </svg>
  );
}

function IconPriorityLow() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 11.5v-2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M8 11.5V6.5M12.5 11.5V4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity="0.28"
      />
    </svg>
  );
}

function ticketIcon(status: TicketStatus) {
  switch (status) {
    case "running":
      return <IconSpinner />;
    case "blocked":
      return <IconBlocked />;
    case "failed":
      return <IconFailed />;
    case "succeeded":
      return <IconCheck />;
    default:
      return <IconIdle />;
  }
}

function activityIcon(status: ActivityStatus) {
  switch (status) {
    case "running":
      return <IconSpinner />;
    case "waiting":
      return <IconBlocked />;
    case "failed":
      return <IconFailed />;
    case "done":
      return <IconCheck />;
  }
}

function priorityIcon(priority: Priority) {
  switch (priority) {
    case "high":
      return <IconPriorityHigh />;
    case "medium":
      return <IconPriorityMedium />;
    case "low":
      return <IconPriorityLow />;
  }
}

export function StatusChip({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`status-chip status-${status}`}
      title={labels[status]}
      aria-label={labels[status]}
    >
      {ticketIcon(status)}
    </span>
  );
}

export function PriorityIcon({ priority }: { priority: Priority }) {
  return (
    <span
      className={`priority-icon priority-${priority}`}
      title={priorityLabels[priority]}
      aria-label={priorityLabels[priority]}
    >
      {priorityIcon(priority)}
    </span>
  );
}

export function ActivityStatusIcon({ status }: { status: ActivityStatus }) {
  return (
    <span
      className={`activity-status ${status}`}
      title={activityLabels[status]}
      aria-label={activityLabels[status]}
    >
      {activityIcon(status)}
    </span>
  );
}

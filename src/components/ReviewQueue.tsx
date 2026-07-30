import type { ReviewDecision, Ticket } from "../types";
import { StatusChip } from "./StatusChip";

interface ReviewQueueProps {
  tickets: Ticket[];
  decisions: Record<string, ReviewDecision>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function reviewLabel(
  ticket: Ticket,
  decision: ReviewDecision | undefined,
): string {
  if (decision === "merged") return "Merged";
  if (decision === "approved") return "Approved";
  if (decision === "changes_requested") return "Changes requested";
  if (ticket.status === "failed") return "Needs retry";
  if (ticket.status === "succeeded") return "Awaiting review";
  return "Review";
}

export function ReviewQueue({
  tickets,
  decisions,
  selectedId,
  onSelect,
}: ReviewQueueProps) {
  const items = tickets.filter(
    (t) => t.status === "succeeded" || t.status === "failed",
  );

  return (
    <aside className="queue">
      <div className="queue-header">
        <span>Review</span>
        <span>{items.length}</span>
      </div>
      <div className="queue-list">
        {items.map((ticket) => {
          const decision = decisions[ticket.id] ?? "awaiting";
          return (
            <button
              key={ticket.id}
              type="button"
              className={`ticket-item${selectedId === ticket.id ? " active" : ""}`}
              onClick={() => onSelect(ticket.id)}
            >
              <div className="ticket-item-top">
                <span className="ticket-id">{ticket.key}</span>
                <span className="ticket-priority">{reviewLabel(ticket, decision)}</span>
              </div>
              <div className="ticket-title">{ticket.title}</div>
              <div className="queue-item-meta">
                <StatusChip status={ticket.status} />
                {decision !== "awaiting" && (
                  <span className={`review-chip review-${decision}`}>
                    {reviewLabel(ticket, decision)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
        {items.length === 0 && (
          <p className="queue-empty">Nothing waiting for review.</p>
        )}
      </div>
    </aside>
  );
}

import type { Ticket } from "../types";
import { StatusChip } from "./StatusChip";

interface TicketQueueProps {
  tickets: Ticket[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TicketQueue({ tickets, selectedId, onSelect }: TicketQueueProps) {
  return (
    <aside className="queue">
      <div className="queue-header">
        <span>Tickets</span>
        <span>{tickets.length}</span>
      </div>
      <div className="queue-list">
        {tickets.map((ticket) => (
          <button
            key={ticket.id}
            type="button"
            className={`ticket-item${selectedId === ticket.id ? " active" : ""}`}
            onClick={() => onSelect(ticket.id)}
          >
            <div className="ticket-item-top">
              <span className="ticket-id">{ticket.key}</span>
              <span className="ticket-item-top-right">
                <span className="ticket-priority">{ticket.priority}</span>
                <StatusChip status={ticket.status} />
              </span>
            </div>
            <div className="ticket-title">{ticket.title}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}

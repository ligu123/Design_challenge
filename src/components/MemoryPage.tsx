import { memoryItems } from "../data/mock";
import type { MemoryItem } from "../types";

interface MemoryPageProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

const kindLabel: Record<MemoryItem["kind"], string> = {
  decision: "Decision",
  convention: "Convention",
  qa: "Q&A",
};

export function MemoryPage({ selectedId, onSelect }: MemoryPageProps) {
  const selected =
    memoryItems.find((m) => m.id === selectedId) ?? memoryItems[0];

  return (
    <>
      <aside className="queue">
        <div className="queue-header">
          <span>Memory</span>
          <span>{memoryItems.length}</span>
        </div>
        <div className="queue-list">
          {memoryItems.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`ticket-item${selectedId === m.id ? " active" : ""}`}
              onClick={() => onSelect(m.id)}
            >
              <div className="ticket-item-top">
                <span className="ticket-id">{kindLabel[m.kind]}</span>
                {m.relatedTicketKey && (
                  <span className="ticket-priority">{m.relatedTicketKey}</span>
                )}
              </div>
              <div className="ticket-title">{m.title}</div>
            </button>
          ))}
        </div>
      </aside>
      <main className="center">
        <div className="center-body place-detail">
          <div className="section-label">{kindLabel[selected.kind]}</div>
          <h1>{selected.title}</h1>
          <p className="ticket-desc">{selected.body}</p>
          <div className="util-chip-list">
            {selected.tags.map((tag) => (
              <span key={tag} className="util-chip on">
                {tag}
              </span>
            ))}
          </div>
          {selected.relatedTicketKey && (
            <p className="muted-note" style={{ marginTop: 16 }}>
              Related ticket{" "}
              <span className="mono">{selected.relatedTicketKey}</span>
            </p>
          )}
        </div>
      </main>
    </>
  );
}

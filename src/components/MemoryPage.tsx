import { memoryItems } from "../data/mock";
import type { MemoryItem } from "../types";

const kindLabel: Record<MemoryItem["kind"], string> = {
  decision: "Decision",
  convention: "Convention",
  qa: "Q&A",
};

export function MemoryPage() {
  return (
    <div className="settings-stack">
      {memoryItems.map((item) => (
        <section key={item.id} className="settings-stack-section">
          <div className="section-label">{kindLabel[item.kind]}</div>
          <h3 className="settings-item-title">{item.title}</h3>
          <p className="ticket-desc">{item.body}</p>
          <div className="util-chip-list">
            {item.tags.map((tag) => (
              <span key={tag} className="util-chip on">
                {tag}
              </span>
            ))}
          </div>
          {item.relatedTicketKey && (
            <p className="muted-note settings-related-note">
              Related ticket{" "}
              <span className="mono">{item.relatedTicketKey}</span>
            </p>
          )}
        </section>
      ))}
    </div>
  );
}

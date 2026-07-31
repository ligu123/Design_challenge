import { useEffect, useState } from "react";
import type { DiffEvidence } from "../types";
import { DiffCodeBlock, summarizeDiff } from "./DiffCodeBlock";

function DiffStats({ content }: { content: string }) {
  const { added, removed } = summarizeDiff(content);
  if (added === 0 && removed === 0) return null;
  return (
    <span
      className="chat-result-diff-stats mono"
      aria-label={`${added} added, ${removed} removed`}
    >
      {added > 0 && <span className="chat-result-diff-add">+{added}</span>}
      {removed > 0 && (
        <span className="chat-result-diff-del">−{removed}</span>
      )}
    </span>
  );
}

export interface DiffAccordionItemProps {
  diff: DiffEvidence;
  selected?: boolean;
  onOpenDiff: () => void;
  className?: string;
}

/** Collapsible diff preview — header toggles open; only the path opens the diff view. */
export function DiffAccordionItem({
  diff,
  selected = false,
  onOpenDiff,
  className,
}: DiffAccordionItemProps) {
  const [open, setOpen] = useState(selected);

  useEffect(() => {
    if (selected) setOpen(true);
  }, [selected]);

  const toggleOpen = () => setOpen((prev) => !prev);

  return (
    <div
      className={`diff-accordion chat-result${open ? " open" : ""}${selected ? " selected" : ""}${className ? ` ${className}` : ""}`}
      data-result={diff.id}
    >
      <div className="diff-accordion-header">
        <button
          type="button"
          className="diff-accordion-hit"
          aria-expanded={open}
          aria-label={open ? "Collapse diff preview" : "Expand diff preview"}
          onClick={toggleOpen}
        />
        <span className="diff-accordion-kind">
          <span className="section-label">
            diff
            <DiffStats content={diff.content} />
          </span>
        </span>
        <button
          type="button"
          className="diff-accordion-path-link mono"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDiff();
          }}
        >
          {diff.path}
        </button>
        <span className="chat-result-chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </div>
      {open && (
        <div className="chat-result-body diff-accordion-body">
          <DiffCodeBlock content={diff.content} bare />
        </div>
      )}
    </div>
  );
}

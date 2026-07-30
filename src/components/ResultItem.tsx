import { useEffect, useState } from "react";
import type { Evidence } from "../types";
import { summarizeDiff } from "./DiffCodeBlock";
import { EvidencePanel } from "./evidence/EvidencePanel";

function evidenceSummary(evidence: Evidence): string {
  switch (evidence.kind) {
    case "diff":
    case "file":
      return evidence.path;
    case "terminal":
    case "tests":
      return evidence.title;
    case "search":
      return evidence.query;
  }
}

function DiffStats({ content }: { content: string }) {
  const { added, removed } = summarizeDiff(content);
  if (added === 0 && removed === 0) return null;
  return (
    <span className="chat-result-diff-stats mono" aria-label={`${added} added, ${removed} removed`}>
      {added > 0 && <span className="chat-result-diff-add">+{added}</span>}
      {removed > 0 && (
        <span className="chat-result-diff-del">−{removed}</span>
      )}
    </span>
  );
}

interface ResultItemProps {
  evidence: Evidence;
  selected: boolean;
  onSelect: () => void;
}

/** Artifact shown below the action that produced it. */
export function ResultItem({ evidence, selected, onSelect }: ResultItemProps) {
  const [open, setOpen] = useState(selected);

  useEffect(() => {
    if (selected) setOpen(true);
  }, [selected]);

  return (
    <div
      className={`chat-result${open ? " open" : ""}${selected ? " selected" : ""}`}
      data-result={evidence.id}
    >
      <button
        type="button"
        className="chat-result-trigger"
        aria-expanded={open}
        onClick={() => {
          onSelect();
          setOpen((prev) => (selected ? !prev : true));
        }}
      >
        <span className="chat-result-label">
          <span className="section-label">
            {evidence.kind}
            {evidence.kind === "diff" && (
              <DiffStats content={evidence.content} />
            )}
          </span>
          <span className="chat-result-path mono">
            {evidenceSummary(evidence)}
          </span>
        </span>
        <span className="chat-result-chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="chat-result-body">
          <EvidencePanel evidence={evidence} compact />
        </div>
      )}
    </div>
  );
}

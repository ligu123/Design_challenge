import { useEffect, useState, type KeyboardEvent } from "react";
import type { Evidence } from "../types";
import { DiffAccordionItem } from "./DiffAccordionItem";
import { EvidencePanel } from "./evidence/EvidencePanel";

function evidenceSummary(evidence: Evidence): string {
  switch (evidence.kind) {
    case "diff":
    case "file":
      return evidence.path;
    case "terminal":
    case "tests":
      return evidence.title;
    case "criteria": {
      const met = evidence.results.filter((r) => r.met).length;
      return `${met}/${evidence.results.length} met`;
    }
    case "search":
      return evidence.query;
  }
}

interface ResultItemProps {
  evidence: Evidence;
  selected: boolean;
  onSelect: () => void;
}

/** Artifact shown below the action that produced it. */
export function ResultItem({ evidence, selected, onSelect }: ResultItemProps) {
  if (evidence.kind === "diff") {
    return (
      <DiffAccordionItem
        diff={evidence}
        selected={selected}
        onOpenDiff={onSelect}
      />
    );
  }

  return (
    <NonDiffResultItem
      evidence={evidence}
      selected={selected}
      onSelect={onSelect}
    />
  );
}

function NonDiffResultItem({
  evidence,
  selected,
  onSelect,
}: ResultItemProps) {
  const [open, setOpen] = useState(selected);
  const path = evidenceSummary(evidence);
  const pathIsLink = evidence.kind === "file";

  useEffect(() => {
    if (selected) setOpen(true);
  }, [selected]);

  const toggleOpen = () => setOpen((prev) => !prev);

  const onHeaderKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleOpen();
    }
  };

  return (
    <div
      className={`chat-result${open ? " open" : ""}${selected ? " selected" : ""}`}
      data-result={evidence.id}
    >
      <div
        className="chat-result-trigger"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggleOpen}
        onKeyDown={onHeaderKeyDown}
      >
        <span className="chat-result-label">
          <span className="section-label">{evidence.kind}</span>
        </span>
        {pathIsLink ? (
          <span
            role="link"
            tabIndex={0}
            className="chat-result-path-link mono"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                e.preventDefault();
                onSelect();
              }
            }}
          >
            {path}
          </span>
        ) : (
          <span className="chat-result-path mono">{path}</span>
        )}
        <span className="chat-result-chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </div>
      {open && (
        <div className="chat-result-body">
          <EvidencePanel evidence={evidence} compact />
        </div>
      )}
    </div>
  );
}

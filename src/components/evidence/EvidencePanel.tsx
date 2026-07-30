import type { Evidence } from "../../types";
import { DiffView } from "./DiffView";
import { FileView } from "./FileView";
import { SearchView } from "./SearchView";
import { TerminalView } from "./TerminalView";
import { TestResultsView } from "./TestResultsView";

export function EvidencePanel({
  evidence,
  compact = false,
}: {
  evidence: Evidence;
  /** Hide kind/path header when the parent already shows it. */
  compact?: boolean;
}) {
  switch (evidence.kind) {
    case "file":
      return <FileView evidence={evidence} compact={compact} />;
    case "diff":
      return <DiffView evidence={evidence} compact={compact} />;
    case "terminal":
      return <TerminalView evidence={evidence} compact={compact} />;
    case "tests":
      return <TestResultsView evidence={evidence} compact={compact} />;
    case "search":
      return <SearchView evidence={evidence} compact={compact} />;
  }
}

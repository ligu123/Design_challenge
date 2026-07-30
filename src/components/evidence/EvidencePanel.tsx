import type { Evidence } from "../../types";
import { DiffView } from "./DiffView";
import { FileView } from "./FileView";
import { SearchView } from "./SearchView";
import { TerminalView } from "./TerminalView";
import { TestResultsView } from "./TestResultsView";

export function EvidencePanel({ evidence }: { evidence: Evidence }) {
  switch (evidence.kind) {
    case "file":
      return <FileView evidence={evidence} />;
    case "diff":
      return <DiffView evidence={evidence} />;
    case "terminal":
      return <TerminalView evidence={evidence} />;
    case "tests":
      return <TestResultsView evidence={evidence} />;
    case "search":
      return <SearchView evidence={evidence} />;
  }
}

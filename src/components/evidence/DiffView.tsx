import type { DiffEvidence } from "../../types";
import { DiffCodeBlock } from "../DiffCodeBlock";

export function DiffView({
  evidence,
  compact = false,
}: {
  evidence: DiffEvidence;
  compact?: boolean;
}) {
  if (compact) {
    return <DiffCodeBlock content={evidence.content} bare />;
  }

  return (
    <div className="evidence-panel">
      <div className="evidence-header">
        <h2>Diff</h2>
        <span className="evidence-path">{evidence.path}</span>
      </div>
      <DiffCodeBlock content={evidence.content} />
    </div>
  );
}

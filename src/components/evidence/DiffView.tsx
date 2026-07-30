import type { DiffEvidence } from "../../types";
import { DiffCodeBlock } from "../DiffCodeBlock";

export function DiffView({ evidence }: { evidence: DiffEvidence }) {
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

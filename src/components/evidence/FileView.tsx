import type { FileEvidence } from "../../types";

export function FileView({ evidence }: { evidence: FileEvidence }) {
  return (
    <div className="evidence-panel">
      <div className="evidence-header">
        <h2>File</h2>
        <span className="evidence-path">{evidence.path}</span>
      </div>
      <pre className="code-block">{evidence.content}</pre>
    </div>
  );
}

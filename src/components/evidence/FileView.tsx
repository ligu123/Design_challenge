import type { FileEvidence } from "../../types";

export function FileView({
  evidence,
  compact = false,
}: {
  evidence: FileEvidence;
  compact?: boolean;
}) {
  if (compact) {
    return <pre className="code-block bare">{evidence.content}</pre>;
  }

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

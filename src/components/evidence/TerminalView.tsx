import type { TerminalEvidence } from "../../types";

export function TerminalView({
  evidence,
  compact = false,
}: {
  evidence: TerminalEvidence;
  compact?: boolean;
}) {
  const output = (
    <pre className={`code-block terminal-block${compact ? " bare" : ""}`}>
      {evidence.lines.map((line, i) => (
        <span
          key={i}
          className={
            line.tone === "cmd"
              ? "term-cmd"
              : line.tone === "err"
                ? "term-err"
                : line.tone === "ok"
                  ? "term-ok"
                  : undefined
          }
          style={{ display: "block" }}
        >
          {line.text}
        </span>
      ))}
    </pre>
  );

  if (compact) return output;

  return (
    <div className="evidence-panel">
      <div className="evidence-header">
        <h2>Terminal</h2>
        <span className="evidence-path">{evidence.title}</span>
      </div>
      {output}
    </div>
  );
}

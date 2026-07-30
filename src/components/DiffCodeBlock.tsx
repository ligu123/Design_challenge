function classifyLine(line: string) {
  if (line.startsWith("+++") || line.startsWith("---")) return "meta" as const;
  if (line.startsWith("+")) return "add" as const;
  if (line.startsWith("-")) return "del" as const;
  if (line.startsWith("@@")) return "hunk" as const;
  return "ctx" as const;
}

function splitMarker(line: string, kind: ReturnType<typeof classifyLine>) {
  if (kind === "add" || kind === "del") {
    return { marker: line.slice(0, 1), code: line.slice(1) || " " };
  }
  if (kind === "hunk" || kind === "meta") {
    return { marker: " ", code: line || " " };
  }
  return { marker: " ", code: line || " " };
}

export function renderDiffLines(content: string, maxLines?: number) {
  const lines = content.split("\n");
  const visible =
    maxLines != null && lines.length > maxLines
      ? lines.slice(0, maxLines)
      : lines;
  const truncated =
    maxLines != null && lines.length > maxLines
      ? lines.length - maxLines
      : 0;

  return (
    <>
      {visible.map((line, i) => {
        const kind = classifyLine(line);
        const { marker, code } = splitMarker(line, kind);
        return (
          <div key={i} className={`diff-line diff-${kind}`}>
            <span className="diff-gutter" aria-hidden>
              {marker}
            </span>
            <span className="diff-code">{code}</span>
          </div>
        );
      })}
      {truncated > 0 && (
        <div className="diff-line diff-more">
          <span className="diff-gutter" aria-hidden>
            …
          </span>
          <span className="diff-code">{truncated} more lines</span>
        </div>
      )}
    </>
  );
}

export function summarizeDiff(content: string) {
  let added = 0;
  let removed = 0;
  for (const line of content.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) added += 1;
    else if (line.startsWith("-") && !line.startsWith("---")) removed += 1;
  }
  return { added, removed };
}

export function DiffCodeBlock({
  content,
  className,
  maxLines,
  bare = false,
}: {
  content: string;
  className?: string;
  maxLines?: number;
  /** No card chrome — for embedding inside an existing result frame. */
  bare?: boolean;
}) {
  return (
    <div
      className={`code-block diff-block${bare ? " bare" : ""}${className ? ` ${className}` : ""}`}
      role="text"
    >
      {renderDiffLines(content, maxLines)}
    </div>
  );
}

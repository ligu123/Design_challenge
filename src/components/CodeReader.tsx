import { useMemo } from "react";
import {
  highlightLines,
  langFromPath,
  langLabel,
  type Token,
} from "../lib/highlight";

interface CodeReaderProps {
  path: string;
  content: string;
  title?: string;
}

function TokenSpan({ token }: { token: Token }) {
  if (token.kind === "plain") return <>{token.text}</>;
  return <span className={`tok tok-${token.kind}`}>{token.text}</span>;
}

export function CodeReader({ path, content, title }: CodeReaderProps) {
  const lang = langFromPath(path);
  const lines = useMemo(
    () => highlightLines(content.replace(/\n$/, ""), lang),
    [content, lang],
  );
  const fileName = title ?? path.split("/").pop() ?? path;
  const gutterWidth = Math.max(2, String(lines.length).length);

  return (
    <div className="code-reader">
      <div className="code-reader-toolbar">
        <div className="code-reader-file">
          <span className="code-reader-filename mono">{fileName}</span>
          <span className="code-reader-lang">{langLabel(lang)}</span>
        </div>
        <div className="code-reader-meta mono">
          <span>{lines.length} lines</span>
          <span className="code-reader-meta-sep" aria-hidden>
            ·
          </span>
          <span>{path}</span>
        </div>
      </div>
      <div className="code-reader-body" role="region" aria-label={`${fileName} source`}>
        <pre className="code-reader-pre">
          {lines.map((tokens, i) => (
            <div key={i} className="code-reader-line">
              <span
                className="code-reader-gutter mono"
                style={{ minWidth: `${gutterWidth}ch` }}
                aria-hidden
              >
                {i + 1}
              </span>
              <code className="code-reader-code">
                {tokens.length === 0
                  ? null
                  : tokens.map((t, j) => <TokenSpan key={j} token={t} />)}
              </code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

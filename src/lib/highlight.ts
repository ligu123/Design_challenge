export type TokenKind =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "type"
  | "function"
  | "property"
  | "punctuation"
  | "operator"
  | "tag"
  | "attr"
  | "md-heading"
  | "md-emphasis"
  | "md-code"
  | "md-link";

export type Token = { kind: TokenKind; text: string };

export type LangId =
  | "typescript"
  | "tsx"
  | "javascript"
  | "jsx"
  | "markdown"
  | "json"
  | "css"
  | "plaintext";

const TS_KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "of",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

const TS_TYPES = new Set([
  "any",
  "boolean",
  "never",
  "number",
  "object",
  "string",
  "symbol",
  "unknown",
  "Date",
  "Error",
  "Map",
  "Promise",
  "Record",
  "Set",
  "Array",
]);

export function langFromPath(path: string): LangId {
  const lower = path.toLowerCase();
  if (lower.endsWith(".tsx")) return "tsx";
  if (lower.endsWith(".ts")) return "typescript";
  if (lower.endsWith(".jsx")) return "jsx";
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs"))
    return "javascript";
  if (lower.endsWith(".md") || lower.endsWith(".mdx")) return "markdown";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".css") || lower.endsWith(".scss")) return "css";
  return "plaintext";
}

export function langLabel(lang: LangId): string {
  switch (lang) {
    case "typescript":
      return "TypeScript";
    case "tsx":
      return "TSX";
    case "javascript":
      return "JavaScript";
    case "jsx":
      return "JSX";
    case "markdown":
      return "Markdown";
    case "json":
      return "JSON";
    case "css":
      return "CSS";
    default:
      return "Plain text";
  }
}

function push(out: Token[], kind: TokenKind, text: string) {
  if (!text) return;
  // Don't merge punctuation/operators — keeps JSX closers like "</" intact.
  if (kind !== "punctuation" && kind !== "operator") {
    const last = out[out.length - 1];
    if (last && last.kind === kind) {
      last.text += text;
      return;
    }
  }
  out.push({ kind, text });
}

function readString(source: string, start: number): number {
  const q = source[start];
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === q) return i + 1;
    // Keep template literals as a single string token (good enough for demos).
    i += 1;
  }
  return source.length;
}

function highlightMarkdown(source: string): Token[] {
  const out: Token[] = [];
  const lines = source.split("\n");
  lines.forEach((line, i) => {
    if (i > 0) push(out, "plain", "\n");

    const heading = /^(#{1,6}\s+)(.*)$/.exec(line);
    if (heading) {
      push(out, "md-heading", heading[1] + heading[2]);
      return;
    }

    let rest = line;
    while (rest.length) {
      const m =
        /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))|([^`*[]+)|([\s\S])/.exec(
          rest,
        );
      if (!m) {
        push(out, "plain", rest);
        break;
      }
      if (m[1]) push(out, "md-code", m[1]);
      else if (m[2] || m[3]) push(out, "md-emphasis", m[2] || m[3]);
      else if (m[4]) push(out, "md-link", m[4]);
      else if (m[5]) push(out, "plain", m[5]);
      else push(out, "plain", m[6]);
      rest = rest.slice(m[0].length);
    }
  });
  return out;
}

function highlightJson(source: string): Token[] {
  const out: Token[] = [];
  const re =
    /(\s+)|("(?:\\.|[^"\\])*")\s*(:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\],])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    if (m.index > last) push(out, "plain", source.slice(last, m.index));
    if (m[1]) push(out, "plain", m[1]);
    else if (m[2]) {
      push(out, m[3] ? "property" : "string", m[2]);
      if (m[3]) push(out, "punctuation", m[3]);
    } else if (m[4]) push(out, "number", m[4]);
    else if (m[5]) push(out, "keyword", m[5]);
    else if (m[6]) push(out, "punctuation", m[6]);
    last = re.lastIndex;
  }
  if (last < source.length) push(out, "plain", source.slice(last));
  return out;
}

function highlightCss(source: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < source.length) {
    if (source.startsWith("/*", i)) {
      let end = source.indexOf("*/", i + 2);
      end = end < 0 ? source.length : end + 2;
      push(out, "comment", source.slice(i, end));
      i = end;
      continue;
    }
    const ch = source[i];
    if (ch === '"' || ch === "'") {
      const end = readString(source, i);
      push(out, "string", source.slice(i, end));
      i = end;
      continue;
    }
    if (/\s/.test(ch)) {
      let j = i;
      while (j < source.length && /\s/.test(source[j])) j += 1;
      push(out, "plain", source.slice(i, j));
      i = j;
      continue;
    }
    if (/[a-zA-Z_#.-]/.test(ch)) {
      let j = i;
      while (j < source.length && /[\w.#-]/.test(source[j])) j += 1;
      const word = source.slice(i, j);
      if (word.startsWith(".") || word.startsWith("#")) push(out, "function", word);
      else push(out, "property", word);
      i = j;
      continue;
    }
    if (/[{}:;,()%]/.test(ch)) {
      push(out, "punctuation", ch);
      i += 1;
      continue;
    }
    push(out, "plain", ch);
    i += 1;
  }
  return out;
}

function highlightTsLike(source: string, jsx: boolean): Token[] {
  const out: Token[] = [];
  let i = 0;
  const len = source.length;
  const peek = (n = 0) => source[i + n] ?? "";

  while (i < len) {
    if (source.startsWith("//", i)) {
      let end = source.indexOf("\n", i);
      if (end < 0) end = len;
      push(out, "comment", source.slice(i, end));
      i = end;
      continue;
    }
    if (source.startsWith("/*", i)) {
      let end = source.indexOf("*/", i + 2);
      end = end < 0 ? len : end + 2;
      push(out, "comment", source.slice(i, end));
      i = end;
      continue;
    }

    const ch = peek();
    if (ch === "'" || ch === '"' || ch === "`") {
      const end = readString(source, i);
      push(out, "string", source.slice(i, end));
      i = end;
      continue;
    }

    if (jsx && ch === "<" && /[A-Za-z/!]/.test(peek(1))) {
      push(out, "punctuation", "<");
      i += 1;
      if (peek() === "/") {
        push(out, "punctuation", "/");
        i += 1;
      }
      if (peek() === "!") {
        let end = source.indexOf(">", i);
        end = end < 0 ? len : end + 1;
        push(out, "comment", source.slice(i, end));
        i = end;
        continue;
      }
      const nameStart = i;
      while (i < len && /[\w.-]/.test(peek())) i += 1;
      if (i > nameStart) push(out, "tag", source.slice(nameStart, i));

      while (i < len && peek() !== ">") {
        if (peek() === "/" && peek(1) === ">") break;
        if (/\s/.test(peek())) {
          const s = i;
          while (i < len && /\s/.test(peek())) i += 1;
          push(out, "plain", source.slice(s, i));
          continue;
        }
        if (/[A-Za-z_$]/.test(peek())) {
          const a0 = i;
          while (i < len && /[\w:-]/.test(peek())) i += 1;
          push(out, "attr", source.slice(a0, i));
          continue;
        }
        if (peek() === "=") {
          push(out, "operator", "=");
          i += 1;
          continue;
        }
        if (peek() === "'" || peek() === '"') {
          const end = readString(source, i);
          push(out, "string", source.slice(i, end));
          i = end;
          continue;
        }
        if (peek() === "{") {
          push(out, "punctuation", "{");
          i += 1;
          let depth = 1;
          const start = i;
          while (i < len && depth > 0) {
            if (source[i] === "'" || source[i] === '"' || source[i] === "`") {
              i = readString(source, i);
              continue;
            }
            if (source.startsWith("//", i)) {
              const nl = source.indexOf("\n", i);
              i = nl < 0 ? len : nl;
              continue;
            }
            if (source[i] === "{") depth += 1;
            else if (source[i] === "}") depth -= 1;
            if (depth === 0) break;
            i += 1;
          }
          for (const t of highlightTsLike(source.slice(start, i), jsx)) {
            push(out, t.kind, t.text);
          }
          if (i < len && source[i] === "}") {
            push(out, "punctuation", "}");
            i += 1;
          }
          continue;
        }
        push(out, "punctuation", peek());
        i += 1;
      }
      if (peek() === "/" && peek(1) === ">") {
        push(out, "punctuation", "/>");
        i += 2;
        continue;
      }
      if (peek() === ">") {
        push(out, "punctuation", ">");
        i += 1;
      }
      continue;
    }

    if (/\d/.test(ch) || (ch === "." && /\d/.test(peek(1)))) {
      let j = i;
      while (j < len && /[\d._xXeEbBna-fA-F]/.test(source[j])) j += 1;
      push(out, "number", source.slice(i, j));
      i = j;
      continue;
    }

    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < len && /[\w$]/.test(source[j])) j += 1;
      const word = source.slice(i, j);
      let k = j;
      while (k < len && /\s/.test(source[k])) k += 1;
      const isCall = source[k] === "(";
      if (TS_KEYWORDS.has(word)) push(out, "keyword", word);
      else if (TS_TYPES.has(word)) push(out, "type", word);
      else if (isCall) push(out, "function", word);
      else if (/^[A-Z]/.test(word)) {
        const next = source[k] ?? "";
        // Capitalized identifiers are types/components unless they're prose in JSX text.
        if (/[<(.,|&!?:)]/.test(next) || next === "") push(out, "type", word);
        else push(out, "plain", word);
      } else push(out, "plain", word);
      i = j;
      continue;
    }

    if (/[{}()[\];,.:?@]/.test(ch)) {
      push(out, "punctuation", ch);
      i += 1;
      continue;
    }
    if ("=<>!+-*/%&|^~".includes(ch)) {
      let j = i;
      while (j < len && "=<>!+-*/%&|^~".includes(source[j])) j += 1;
      push(out, "operator", source.slice(i, j));
      i = j;
      continue;
    }
    if (/\s/.test(ch)) {
      let j = i;
      while (j < len && /\s/.test(source[j])) j += 1;
      push(out, "plain", source.slice(i, j));
      i = j;
      continue;
    }

    push(out, "plain", ch);
    i += 1;
  }

  return out;
}

export function highlight(source: string, lang: LangId): Token[] {
  switch (lang) {
    case "markdown":
      return highlightMarkdown(source);
    case "json":
      return highlightJson(source);
    case "css":
      return highlightCss(source);
    case "tsx":
    case "jsx":
      return highlightTsLike(source, true);
    case "typescript":
    case "javascript":
      return highlightTsLike(source, false);
    default:
      return source ? [{ kind: "plain", text: source }] : [];
  }
}

/** Split highlighted tokens into per-line token arrays (without trailing \\n). */
export function highlightLines(source: string, lang: LangId): Token[][] {
  const tokens = highlight(source, lang);
  const lines: Token[][] = [[]];
  for (const tok of tokens) {
    const parts = tok.text.split("\n");
    parts.forEach((part, idx) => {
      if (idx > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ kind: tok.kind, text: part });
    });
  }
  return lines.length ? lines : [[]];
}

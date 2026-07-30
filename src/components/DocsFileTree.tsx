import { useEffect, useMemo, useState } from "react";
import type { TicketDocument } from "../types";
import {
  ancestorFolderPaths,
  buildDocTree,
  type DocTreeNode,
} from "../lib/docTree";

interface DocsFileTreeProps {
  documents: TicketDocument[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Expand/reveal this folder path (from breadcrumb navigation). */
  revealFolder?: string | null;
}

function extOf(name: string) {
  return name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
}

function fileTone(kind: TicketDocument["kind"], name: string) {
  const ext = extOf(name);
  if (ext === "tsx" || ext === "jsx") return "tsx";
  if (ext === "ts" || ext === "js") return "ts";
  if (ext === "md" || ext === "mdx" || kind === "spec" || kind === "markdown" || kind === "notes")
    return "md";
  if (ext === "css") return "css";
  if (ext === "json") return "json";
  if (kind === "code") return "ts";
  return "file";
}

function FileGlyph({ kind, name }: { kind: TicketDocument["kind"]; name: string }) {
  const tone = fileTone(kind, name);
  return (
    <span className={`docs-file-icon docs-file-icon-${tone}`} aria-hidden>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
          d="M4.5 2.5h5.2L12.5 5.3V13a.75.75 0 0 1-.75.75h-7.5A.75.75 0 0 1 3.5 13V3.25a.75.75 0 0 1 .75-.75Z"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 2.5V5.4h2.9"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <path
          d="M6 8.25h4M6 10.75h2.75"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function FolderChevron({ open }: { open: boolean }) {
  return (
    <span className={`docs-folder-glyph${open ? " open" : ""}`} aria-hidden>
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
        <path
          d={open ? "M4 6.5 8 10.5 12 6.5" : "M6.5 4 10.5 8 6.5 12"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <span className={`docs-folder-icon${open ? " open" : ""}`} aria-hidden>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        {open ? (
          <>
            <path
              d="M2.5 5.25V4.5c0-.55.45-1 1-1H6l1.25 1.25H12.5c.55 0 1 .45 1 1v.75"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinejoin="round"
            />
            <path
              d="M2.75 5.25h10.6c.55 0 .95.5.85 1.04l-.95 5.1a1 1 0 0 1-.98.81H3.83a1 1 0 0 1-.98-.81l-.95-5.1a.87.87 0 0 1 .85-1.04Z"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <path
            d="M2.5 4.75V12c0 .55.45 1 1 1h9c.55 0 1-.45 1-1V6.5c0-.55-.45-1-1-1H7.75L6.5 4.25H3.5c-.55 0-1 .45-1 1Z"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  );
}

function allFolderPaths(nodes: DocTreeNode[]): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    if (node.type === "folder") {
      paths.push(node.path);
      paths.push(...allFolderPaths(node.children));
    }
  }
  return paths;
}

export function DocsFileTree({
  documents,
  selectedId,
  onSelect,
  revealFolder,
}: DocsFileTreeProps) {
  const tree = useMemo(() => buildDocTree(documents), [documents]);
  const selectedPath =
    documents.find((d) => d.id === selectedId)?.path ?? null;

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(allFolderPaths(buildDocTree(documents))),
  );

  useEffect(() => {
    setExpanded(new Set(allFolderPaths(tree)));
  }, [tree]);

  useEffect(() => {
    if (!selectedPath) return;
    setExpanded((prev) => {
      const ancestors = ancestorFolderPaths(selectedPath);
      if (ancestors.every((p) => prev.has(p))) return prev;
      const next = new Set(prev);
      for (const path of ancestors) next.add(path);
      return next;
    });
  }, [selectedPath]);

  useEffect(() => {
    if (!revealFolder) return;
    setExpanded((prev) => {
      const ancestors = [...ancestorFolderPaths(revealFolder), revealFolder];
      if (ancestors.every((p) => prev.has(p))) return prev;
      const next = new Set(prev);
      for (const path of ancestors) next.add(path);
      return next;
    });
  }, [revealFolder]);

  const toggleFolder = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNodes = (nodes: DocTreeNode[]) =>
    nodes.map((node) => {
      if (node.type === "folder") {
        const isOpen = expanded.has(node.path);
        const focused = revealFolder === node.path;
        return (
          <li key={`folder:${node.path}`} className="docs-tree-folder">
            <button
              type="button"
              className={`docs-tree-row docs-tree-folder-btn${focused ? " focused" : ""}`}
              aria-expanded={isOpen}
              onClick={() => toggleFolder(node.path)}
            >
              <FolderChevron open={isOpen} />
              <FolderIcon open={isOpen} />
              <span className="docs-tree-name">{node.name}</span>
            </button>
            {isOpen ? (
              <ul className="docs-tree-children" role="group">
                {renderNodes(node.children)}
              </ul>
            ) : null}
          </li>
        );
      }

      const active = selectedId === node.doc.id;
      return (
        <li key={node.doc.id}>
          <button
            type="button"
            role="option"
            aria-selected={active}
            className={`docs-tree-row docs-tree-file${active ? " active" : ""}`}
            onClick={() => onSelect(node.doc.id)}
          >
            <span className="docs-tree-file-indent" aria-hidden />
            <FileGlyph kind={node.doc.kind} name={node.name} />
            <span className="docs-tree-name">{node.name}</span>
          </button>
        </li>
      );
    });

  return (
    <div className="docs-tree-wrap">
      <ul className="docs-tree" role="listbox" aria-label="Files">
        {renderNodes(tree)}
      </ul>
    </div>
  );
}

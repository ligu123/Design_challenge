import { buildDocTree, type DocTreeNode } from "./docTree";
import type { ContextRef, ContextRefKind, Ticket } from "../types";

export type ContextCategoryId =
  | "files"
  | "docs"
  | "terminals"
  | "past-chats"
  | "branch"
  | "browser";

export interface ContextPickerItem {
  id: string;
  kind: ContextRefKind;
  label: string;
  sublabel?: string;
  refId?: string;
}

export interface ContextPickerCategory {
  id: ContextCategoryId;
  label: string;
  items: ContextPickerItem[];
}

export interface ContextPickerData {
  categories: ContextPickerCategory[];
  quickPicks: ContextPickerItem[];
}

interface ChatSessionLike {
  id: string;
  title: string;
  ticketId: string | null;
}

function item(
  kind: ContextRefKind,
  label: string,
  sublabel?: string,
  refId?: string,
): ContextPickerItem {
  const id = `${kind}:${refId ?? label}:${sublabel ?? ""}`;
  return { id, kind, label, sublabel, refId };
}

function flattenDocTree(
  nodes: DocTreeNode[],
  into: ContextPickerItem[],
  mode: "files" | "all",
) {
  for (const node of nodes) {
    if (node.type === "folder") {
      if (mode === "all") {
        into.push(item("folder", node.name, node.path || "root", node.path));
      }
      flattenDocTree(node.children, into, mode);
    } else {
      into.push(
        item("file", node.name, node.doc.path.split("/").slice(0, -1).join("/") || "root", node.doc.id),
      );
    }
  }
}

function matchesQuery(entry: ContextPickerItem, query: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    entry.label.toLowerCase().includes(q) ||
    (entry.sublabel?.toLowerCase().includes(q) ?? false)
  );
}

export function toContextRef(pickerItem: ContextPickerItem): ContextRef {
  return {
    id: pickerItem.id,
    kind: pickerItem.kind,
    label: pickerItem.label,
    sublabel: pickerItem.sublabel,
    refId: pickerItem.refId,
  };
}

export function buildContextPickerData(
  ticket: Ticket | null,
  sessions: ChatSessionLike[],
  activeChatId: string,
  query = "",
): ContextPickerData {
  const categories: ContextPickerCategory[] = [];

  const fileItems: ContextPickerItem[] = [];
  const docItems: ContextPickerItem[] = [];
  const terminalItems: ContextPickerItem[] = [];
  const chatItems: ContextPickerItem[] = [];
  const branchItems: ContextPickerItem[] = [];
  const browserItems: ContextPickerItem[] = [
    item("browser", "localhost:5173", "Dev server preview"),
    item("browser", "Storybook", "Component library"),
    item("browser", "CI report", "Latest test run"),
  ];

  if (ticket) {
    const tree = buildDocTree(ticket.documents);
    flattenDocTree(tree, fileItems, "all");

    for (const path of ticket.run.filesChanged) {
      const name = path.split("/").pop() ?? path;
      if (!fileItems.some((f) => f.label === name && f.sublabel === path)) {
        fileItems.push(item("file", name, path));
      }
    }

    for (const ev of ticket.run.evidence) {
      if (ev.kind === "file" || ev.kind === "diff") {
        const name = ev.path.split("/").pop() ?? ev.path;
        fileItems.push(
          item(ev.kind === "diff" ? "evidence" : "file", name, ev.path, ev.id),
        );
      }
      if (ev.kind === "terminal") {
        terminalItems.push(item("terminal", ev.title, "Terminal output", ev.id));
      }
    }

    for (const doc of ticket.documents) {
      docItems.push(
        item(
          "doc",
          doc.title,
          doc.path,
          doc.id,
        ),
      );
    }

    branchItems.push(
      item("branch-diff", `Diff with main`, ticket.branch, ticket.branch),
    );
    if (ticket.branch !== "main") {
      branchItems.push(
        item("branch-diff", ticket.branch, "Current branch", ticket.branch),
      );
    }
    if (ticket.delivery.prNumber != null) {
      branchItems.push(
        item("branch-diff", `PR #${ticket.delivery.prNumber}`, ticket.delivery.prStatus, String(ticket.delivery.prNumber)),
      );
    }

    browserItems.unshift(
      item("browser", ticket.repoPath, "Repository"),
    );
  }

  for (const session of sessions) {
    if (session.id === activeChatId) continue;
    chatItems.push(
      item("past-chat", session.title, session.ticketId ? "Ticket chat" : "Empty chat", session.id),
    );
  }

  categories.push(
    { id: "files", label: "Files & Folders", items: fileItems },
    { id: "docs", label: "Docs", items: docItems },
    { id: "terminals", label: "Terminals", items: terminalItems },
    { id: "past-chats", label: "Past Chats", items: chatItems },
    { id: "branch", label: "Branch (Diff with Main)", items: branchItems },
    { id: "browser", label: "Browser", items: browserItems },
  );

  const allItems = categories.flatMap((c) => c.items);
  const quickPicks = allItems
    .filter((entry) => matchesQuery(entry, query))
    .slice(0, 6);

  return {
    categories: categories.map((cat) => ({
      ...cat,
      items: cat.items.filter((entry) => matchesQuery(entry, query)),
    })),
    quickPicks,
  };
}

export function getMentionState(text: string, cursor: number) {
  const before = text.slice(0, cursor);
  const atIndex = before.lastIndexOf("@");
  if (atIndex === -1) return null;
  const afterAt = before.slice(atIndex + 1);
  if (afterAt.includes(" ") || afterAt.includes("\n")) return null;
  return { query: afterAt, start: atIndex, end: cursor };
}

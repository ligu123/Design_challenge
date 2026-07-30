import type { TicketDocument } from "../types";

export type DocTreeFolder = {
  type: "folder";
  name: string;
  path: string;
  children: DocTreeNode[];
};

export type DocTreeFile = {
  type: "file";
  name: string;
  doc: TicketDocument;
};

export type DocTreeNode = DocTreeFolder | DocTreeFile;

type MutableFolder = {
  type: "folder";
  name: string;
  path: string;
  folders: Map<string, MutableFolder>;
  files: DocTreeFile[];
};

function sortNodes(nodes: DocTreeNode[]): DocTreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function freezeFolder(folder: MutableFolder): DocTreeFolder {
  const children: DocTreeNode[] = [
    ...[...folder.folders.values()].map(freezeFolder),
    ...folder.files,
  ];
  return {
    type: "folder",
    name: folder.name,
    path: folder.path,
    children: sortNodes(children),
  };
}

/** Build a directory tree from document paths (e.g. src/auth/session.ts). */
export function buildDocTree(documents: TicketDocument[]): DocTreeNode[] {
  const root: MutableFolder = {
    type: "folder",
    name: "",
    path: "",
    folders: new Map(),
    files: [],
  };

  for (const doc of documents) {
    const parts = doc.path.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i];
      const path = parts.slice(0, i + 1).join("/");
      let next = current.folders.get(name);
      if (!next) {
        next = {
          type: "folder",
          name,
          path,
          folders: new Map(),
          files: [],
        };
        current.folders.set(name, next);
      }
      current = next;
    }

    const fileName = parts[parts.length - 1];
    current.files.push({ type: "file", name: fileName, doc });
  }

  return freezeFolder(root).children;
}

/** Folder paths that contain the given file path (ancestors). */
export function ancestorFolderPaths(filePath: string): string[] {
  const parts = filePath.split("/").filter(Boolean);
  if (parts.length <= 1) return [];
  const paths: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    paths.push(parts.slice(0, i).join("/"));
  }
  return paths;
}

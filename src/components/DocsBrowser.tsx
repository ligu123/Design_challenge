import type { TicketDocument } from "../types";
import { CodeReader } from "./CodeReader";
import { DocsFileTree } from "./DocsFileTree";

interface DocsBrowserProps {
  ticketKey: string;
  documents: TicketDocument[];
  /** Open file id, or null to show the file browser. */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function DocsBrowser({
  ticketKey,
  documents,
  selectedId,
  onSelect,
}: DocsBrowserProps) {
  const selected = selectedId
    ? (documents.find((d) => d.id === selectedId) ?? null)
    : null;

  const pathParts = selected
    ? selected.path.split("/").filter(Boolean)
    : [];

  const closeFile = () => onSelect(null);

  return (
    <div className={`docs-browser${selected ? " is-reading" : " is-browsing"}`}>
      <nav className="docs-browser-crumb" aria-label="File path">
        <span className="docs-crumb-muted">Tickets</span>
        <span className="docs-crumb-sep" aria-hidden>
          /
        </span>
        <span className="docs-crumb-muted mono">{ticketKey}</span>
        <span className="docs-crumb-sep" aria-hidden>
          /
        </span>
        {selected ? (
          <button type="button" className="docs-crumb-link" onClick={closeFile}>
            Documents
          </button>
        ) : (
          <span className="docs-crumb-current" aria-current="page">
            Documents
          </span>
        )}
        {pathParts.map((part, i) => {
          const isLast = i === pathParts.length - 1;
          return (
            <span key={`${part}-${i}`} className="docs-crumb-segment">
              <span className="docs-crumb-sep" aria-hidden>
                /
              </span>
              {isLast ? (
                <span className="docs-crumb-current mono" aria-current="page">
                  {part}
                </span>
              ) : (
                <button
                  type="button"
                  className="docs-crumb-link mono"
                  onClick={closeFile}
                >
                  {part}
                </button>
              )}
            </span>
          );
        })}
      </nav>

      {selected ? (
        <>
          <div className="docs-reader-actions">
            <button
              type="button"
              className="docs-reader-back"
              onClick={closeFile}
            >
              ← Files
            </button>
          </div>
          <section
            className="docs-reader-pane docs-reader-pane-full"
            aria-label="File reader"
          >
            <CodeReader
              path={selected.path}
              content={selected.content}
              title={selected.title !== "Spec" ? selected.title : undefined}
            />
          </section>
        </>
      ) : (
        <section className="docs-browse-pane" aria-label="Document browser">
          <div className="docs-browse-head">
            <div className="docs-browse-head-left">
              <span className="docs-browse-title">Files</span>
              <span className="docs-browse-scope mono">
                {documents.length}{" "}
                {documents.length === 1 ? "file" : "files"}
              </span>
            </div>
          </div>
          <DocsFileTree
            documents={documents}
            selectedId={null}
            onSelect={onSelect}
          />
        </section>
      )}
    </div>
  );
}

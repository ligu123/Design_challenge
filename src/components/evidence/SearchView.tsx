import type { SearchEvidence } from "../../types";

export function SearchView({ evidence }: { evidence: SearchEvidence }) {
  return (
    <div className="evidence-panel">
      <div className="evidence-header">
        <h2>Search</h2>
        <span className="evidence-path">{evidence.query}</span>
      </div>
      <ul className="search-hits">
        {evidence.hits.map((hit) => (
          <li key={`${hit.path}:${hit.line}`} className="search-hit">
            <div className="search-hit-path">
              {hit.path}:{hit.line}
            </div>
            <div className="search-hit-line">{hit.preview}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

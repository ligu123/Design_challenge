import { useEffect, useRef, useState } from "react";
import type { PlaceId, Ticket } from "../types";

const items: { id: PlaceId; label: string }[] = [
  { id: "tickets", label: "Tickets" },
  { id: "ops", label: "Insights" },
  { id: "policies", label: "Policies" },
  { id: "memory", label: "Settings" },
];

const settingsPlaces = new Set<PlaceId>(["memory", "environments"]);

const ORGS = [
  { id: "acme", name: "Acme", mark: "A" },
  { id: "northwind", name: "Northwind", mark: "N" },
  { id: "orbit", name: "Orbit Labs", mark: "O" },
] as const;

type OrgId = (typeof ORGS)[number]["id"];

interface TopNavProps {
  place: PlaceId;
  onNavigate: (place: PlaceId) => void;
  tickets: Ticket[];
}

function OrgChevron() {
  return (
    <svg
      className="top-nav-org-chevron"
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 6.5 8 10.5 12 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TopNav({ place, onNavigate, tickets }: TopNavProps) {
  const resolved = tickets.filter((t) => t.status === "succeeded").length;
  const total = tickets.length;
  const [orgId, setOrgId] = useState<OrgId>("acme");
  const [orgOpen, setOrgOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const orgRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const org = ORGS.find((o) => o.id === orgId) ?? ORGS[0];

  useEffect(() => {
    if (!menuOpen && !orgOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (orgRef.current && !orgRef.current.contains(target)) {
        setOrgOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setOrgOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, orgOpen]);

  return (
    <header className="top-nav">
      <div className="top-nav-start">
        <div className="top-nav-org" ref={orgRef}>
          <button
            type="button"
            className={`top-nav-org-btn${orgOpen ? " open" : ""}`}
            aria-label="Switch organization"
            aria-expanded={orgOpen}
            aria-haspopup="listbox"
            onClick={() => {
              setOrgOpen((v) => !v);
              setMenuOpen(false);
            }}
          >
            <span className="top-nav-org-mark" aria-hidden>
              {org.mark}
            </span>
            <span className="top-nav-org-name">{org.name}</span>
            <OrgChevron />
          </button>
          {orgOpen ? (
            <div
              className="top-nav-org-menu"
              role="listbox"
              aria-label="Organizations"
            >
              {ORGS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="option"
                  aria-selected={o.id === orgId}
                  className={`top-nav-org-item${o.id === orgId ? " selected" : ""}`}
                  onClick={() => {
                    setOrgId(o.id);
                    setOrgOpen(false);
                  }}
                >
                  <span className="top-nav-org-mark" aria-hidden>
                    {o.mark}
                  </span>
                  <span className="top-nav-org-item-name">{o.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <nav className="top-nav-links" aria-label="Places">
        {items.map((item) => {
          const active =
            item.id === "memory"
              ? settingsPlaces.has(place)
              : place === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`top-nav-link${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="top-nav-end">
        <p
          className="top-nav-resolved"
          title={`${resolved} of ${total} tickets resolved`}
        >
          <span className="mono">
            {resolved}/{total}
          </span>
          <span className="top-nav-resolved-label">tickets resolved</span>
        </p>
        <div className="top-nav-account" ref={menuRef}>
          <button
            type="button"
            className={`top-nav-avatar${menuOpen ? " open" : ""}`}
            title="Account"
            aria-label="Account"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setMenuOpen((v) => !v);
              setOrgOpen(false);
            }}
          >
            <span className="top-nav-avatar-initials" aria-hidden>
              M
            </span>
          </button>
          {menuOpen && (
            <div className="top-nav-account-menu" role="menu" aria-label="Account">
              <div className="top-nav-account-head">
                <span className="top-nav-account-name">Maya Chen</span>
                <span className="top-nav-account-email">maya@acme.dev</span>
              </div>
              <button
                type="button"
                className="top-nav-account-item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </button>
              <button
                type="button"
                className="top-nav-account-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate("memory");
                }}
              >
                Settings
              </button>
              <button
                type="button"
                className="top-nav-account-item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                Preferences
              </button>
              <div className="top-nav-account-divider" role="separator" />
              <button
                type="button"
                className="top-nav-account-item danger"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

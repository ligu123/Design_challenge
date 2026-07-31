import { useEffect, useMemo, useRef, useState } from "react";
import type { Priority, Ticket, TicketStatus } from "../types";
import { getPendingDecision, decisionSummary } from "../lib/pendingDecision";
import { PriorityIcon, StatusChip } from "./StatusChip";

interface TicketQueueProps {
  tickets: Ticket[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHide?: () => void;
}

type ResolvedFilter = "all" | "resolved" | "open";
type FilterKey = "status" | "priority" | "assignee" | "resolved" | "query";

interface TicketFilters {
  query: string;
  status: "all" | TicketStatus;
  priority: "all" | Priority;
  assignee: "all" | string;
  resolved: ResolvedFilter;
}

const DEFAULT_FILTERS: TicketFilters = {
  query: "",
  status: "all",
  priority: "all",
  assignee: "all",
  resolved: "all",
};

const STATUS_OPTIONS: { id: TicketFilters["status"]; label: string }[] = [
  { id: "all", label: "All" },
  { id: "idle", label: "Idle" },
  { id: "running", label: "Running" },
  { id: "blocked", label: "Blocked" },
  { id: "failed", label: "Failed" },
  { id: "succeeded", label: "Succeeded" },
];

const PRIORITY_OPTIONS: { id: TicketFilters["priority"]; label: string }[] = [
  { id: "all", label: "All" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

const RESOLVED_OPTIONS: { id: ResolvedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "resolved", label: "Resolved" },
  { id: "open", label: "Open" },
];

const CATEGORIES: { key: FilterKey; label: string }[] = [
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "assignee", label: "Assignee" },
  { key: "resolved", label: "Resolved" },
  { key: "query", label: "Search" },
];

function isResolved(ticket: Ticket) {
  return ticket.status === "succeeded";
}

function countActiveFilters(filters: TicketFilters) {
  let n = 0;
  if (filters.query.trim()) n += 1;
  if (filters.status !== "all") n += 1;
  if (filters.priority !== "all") n += 1;
  if (filters.assignee !== "all") n += 1;
  if (filters.resolved !== "all") n += 1;
  return n;
}

function matchesFilters(ticket: Ticket, filters: TicketFilters) {
  const q = filters.query.trim().toLowerCase();
  if (q) {
    const hay = `${ticket.key} ${ticket.title} ${ticket.assignee}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.status !== "all" && ticket.status !== filters.status) return false;
  if (filters.priority !== "all" && ticket.priority !== filters.priority)
    return false;
  if (filters.assignee !== "all" && ticket.assignee !== filters.assignee)
    return false;
  if (filters.resolved === "resolved" && !isResolved(ticket)) return false;
  if (filters.resolved === "open" && isResolved(ticket)) return false;
  return true;
}

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M16 16l4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5 10 17.5 19 7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HideQueueIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5h6v14H4z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M14 9l-4 3 4 3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShowQueueIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5h6v14H4z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M10 9l4 3-4 3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TicketQueue({ tickets, selectedId, onSelect, onHide }: TicketQueueProps) {
  const [filters, setFilters] = useState<TicketFilters>(DEFAULT_FILTERS);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [submenu, setSubmenu] = useState<FilterKey | null>(null);
  const [queryDraft, setQueryDraft] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const assignees = useMemo(() => {
    const set = new Set(tickets.map((t) => t.assignee));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [tickets]);

  const visible = useMemo(
    () => tickets.filter((t) => matchesFilters(t, filters)),
    [tickets, filters],
  );

  const activeCount = countActiveFilters(filters);

  const valueLabel = (key: FilterKey) => {
    switch (key) {
      case "status":
        return (
          STATUS_OPTIONS.find((o) => o.id === filters.status)?.label ?? "All"
        );
      case "priority":
        return (
          PRIORITY_OPTIONS.find((o) => o.id === filters.priority)?.label ??
          "All"
        );
      case "assignee":
        return filters.assignee === "all" ? "All" : filters.assignee;
      case "resolved":
        return (
          RESOLVED_OPTIONS.find((o) => o.id === filters.resolved)?.label ??
          "All"
        );
      case "query":
        return filters.query.trim() || "Any";
    }
  };

  const isActive = (key: FilterKey) => {
    if (key === "query") return Boolean(filters.query.trim());
    if (key === "status") return filters.status !== "all";
    if (key === "priority") return filters.priority !== "all";
    if (key === "assignee") return filters.assignee !== "all";
    return filters.resolved !== "all";
  };

  const countFor = (predicate: (t: Ticket) => boolean) =>
    tickets.filter(predicate).length;

  const closeMenu = () => {
    setOpen(false);
    setSubmenu(null);
    setQueryDraft(filters.query);
  };

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSubmenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSubmenu((prev) => {
        if (prev) return null;
        setOpen(false);
        return null;
      });
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, submenu, filters.query]);

  const openMenu = () => {
    setQueryDraft(filters.query);
    setSubmenu(null);
    setOpen(true);
  };

  const renderSubmenu = () => {
    if (!submenu) return null;

    if (submenu === "query") {
      return (
        <div className="queue-filter-submenu" role="menu" aria-label="Search">
          <form
            className="queue-filter-search"
            onSubmit={(e) => {
              e.preventDefault();
              setFilters((prev) => ({ ...prev, query: queryDraft.trim() }));
              setSubmenu(null);
            }}
          >
            <input
              type="search"
              className="queue-filter-input"
              placeholder="Key, title…"
              value={queryDraft}
              autoFocus
              onChange={(e) => setQueryDraft(e.target.value)}
            />
            <div className="queue-filter-search-actions">
              <button
                type="button"
                className="queue-filter-text-btn"
                onClick={() => {
                  setQueryDraft("");
                  setFilters((prev) => ({ ...prev, query: "" }));
                  setSubmenu(null);
                }}
              >
                Clear
              </button>
              <button type="submit" className="queue-filter-text-btn primary">
                Apply
              </button>
            </div>
          </form>
        </div>
      );
    }

    type Opt = { id: string; label: string; count: number; selected: boolean };
    let options: Opt[] = [];

    if (submenu === "status") {
      options = STATUS_OPTIONS.map((o) => ({
        id: o.id,
        label: o.label,
        count:
          o.id === "all"
            ? tickets.length
            : countFor((t) => t.status === o.id),
        selected: filters.status === o.id,
      }));
    } else if (submenu === "priority") {
      options = PRIORITY_OPTIONS.map((o) => ({
        id: o.id,
        label: o.label,
        count:
          o.id === "all"
            ? tickets.length
            : countFor((t) => t.priority === o.id),
        selected: filters.priority === o.id,
      }));
    } else if (submenu === "assignee") {
      options = [
        {
          id: "all",
          label: "All",
          count: tickets.length,
          selected: filters.assignee === "all",
        },
        ...assignees.map((a) => ({
          id: a,
          label: a,
          count: countFor((t) => t.assignee === a),
          selected: filters.assignee === a,
        })),
      ];
    } else if (submenu === "resolved") {
      options = RESOLVED_OPTIONS.map((o) => ({
        id: o.id,
        label: o.label,
        count:
          o.id === "all"
            ? tickets.length
            : o.id === "resolved"
              ? countFor(isResolved)
              : countFor((t) => !isResolved(t)),
        selected: filters.resolved === o.id,
      }));
    }

    return (
      <div
        className="queue-filter-submenu"
        role="menu"
        aria-label={CATEGORIES.find((c) => c.key === submenu)?.label}
      >
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="menuitemradio"
            aria-checked={o.selected}
            className={`queue-filter-item${o.selected ? " selected" : ""}`}
            onClick={() => {
              if (submenu === "status") {
                setFilters((prev) => ({
                  ...prev,
                  status: o.id as TicketFilters["status"],
                }));
              } else if (submenu === "priority") {
                setFilters((prev) => ({
                  ...prev,
                  priority: o.id as TicketFilters["priority"],
                }));
              } else if (submenu === "assignee") {
                setFilters((prev) => ({ ...prev, assignee: o.id }));
              } else if (submenu === "resolved") {
                setFilters((prev) => ({
                  ...prev,
                  resolved: o.id as ResolvedFilter,
                }));
              }
              setSubmenu(null);
            }}
          >
            <span className="queue-filter-item-check">
              {o.selected && <CheckIcon />}
            </span>
            <span className="queue-filter-item-label">{o.label}</span>
            <span className="queue-filter-item-count mono">{o.count}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <aside className="queue">
      <div className="queue-header queue-filter-bar" ref={panelRef}>
        {onHide && (
          <button
            type="button"
            className="queue-filter-trigger queue-hide-trigger"
            aria-label="Hide ticket list"
            title="Hide ticket list"
            onClick={onHide}
          >
            <HideQueueIcon />
          </button>
        )}
        {searchOpen ? (
          <div className="queue-search-field">
            <SearchIcon />
            <input
              ref={searchInputRef}
              type="search"
              className="queue-search-input"
              placeholder="Search tickets…"
              value={filters.query}
              aria-label="Search tickets"
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, query: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  if (filters.query) {
                    setFilters((prev) => ({ ...prev, query: "" }));
                  } else {
                    setSearchOpen(false);
                  }
                }
              }}
            />
            <button
              type="button"
              className="queue-search-close"
              aria-label="Close search"
              onClick={() => {
                setSearchOpen(false);
                setFilters((prev) => ({ ...prev, query: "" }));
              }}
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <span className="queue-filter-summary mono">
              {visible.length}/{tickets.length}
            </span>
            {activeCount > 0 && (
              <button
                type="button"
                className="queue-filter-clear"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setQueryDraft("");
                  setSubmenu(null);
                }}
              >
                Clear
              </button>
            )}
          </>
        )}
        <button
          type="button"
          className={`queue-filter-trigger${searchOpen || filters.query.trim() ? " active" : ""}`}
          aria-pressed={searchOpen}
          aria-label="Search tickets"
          title="Search"
          onClick={() => {
            closeMenu();
            setSearchOpen((v) => !v);
          }}
        >
          <SearchIcon />
        </button>
        <button
          type="button"
          className={`queue-filter-trigger${open ? " open" : ""}${activeCount ? " active" : ""}`}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={
            activeCount > 0
              ? `Filter tickets, ${activeCount} active`
              : "Filter tickets"
          }
          title="Filter"
          onClick={() => {
            setSearchOpen(false);
            open ? closeMenu() : openMenu();
          }}
        >
          <FilterIcon />
          {activeCount > 0 && (
            <span className="queue-filter-count">{activeCount}</span>
          )}
        </button>

        {open && (
          <div
            className="queue-filter-menu"
            role="menu"
            aria-label="Ticket filters"
          >
            <div className="queue-filter-menu-head">
              <span className="queue-filter-menu-title">Filter</span>
            </div>
            <div className="queue-filter-menu-list">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.key}
                  className={`queue-filter-category-wrap${submenu === cat.key ? " open" : ""}`}
                  onMouseEnter={() => {
                    setSubmenu(cat.key);
                    if (cat.key === "query") setQueryDraft(filters.query);
                  }}
                >
                  <button
                    type="button"
                    className={`queue-filter-category${isActive(cat.key) ? " active" : ""}${submenu === cat.key ? " open" : ""}`}
                    role="menuitem"
                    aria-haspopup="menu"
                    aria-expanded={submenu === cat.key}
                    onClick={() => {
                      setSubmenu((prev) =>
                        prev === cat.key ? null : cat.key,
                      );
                      if (cat.key === "query") setQueryDraft(filters.query);
                    }}
                  >
                    <span className="queue-filter-category-label">
                      {cat.label}
                    </span>
                    <span className="queue-filter-category-value">
                      {valueLabel(cat.key)}
                    </span>
                    <ChevronIcon />
                  </button>
                  {submenu === cat.key && renderSubmenu()}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="queue-list">
        {visible.length === 0 ? (
          <p className="queue-empty">No tickets match these filters.</p>
        ) : (
          visible.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              className={`ticket-item${selectedId === ticket.id ? " active" : ""}`}
              onClick={() => onSelect(ticket.id)}
            >
              <div className="ticket-item-main">
                <span className="ticket-id">{ticket.key}</span>
                <div className="ticket-title">{ticket.title}</div>
                {ticket.status === "blocked" && (() => {
                  const pending = getPendingDecision(ticket.run);
                  if (!pending) return null;
                  return (
                    <div className="ticket-decision-hint">
                      <span className="ticket-decision-kind">
                        {pending.kind}
                      </span>
                      <span className="ticket-decision-title">
                        {decisionSummary(pending)}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <span className="ticket-item-icons">
                <PriorityIcon priority={ticket.priority} />
                <StatusChip status={ticket.status} />
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

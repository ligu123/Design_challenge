import { useEffect, useState, type ReactNode } from "react";
import type {
  ActivityKind,
  ActivityStatus,
  PendingDecision,
  Priority,
  ReviewDecision,
  TicketStatus,
} from "../types";
import { ActivityItem } from "./ActivityItem";
import { PendingDecisionCard } from "./PendingDecisionCard";
import {
  ActivityStatusIcon,
  PriorityIcon,
  StatusChip,
} from "./StatusChip";

const SECTIONS = [
  { id: "foundations", label: "Foundations" },
  { id: "color", label: "Color" },
  { id: "typography", label: "Typography" },
  { id: "button", label: "Button" },
  { id: "icon-button", label: "Icon Button" },
  { id: "status-chip", label: "Status Chip" },
  { id: "priority", label: "Priority" },
  { id: "activity-status", label: "Activity Status" },
  { id: "chips", label: "Chips" },
  { id: "tabs", label: "Tabs & Toggles" },
  { id: "inputs", label: "Inputs" },
  { id: "meta-badge", label: "Meta Badge" },
  { id: "ticket-item", label: "Ticket Item" },
  { id: "activity-item", label: "Activity Item" },
  { id: "pending-decision", label: "Pending Decision" },
  { id: "diff", label: "Diff Tokens" },
] as const;

const SURFACE_TOKENS = [
  { name: "--bg", css: "var(--bg)", value: "#101010" },
  { name: "--panel", css: "var(--panel)", value: "#0c0c0c" },
  { name: "--panel-raised", css: "var(--panel-raised)", value: "#161616" },
  { name: "--hover", css: "var(--hover)", value: "#1a1a1a" },
  { name: "--active", css: "var(--active)", value: "#222222" },
] as const;

const BORDER_TOKENS = [
  { name: "--border", css: "var(--border)", value: "#1c1c1c" },
  { name: "--border-strong", css: "var(--border-strong)", value: "#242424" },
] as const;

const FG_TOKENS = [
  { name: "--fg", css: "var(--fg)", value: "#f2efe9" },
  { name: "--fg-secondary", css: "var(--fg-secondary)", value: "#c8c1b7" },
  { name: "--muted", css: "var(--muted)", value: "#a39b92" },
] as const;

const STATUS_TOKENS = [
  { name: "--running", css: "var(--running)", bg: "var(--running-bg)", value: "#6b9fd4" },
  { name: "--blocked", css: "var(--blocked)", bg: "var(--blocked-bg)", value: "#c4a574" },
  { name: "--error", css: "var(--error)", bg: "var(--error-bg)", value: "#d17a73" },
  { name: "--success", css: "var(--success)", bg: "var(--success-bg)", value: "#7aab87" },
] as const;

const TICKET_STATUSES: TicketStatus[] = [
  "idle",
  "running",
  "blocked",
  "failed",
  "succeeded",
];

const PRIORITIES: Priority[] = ["high", "medium", "low"];

const ACTIVITY_STATUSES: ActivityStatus[] = [
  "running",
  "done",
  "failed",
  "waiting",
];

const ACTIVITY_KINDS: ActivityKind[] = [
  "plan",
  "search",
  "read",
  "edit",
  "lint",
  "terminal",
  "test",
  "verify",
  "fix",
  "git",
  "ask",
];

const REVIEW_DECISIONS: ReviewDecision[] = [
  "todo",
  "in_progress",
  "approved",
  "changes_requested",
  "merged",
];

const REVIEW_LABELS: Record<ReviewDecision, string> = {
  todo: "Todo",
  in_progress: "In progress",
  approved: "Approved",
  changes_requested: "Changes requested",
  merged: "Merged",
};

function Specimen({
  state,
  children,
  wide,
}: {
  state: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`ds-specimen${wide ? " wide" : ""}`} data-state={state}>
      <div className="ds-specimen-canvas">{children}</div>
      <span className="ds-specimen-label mono">{state}</span>
    </div>
  );
}

function ComponentDoc({
  id,
  title,
  description,
  props,
  children,
}: {
  id: string;
  title: string;
  description: string;
  props?: string[];
  children: ReactNode;
}) {
  return (
    <section className="ds-component" id={id}>
      <header className="ds-component-header">
        <h2>{title}</h2>
        <p>{description}</p>
        {props && props.length > 0 ? (
          <ul className="ds-prop-list">
            {props.map((p) => (
              <li key={p} className="mono">
                {p}
              </li>
            ))}
          </ul>
        ) : null}
      </header>
      <div className="ds-component-body">{children}</div>
    </section>
  );
}

function StateRow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="ds-state-row">
      <h3 className="ds-state-row-title">{title}</h3>
      <div className="ds-specimen-grid">{children}</div>
    </div>
  );
}

function ColorSwatch({
  name,
  css,
  value,
  bg,
}: {
  name: string;
  css: string;
  value: string;
  bg?: string;
}) {
  return (
    <div className="ds-swatch">
      <div
        className="ds-swatch-chip"
        style={{
          background: bg ? `linear-gradient(135deg, ${css} 50%, ${bg} 50%)` : css,
          borderColor: "var(--border-strong)",
        }}
      />
      <div className="ds-swatch-meta">
        <span className="mono ds-swatch-name">{name}</span>
        <span className="mono ds-swatch-value">{value}</span>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 3.5v9M3.5 8h9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8h9M8.5 4.5 12.5 8 8.5 11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const DEMO_DECISIONS: Record<PendingDecision["kind"], PendingDecision> = {
  choice: {
    id: "ds-pd-choice",
    kind: "choice",
    title: "Open pull request?",
    prompt: "Unit tests pass. How should I deliver the changes?",
    blockingStage: "verify",
    waitingSince: Date.now() - 12 * 60_000,
    options: [
      {
        id: "open-pr",
        label: "Open draft PR",
        description: "Create draft PR for team review",
      },
      {
        id: "wait",
        label: "Wait for my review",
        description: "Keep the commit local until I approve",
      },
      { id: "custom", label: "Custom reply…", isCustom: true },
    ],
    contextRefs: [
      {
        id: "ds-ctx-1",
        kind: "evidence",
        label: "refresh.ts",
        sublabel: "src/auth/refresh.ts",
        refId: "ev-1",
      },
    ],
  },
  clarification: {
    id: "ds-pd-clarification",
    kind: "clarification",
    title: "Which edge case matters?",
    prompt: "I found two failure modes. Which should I prioritize?",
    blockingStage: "investigate",
    waitingSince: Date.now() - 5 * 60_000,
    suggestedReplies: ["Concurrent tabs", "Expired refresh token", "Offline retry"],
  },
  approval: {
    id: "ds-pd-approval",
    kind: "approval",
    title: "Apply schema migration?",
    prompt: "This writes to production-adjacent staging. Confirm to proceed.",
    blockingStage: "implement",
    waitingSince: Date.now() - 2 * 60_000,
    options: [
      { id: "approve", label: "Approve" },
      { id: "reject", label: "Reject" },
    ],
  },
  review: {
    id: "ds-pd-review",
    kind: "review",
    title: "Review proposed approach",
    prompt: "Single-flight lock around refresh. Leave notes if you want changes.",
    blockingStage: "verify",
    waitingSince: Date.now() - 30 * 60_000,
  },
};

export function DesignSystemPage() {
  const [active, setActive] = useState<string>("foundations");
  const [tabDemo, setTabDemo] = useState<"a" | "b" | "c">("a");
  const [toggleDemo, setToggleDemo] = useState<"queue" | "review">("queue");
  const [linedTab, setLinedTab] = useState<"open" | "done">("open");

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean,
    ) as HTMLElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.4, 0.7] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="center center-span">
      <div className="center-body ds-body">
        <div className="ds-page">
          <aside className="ds-nav" aria-label="Design system">
            <div className="ds-nav-brand">
              <span className="section-label">Library</span>
              <strong>Component System</strong>
            </div>
            <nav className="ds-nav-list">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`ds-nav-link${active === section.id ? " active" : ""}`}
                >
                  {section.label}
                </a>
              ))}
            </nav>
            <p className="ds-nav-hint">
              Each specimen is labeled by state — select a section and copy into
              Figma.
            </p>
          </aside>

          <div className="ds-main">
            <header className="ds-hero" id="foundations">
              <p className="section-label">Design system</p>
              <h1>Components &amp; foundations</h1>
              <p className="ds-hero-lede">
                Live catalog of reusable UI from this build — every documented
                variant and interactive state, bound to the same CSS tokens as
                production.
              </p>
            </header>

            <section className="ds-component" id="color">
              <header className="ds-component-header">
                <h2>Color</h2>
                <p>
                  Semantic tokens from <span className="mono">tokens.css</span>.
                  Dark-only product chrome.
                </p>
              </header>
              <div className="ds-component-body">
                <StateRow title="Surfaces">
                  {SURFACE_TOKENS.map((t) => (
                    <ColorSwatch key={t.name} {...t} />
                  ))}
                </StateRow>
                <StateRow title="Borders">
                  {BORDER_TOKENS.map((t) => (
                    <ColorSwatch key={t.name} {...t} />
                  ))}
                </StateRow>
                <StateRow title="Foreground">
                  {FG_TOKENS.map((t) => (
                    <ColorSwatch key={t.name} {...t} />
                  ))}
                </StateRow>
                <StateRow title="Status">
                  {STATUS_TOKENS.map((t) => (
                    <ColorSwatch key={t.name} {...t} />
                  ))}
                </StateRow>
                <StateRow title="Radius">
                  <div className="ds-radius-demo">
                    <div
                      className="ds-radius-box"
                      style={{ borderRadius: "var(--radius)" }}
                    />
                    <span className="mono">--radius · 4px</span>
                  </div>
                </StateRow>
              </div>
            </section>

            <section className="ds-component" id="typography">
              <header className="ds-component-header">
                <h2>Typography</h2>
                <p>
                  Default typeface pair is IBM Plex Sans + IBM Plex Mono. Switch
                  families with the bottom-left typeface control.
                </p>
              </header>
              <div className="ds-component-body">
                <div className="ds-type-stack">
                  <div className="ds-type-row">
                    <span className="ds-type-meta mono">Display / 24 · 500</span>
                    <p className="ds-type-24">Ticket resolution summary</p>
                  </div>
                  <div className="ds-type-row">
                    <span className="ds-type-meta mono">Title / 20 · 500</span>
                    <p className="ds-type-20">Fix silent token refresh race</p>
                  </div>
                  <div className="ds-type-row">
                    <span className="ds-type-meta mono">Body / 13 · 300</span>
                    <p className="ds-type-13">
                      Agent paused for a decision. Single-flight lock is in place
                      and unit tests pass.
                    </p>
                  </div>
                  <div className="ds-type-row">
                    <span className="ds-type-meta mono">UI / 12 · 400</span>
                    <p className="ds-type-12">Open draft PR for team review</p>
                  </div>
                  <div className="ds-type-row">
                    <span className="ds-type-meta mono">Label / 11 · 500</span>
                    <p className="ds-type-11 section-label" style={{ margin: 0 }}>
                      Activity
                    </p>
                  </div>
                  <div className="ds-type-row">
                    <span className="ds-type-meta mono">Mono / 10</span>
                    <p className="ds-type-mono mono">src/auth/refresh.ts</p>
                  </div>
                </div>
              </div>
            </section>

            <ComponentDoc
              id="button"
              title="Button"
              description="Primary actions, default raised controls, and ghost/text actions. Height 28px, radius token, 12px type."
              props={[
                "Style = Default | Primary | Ghost",
                "State = Default | Hover | Disabled",
              ]}
            >
              <StateRow title="Default">
                <Specimen state="Style=Default, State=Default">
                  <button type="button" className="btn">
                    Default
                  </button>
                </Specimen>
                <Specimen state="Style=Default, State=Hover">
                  <button type="button" className="btn ds-force-hover">
                    Hover
                  </button>
                </Specimen>
              </StateRow>
              <StateRow title="Primary">
                <Specimen state="Style=Primary, State=Default">
                  <button type="button" className="btn btn-primary">
                    Primary
                  </button>
                </Specimen>
                <Specimen state="Style=Primary, State=Hover">
                  <button type="button" className="btn btn-primary ds-force-primary-hover">
                    Hover
                  </button>
                </Specimen>
                <Specimen state="Style=Primary, State=Disabled">
                  <button type="button" className="btn btn-primary" disabled>
                    Disabled
                  </button>
                </Specimen>
              </StateRow>
              <StateRow title="Ghost">
                <Specimen state="Style=Ghost, State=Default">
                  <button type="button" className="btn btn-ghost">
                    Ghost
                  </button>
                </Specimen>
                <Specimen state="Style=Ghost, State=Hover">
                  <button type="button" className="btn btn-ghost ds-force-hover">
                    Hover
                  </button>
                </Specimen>
              </StateRow>
            </ComponentDoc>

            <ComponentDoc
              id="icon-button"
              title="Icon Button"
              description="Compact 24×24 controls used in chat chrome and send."
              props={[
                "Kind = Icon | Send",
                "State = Default | Hover | Active | Disabled",
              ]}
            >
              <StateRow title="Icon">
                <Specimen state="State=Default">
                  <button type="button" className="chat-icon-btn" aria-label="Add">
                    <PlusIcon />
                  </button>
                </Specimen>
                <Specimen state="State=Hover">
                  <button
                    type="button"
                    className="chat-icon-btn ds-force-icon-hover"
                    aria-label="Add"
                  >
                    <PlusIcon />
                  </button>
                </Specimen>
                <Specimen state="State=Active">
                  <button type="button" className="chat-icon-btn active" aria-label="Add">
                    <PlusIcon />
                  </button>
                </Specimen>
                <Specimen state="State=Disabled">
                  <button type="button" className="chat-icon-btn" disabled aria-label="Add">
                    <PlusIcon />
                  </button>
                </Specimen>
                <Specimen state="State=Badge">
                  <button type="button" className="chat-icon-btn" aria-label="Context">
                    <PlusIcon />
                    <span className="chat-icon-badge">2</span>
                  </button>
                </Specimen>
              </StateRow>
              <StateRow title="Send">
                <Specimen state="State=Default">
                  <button type="button" className="chat-send-btn" aria-label="Send">
                    <SendIcon />
                  </button>
                </Specimen>
                <Specimen state="State=Disabled">
                  <button
                    type="button"
                    className="chat-send-btn"
                    disabled
                    aria-label="Send"
                  >
                    <SendIcon />
                  </button>
                </Specimen>
              </StateRow>
            </ComponentDoc>

            <ComponentDoc
              id="status-chip"
              title="Status Chip"
              description="Icon-only ticket status signal. 16×16 hit area, color-coded by status token."
              props={["Status = Idle | Running | Blocked | Failed | Succeeded"]}
            >
              <StateRow title="All statuses">
                {TICKET_STATUSES.map((status) => (
                  <Specimen key={status} state={`Status=${status}`}>
                    <div className="ds-chip-pair">
                      <StatusChip status={status} />
                      <span className="ds-chip-caption">{status}</span>
                    </div>
                  </Specimen>
                ))}
              </StateRow>
            </ComponentDoc>

            <ComponentDoc
              id="priority"
              title="Priority Icon"
              description="Linear-style signal bars for ticket priority."
              props={["Priority = High | Medium | Low"]}
            >
              <StateRow title="All priorities">
                {PRIORITIES.map((priority) => (
                  <Specimen key={priority} state={`Priority=${priority}`}>
                    <div className="ds-chip-pair">
                      <PriorityIcon priority={priority} />
                      <span className="ds-chip-caption">{priority}</span>
                    </div>
                  </Specimen>
                ))}
              </StateRow>
            </ComponentDoc>

            <ComponentDoc
              id="activity-status"
              title="Activity Status"
              description="Status glyph for timeline activity rows."
              props={["Status = Running | Done | Failed | Waiting"]}
            >
              <StateRow title="All statuses">
                {ACTIVITY_STATUSES.map((status) => (
                  <Specimen key={status} state={`Status=${status}`}>
                    <div className="ds-chip-pair">
                      <ActivityStatusIcon status={status} />
                      <span className="ds-chip-caption">{status}</span>
                    </div>
                  </Specimen>
                ))}
              </StateRow>
            </ComponentDoc>

            <ComponentDoc
              id="chips"
              title="Chips"
              description="Labeled pills for review decisions, util toggles, and context refs."
              props={[
                "Kind = Review | Util | Context",
                "Review = Todo | In progress | Approved | Changes requested | Merged",
                "Util = On | Off",
              ]}
            >
              <StateRow title="Review">
                {REVIEW_DECISIONS.map((decision) => (
                  <Specimen key={decision} state={`Review=${decision}`}>
                    <span className={`review-chip review-${decision}`}>
                      {REVIEW_LABELS[decision]}
                    </span>
                  </Specimen>
                ))}
              </StateRow>
              <StateRow title="Util">
                <Specimen state="Util=On">
                  <span className="util-chip on">Auto-commit</span>
                </Specimen>
                <Specimen state="Util=Default">
                  <span className="util-chip">Draft PRs</span>
                </Specimen>
                <Specimen state="Util=Off">
                  <span className="util-chip off">Browser tools</span>
                </Specimen>
              </StateRow>
              <StateRow title="Context">
                <Specimen state="Context=Default" wide>
                  <span className="context-chip">
                    <button type="button" className="context-chip-main" disabled>
                      <span className="context-chip-icon">#</span>
                      <span className="context-chip-label">refresh.ts</span>
                      <span className="context-chip-sublabel">src/auth</span>
                    </button>
                    <button type="button" className="context-chip-remove" aria-label="Remove">
                      ×
                    </button>
                  </span>
                </Specimen>
                <Specimen state="KindBadge=Blocked">
                  <span className="pending-decision-kind-badge">Choice</span>
                </Specimen>
                <Specimen state="SettingsBadge=Active">
                  <span className="settings-subtab-badge">Active</span>
                </Specimen>
              </StateRow>
            </ComponentDoc>

            <ComponentDoc
              id="tabs"
              title="Tabs &amp; Toggles"
              description="Segmented controls, lined tabs, and settings subtabs."
              props={[
                "Kind = ViewToggle | LinedTabs | SettingsSubtabs",
                "State = Default | Active | Disabled",
              ]}
            >
              <StateRow title="View toggle">
                <Specimen state="Kind=ViewToggle" wide>
                  <div className="view-toggle" role="tablist">
                    <button
                      type="button"
                      className={toggleDemo === "queue" ? "active" : undefined}
                      onClick={() => setToggleDemo("queue")}
                    >
                      Queue
                    </button>
                    <button
                      type="button"
                      className={toggleDemo === "review" ? "active" : undefined}
                      onClick={() => setToggleDemo("review")}
                    >
                      Review
                    </button>
                    <button type="button" disabled>
                      Disabled
                    </button>
                  </div>
                </Specimen>
              </StateRow>
              <StateRow title="Lined tabs">
                <Specimen state="Kind=LinedTabs" wide>
                  <div className="queue-lined-tabs" role="tablist">
                    <button
                      type="button"
                      className={linedTab === "open" ? "active" : undefined}
                      onClick={() => setLinedTab("open")}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className={linedTab === "done" ? "active" : undefined}
                      onClick={() => setLinedTab("done")}
                    >
                      Done
                    </button>
                  </div>
                </Specimen>
              </StateRow>
              <StateRow title="Settings subtabs">
                <Specimen state="Kind=SettingsSubtabs" wide>
                  <div className="settings-subtabs" role="tablist" style={{ marginBottom: 0 }}>
                    {(["a", "b", "c"] as const).map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={tabDemo === id ? "active" : undefined}
                        onClick={() => setTabDemo(id)}
                      >
                        {id === "a" ? "Policies" : id === "b" ? "Memory" : "Environments"}
                        {id === "a" ? (
                          <span className="settings-subtab-badge">Active</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </Specimen>
              </StateRow>
            </ComponentDoc>

            <ComponentDoc
              id="inputs"
              title="Inputs"
              description="Search, filter, and multiline decision fields."
              props={["Kind = Search | Filter | Textarea", "State = Default | Focus"]}
            >
              <StateRow title="Queue search">
                <Specimen state="Kind=Search" wide>
                  <div className="queue-search-field" style={{ width: 240 }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.5" />
                      <path
                        d="m10.5 10.5 3 3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <input
                      className="queue-search-input"
                      placeholder="Search tickets"
                      defaultValue=""
                    />
                  </div>
                </Specimen>
              </StateRow>
              <StateRow title="Filter + textarea">
                <Specimen state="Kind=Filter" wide>
                  <input
                    className="queue-filter-input"
                    placeholder="Filter by title"
                    defaultValue="token refresh"
                    style={{ width: 220 }}
                  />
                </Specimen>
                <Specimen state="Kind=Textarea" wide>
                  <textarea
                    className="pending-decision-input"
                    defaultValue="Keep the commit local and ping me when ready."
                    rows={3}
                    style={{ width: 280 }}
                  />
                </Specimen>
              </StateRow>
              <StateRow title="Checkbox">
                <Specimen state="State=Unchecked">
                  <label className="checkbox-row">
                    <input type="checkbox" />
                    Allow network
                  </label>
                </Specimen>
                <Specimen state="State=Checked">
                  <label className="checkbox-row">
                    <input type="checkbox" defaultChecked />
                    Allow network
                  </label>
                </Specimen>
              </StateRow>
            </ComponentDoc>

            <ComponentDoc
              id="meta-badge"
              title="Meta Badge"
              description="Ticket header metadata pills for priority, assignee, branch, and repo."
              props={["Tone = High | Medium | Low | Agent | Unassigned | Maya"]}
            >
              <StateRow title="Priority tones">
                <Specimen state="Tone=High">
                  <span className="ticket-meta-badge ticket-meta-badge-high">
                    <span className="ticket-meta-badge-icon">
                      <PriorityIcon priority="high" />
                    </span>
                    <span className="ticket-meta-badge-label">High</span>
                  </span>
                </Specimen>
                <Specimen state="Tone=Medium">
                  <span className="ticket-meta-badge ticket-meta-badge-medium">
                    <span className="ticket-meta-badge-icon">
                      <PriorityIcon priority="medium" />
                    </span>
                    <span className="ticket-meta-badge-label">Medium</span>
                  </span>
                </Specimen>
                <Specimen state="Tone=Low">
                  <span className="ticket-meta-badge ticket-meta-badge-low">
                    <span className="ticket-meta-badge-icon">
                      <PriorityIcon priority="low" />
                    </span>
                    <span className="ticket-meta-badge-label">Low</span>
                  </span>
                </Specimen>
              </StateRow>
              <StateRow title="Assignee &amp; mono">
                <Specimen state="Tone=Agent">
                  <span className="ticket-meta-badge ticket-meta-badge-agent">
                    <span className="ticket-meta-badge-label">Agent</span>
                  </span>
                </Specimen>
                <Specimen state="Tone=Maya">
                  <span className="ticket-meta-badge ticket-meta-badge-maya">
                    <span className="ticket-meta-badge-label">Maya</span>
                  </span>
                </Specimen>
                <Specimen state="Tone=Unassigned">
                  <span className="ticket-meta-badge ticket-meta-badge-unassigned">
                    <span className="ticket-meta-badge-label">Unassigned</span>
                  </span>
                </Specimen>
                <Specimen state="Kind=Branch" wide>
                  <span className="ticket-meta-badge">
                    <span className="mono ticket-meta-badge-label">
                      fix/token-refresh-race
                    </span>
                  </span>
                </Specimen>
              </StateRow>
            </ComponentDoc>

            <ComponentDoc
              id="ticket-item"
              title="Ticket Item"
              description="Queue row: id, title, priority, and status. Default vs selected."
              props={["State = Default | Hover | Active"]}
            >
              <StateRow title="States">
                <Specimen state="State=Default" wide>
                  <button type="button" className="ticket-item">
                    <div className="ticket-item-main">
                      <div className="ticket-item-top">
                        <span className="ticket-id">ACM-214</span>
                      </div>
                      <p className="ticket-title">Fix silent token refresh race</p>
                    </div>
                    <span className="ticket-item-icons">
                      <PriorityIcon priority="high" />
                      <StatusChip status="blocked" />
                    </span>
                  </button>
                </Specimen>
                <Specimen state="State=Hover" wide>
                  <button type="button" className="ticket-item ds-force-ticket-hover">
                    <div className="ticket-item-main">
                      <div className="ticket-item-top">
                        <span className="ticket-id">ACM-198</span>
                      </div>
                      <p className="ticket-title">CSV stream backpressure</p>
                    </div>
                    <span className="ticket-item-icons">
                      <PriorityIcon priority="medium" />
                      <StatusChip status="running" />
                    </span>
                  </button>
                </Specimen>
                <Specimen state="State=Active" wide>
                  <button type="button" className="ticket-item active">
                    <div className="ticket-item-main">
                      <div className="ticket-item-top">
                        <span className="ticket-id">ACM-201</span>
                      </div>
                      <p className="ticket-title">Stabilize deploy health checks</p>
                    </div>
                    <span className="ticket-item-icons">
                      <PriorityIcon priority="low" />
                      <StatusChip status="succeeded" />
                    </span>
                  </button>
                </Specimen>
              </StateRow>
            </ComponentDoc>

            <ComponentDoc
              id="activity-item"
              title="Activity Item"
              description="Timeline action row with kind icon + status. All activity kinds shown in done state."
              props={[
                "Kind = Plan | Search | Read | Edit | Lint | Terminal | Test | Verify | Form | Git | Ask",
                "Status = Running | Done | Failed | Waiting",
              ]}
            >
              <StateRow title="Kinds (Status=Done)">
                {ACTIVITY_KINDS.map((kind) => (
                  <Specimen key={kind} state={`Kind=${kind}`} wide>
                    <ActivityItem
                      item={{
                        id: `ds-act-${kind}`,
                        type: "activity",
                        kind,
                        title: `${kind.charAt(0).toUpperCase()}${kind.slice(1)} step`,
                        detail: `Example ${kind} activity`,
                        status: "done",
                      }}
                    />
                  </Specimen>
                ))}
              </StateRow>
              <StateRow title="Status matrix (Kind=Edit)">
                {ACTIVITY_STATUSES.map((status) => (
                  <Specimen key={status} state={`Status=${status}`} wide>
                    <ActivityItem
                      item={{
                        id: `ds-act-status-${status}`,
                        type: "activity",
                        kind: "edit",
                        title: `Edit · ${status}`,
                        detail: `Status specimen · ${status}`,
                        status,
                      }}
                    />
                  </Specimen>
                ))}
              </StateRow>
            </ComponentDoc>

            <ComponentDoc
              id="pending-decision"
              title="Pending Decision"
              description="Blocking agent card. Full and compact variants across decision kinds."
              props={[
                "Kind = Choice | Clarification | Approval | Review",
                "Variant = Full | Compact",
              ]}
            >
              {(
                Object.keys(DEMO_DECISIONS) as PendingDecision["kind"][]
              ).map((kind) => (
                <StateRow key={kind} title={`Kind=${kind}`}>
                  <Specimen state={`Kind=${kind}, Variant=Full`} wide>
                    <div style={{ maxWidth: 420 }}>
                      <PendingDecisionCard
                        decision={DEMO_DECISIONS[kind]}
                        onSubmit={() => undefined}
                        onSnooze={() => undefined}
                        onStop={() => undefined}
                      />
                    </div>
                  </Specimen>
                  <Specimen state={`Kind=${kind}, Variant=Compact`} wide>
                    <PendingDecisionCard
                      decision={DEMO_DECISIONS[kind]}
                      variant="compact"
                      onSubmit={() => undefined}
                    />
                  </Specimen>
                </StateRow>
              ))}
            </ComponentDoc>

            <ComponentDoc
              id="diff"
              title="Diff Tokens"
              description="Add / delete / hunk colors. Palette can be switched via the bottom-left diff control."
              props={["Tone = Add | Delete | Hunk"]}
            >
              <StateRow title="Current palette">
                <Specimen state="Tone=Add">
                  <div className="ds-diff-sample add">
                    <span className="chat-result-diff-add">+12</span>
                    <span className="mono">--diff-add</span>
                  </div>
                </Specimen>
                <Specimen state="Tone=Delete">
                  <div className="ds-diff-sample del">
                    <span className="chat-result-diff-del">−4</span>
                    <span className="mono">--diff-del</span>
                  </div>
                </Specimen>
                <Specimen state="Tone=Hunk" wide>
                  <div className="ds-diff-sample hunk mono">
                    @@ −40,8 +40,18 @@
                  </div>
                </Specimen>
              </StateRow>
            </ComponentDoc>
          </div>
        </div>
      </div>
    </main>
  );
}

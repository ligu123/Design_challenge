import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type {
  AgentConfig,
  Evidence,
  ModelEffort,
  Ticket,
  TimelineItem,
} from "../types";
import { ActivityItem } from "./ActivityItem";
import { ResultItem } from "./ResultItem";
import { PerformanceSummary } from "./PerformanceSummary";

const MODELS = [
  { id: "claude-sonnet", label: "claude-sonnet" },
  { id: "claude-opus", label: "claude-opus" },
  { id: "gpt-4.1", label: "gpt-4.1" },
  { id: "o3-mini", label: "o3-mini" },
] as const;

const EFFORTS: { id: ModelEffort; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Med" },
  { id: "high", label: "High" },
];

interface ChatSession {
  id: string;
  title: string;
  ticketId: string | null;
  updatedAt: number;
}

interface ChatPanelProps {
  tickets: Ticket[];
  ticket: Ticket | null;
  selectedEvidenceId?: string | null;
  config: AgentConfig;
  onConfigChange: (config: AgentConfig) => void;
  onSelectEvidence: (evidenceId: string | null) => void;
  onSelectTicket?: (ticketId: string) => void;
  onAnswerBlocked: (answer: string) => void;
}

function chatTitleForTicket(ticket: Ticket) {
  return ticket.title;
}

function makeSession(partial: Omit<ChatSession, "updatedAt">): ChatSession {
  return { ...partial, updatedAt: Date.now() };
}

type TimelineGroup =
  | { type: "message"; item: Extract<TimelineItem, { type: "message" }> }
  | {
      type: "step";
      activity: Extract<TimelineItem, { type: "activity" }>;
      results: Extract<TimelineItem, { type: "result" }>[];
    }
  | {
      type: "orphan-result";
      item: Extract<TimelineItem, { type: "result" }>;
    };

function groupTimeline(timeline: TimelineItem[]): TimelineGroup[] {
  const groups: TimelineGroup[] = [];
  for (const item of timeline) {
    if (item.type === "message") {
      groups.push({ type: "message", item });
      continue;
    }
    if (item.type === "activity") {
      groups.push({ type: "step", activity: item, results: [] });
      continue;
    }
    const last = groups[groups.length - 1];
    if (last?.type === "step") {
      last.results.push(item);
    } else {
      groups.push({ type: "orphan-result", item });
    }
  }
  return groups;
}

/** Search/read detail already lives on the activity row — no result card. */
function showsResultCard(evidence: Evidence) {
  return evidence.kind !== "search" && evidence.kind !== "file";
}

function seedSessions(tickets: Ticket[], selectedId: string | null) {
  const withRuns = tickets.filter(
    (t) => t.run.timeline.length > 0 || t.status !== "idle",
  );
  const primary =
    tickets.find((t) => t.id === selectedId) ?? withRuns[0] ?? tickets[0];

  const sessions: ChatSession[] = [];
  if (primary) {
    sessions.push(
      makeSession({
        id: `chat-${primary.id}`,
        title: chatTitleForTicket(primary),
        ticketId: primary.id,
      }),
    );
  }

  for (const t of withRuns) {
    if (t.id === primary?.id) continue;
    if (sessions.length >= 4) break;
    sessions.push(
      makeSession({
        id: `chat-${t.id}`,
        title: chatTitleForTicket(t),
        ticketId: t.id,
      }),
    );
  }

  if (sessions.length === 0) {
    const blank = makeSession({
      id: `chat-new-${Date.now()}`,
      title: "New chat",
      ticketId: null,
    });
    return { sessions: [blank], openIds: [blank.id], activeId: blank.id };
  }

  const openIds = sessions.slice(0, 2).map((s) => s.id);
  return { sessions, openIds, activeId: openIds[0] };
}

function formatDuration(ms: number) {
  if (ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(sec < 10 ? 1 : 0)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

export function ChatPanel({
  tickets,
  ticket,
  selectedEvidenceId = null,
  config,
  onConfigChange,
  onSelectEvidence,
  onSelectTicket,
  onAnswerBlocked,
}: ChatPanelProps) {
  const streamRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const seeded = useMemo(
    () => seedSessions(tickets, ticket?.id ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [sessions, setSessions] = useState<ChatSession[]>(seeded.sessions);
  const [openIds, setOpenIds] = useState<string[]>(seeded.openIds);
  const [activeChatId, setActiveChatId] = useState(seeded.activeId);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<
    { id: string; name: string; size: number }[]
  >([]);
  const [composerPanel, setComposerPanel] = useState<
    "pr" | "commit" | "usage" | null
  >(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const activeSession =
    sessions.find((s) => s.id === activeChatId) ?? sessions[0] ?? null;

  const activeTicket = useMemo(() => {
    if (!activeSession?.ticketId) return null;
    return tickets.find((t) => t.id === activeSession.ticketId) ?? null;
  }, [activeSession, tickets]);

  const viewTicket =
    ticket && activeSession?.ticketId === ticket.id ? ticket : activeTicket;

  const timeline = viewTicket?.run.timeline ?? [];
  const blocked =
    viewTicket?.status === "blocked"
      ? viewTicket.run.blockedQuestion
      : undefined;

  const runStats = useMemo(() => {
    if (!viewTicket || viewTicket.status === "idle") return null;
    const activities = timeline.filter((i) => i.type === "activity");
    const timeMs = activities.reduce((sum, a) => {
      if (a.type !== "activity") return sum;
      return sum + (a.durationMs ?? 0);
    }, 0);
    const tokensFromSteps = activities.reduce((sum, a) => {
      if (a.type !== "activity") return sum;
      return sum + (a.tokens ?? 0);
    }, 0);
    const tokens = viewTicket.run.performance?.tokens ?? tokensFromSteps;
    const timeSec = viewTicket.run.performance?.timeSec;
    const elapsedMs = timeSec != null ? timeSec * 1000 : timeMs;
    return {
      elapsedMs,
      tokens,
      filesChanged: viewTicket.run.filesChanged,
      costUsd: viewTicket.run.performance?.costUsd,
    };
  }, [viewTicket, timeline]);

  const openSessions = openIds
    .map((id) => sessions.find((s) => s.id === id))
    .filter((s): s is ChatSession => Boolean(s));

  const historySessions = [...sessions].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );

  const focusChat = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    setOpenIds((prev) =>
      prev.includes(sessionId) ? prev : [...prev, sessionId],
    );
    setActiveChatId(sessionId);
    setHistoryOpen(false);
    setComposerPanel(null);
    setModelMenuOpen(false);
    setDraft("");
    setAttachments([]);
    if (session.ticketId && onSelectTicket) onSelectTicket(session.ticketId);
  };

  const createChat = () => {
    const session = makeSession({
      id: `chat-new-${Date.now()}`,
      title: "New chat",
      ticketId: null,
    });
    setSessions((prev) => [session, ...prev]);
    setOpenIds((prev) => [...prev, session.id]);
    setActiveChatId(session.id);
    setHistoryOpen(false);
    setDraft("");
    setAttachments([]);
  };

  const closeChat = (sessionId: string, e?: MouseEvent) => {
    e?.stopPropagation();
    const remaining = openIds.filter((id) => id !== sessionId);
    setOpenIds(remaining);
    if (activeChatId === sessionId) {
      const nextId = remaining[remaining.length - 1];
      if (nextId) focusChat(nextId);
      else {
        const session = makeSession({
          id: `chat-new-${Date.now()}`,
          title: "New chat",
          ticketId: null,
        });
        setSessions((prev) => [session, ...prev]);
        setOpenIds([session.id]);
        setActiveChatId(session.id);
      }
    }
  };

  useEffect(() => {
    if (!ticket) return;
    const id = `chat-${ticket.id}`;
    setSessions((prev) => {
      const existing = prev.find((s) => s.ticketId === ticket.id || s.id === id);
      if (existing) {
        return prev.map((s) =>
          s.id === existing.id
            ? { ...s, title: chatTitleForTicket(ticket), updatedAt: Date.now() }
            : s,
        );
      }
      return [
        makeSession({
          id,
          title: chatTitleForTicket(ticket),
          ticketId: ticket.id,
        }),
        ...prev,
      ];
    });
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveChatId(id);
  }, [ticket?.id]);

  useEffect(() => {
    const el = streamRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [
    timeline.length,
    viewTicket?.id,
    viewTicket?.status,
    selectedEvidenceId,
    activeChatId,
  ]);

  useEffect(() => {
    setAnswer("");
    setDraft("");
    setAttachments([]);
    setComposerPanel(null);
    setModelMenuOpen(false);
  }, [activeChatId]);

  useEffect(() => {
    if (!modelMenuOpen && !historyOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        modelMenuRef.current &&
        !modelMenuRef.current.contains(e.target as Node)
      ) {
        setModelMenuOpen(false);
      }
      if (
        historyRef.current &&
        !historyRef.current.contains(e.target as Node)
      ) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [modelMenuOpen, historyOpen]);

  const delivery = viewTicket?.delivery;

  const togglePanel = (panel: typeof composerPanel) => {
    setComposerPanel((prev) => (prev === panel ? null : panel));
    setModelMenuOpen(false);
  };

  const effortLabel =
    EFFORTS.find((e) => e.id === config.effort)?.label ?? config.effort;

  const prLabel = (() => {
    if (!delivery || delivery.prStatus === "none" || delivery.prNumber == null) {
      return "No PR";
    }
    return `PR #${delivery.prNumber}`;
  })();

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next = Array.from(files).map((f) => ({
      id: `${f.name}-${f.size}-${f.lastModified}`,
      name: f.name,
      size: f.size,
    }));
    setAttachments((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...next.filter((n) => !seen.has(n.id))];
    });
  };

  return (
    <aside className="chat-panel">
      <div className="chat-tabs-bar">
        <div className="chat-tabs" role="tablist" aria-label="Chats">
          {openSessions.map((session) => {
            const linked = session.ticketId
              ? tickets.find((t) => t.id === session.ticketId)
              : null;
            const tabTitle = linked
              ? `${linked.key} · ${session.title}`
              : session.title;
            return (
            <div
              key={session.id}
              className={`chat-tab${session.id === activeChatId ? " active" : ""}`}
            >
              <button
                type="button"
                role="tab"
                className="chat-tab-main"
                aria-selected={session.id === activeChatId}
                title={tabTitle}
                onClick={() => focusChat(session.id)}
              >
                {session.title}
              </button>
              <button
                type="button"
                className="chat-tab-close"
                aria-label={`Close ${session.title}`}
                onClick={(e) => closeChat(session.id, e)}
              >
                ×
              </button>
            </div>
            );
          })}
        </div>

        <button
          type="button"
          className="chat-icon-btn chat-new-btn"
          title="New chat"
          aria-label="New chat"
          onClick={createChat}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="chat-history-wrap" ref={historyRef}>
          <button
            type="button"
            className={`chat-icon-btn chat-history-btn${historyOpen ? " active" : ""}`}
            title="Chat history"
            aria-label="Chat history"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((open) => !open)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3.5 12a8.5 8.5 0 1 0 2.4-5.9"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              <path
                d="M3.5 5.5v4.2h4.2"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 8.5V12l2.6 1.6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {historyOpen && (
            <div className="chat-history-popover" role="menu">
              <div className="chat-history-head">History</div>
              {historySessions.length === 0 ? (
                <p className="chat-history-empty">No chats yet.</p>
              ) : (
                <ul className="chat-history-list">
                  {historySessions.map((session) => {
                    const linked = session.ticketId
                      ? tickets.find((t) => t.id === session.ticketId)
                      : null;
                    return (
                      <li key={session.id}>
                        <button
                          type="button"
                          role="menuitem"
                          className={
                            session.id === activeChatId
                              ? "chat-history-item active"
                              : "chat-history-item"
                          }
                          onClick={() => focusChat(session.id)}
                        >
                          <span className="chat-history-title">
                            {session.title}
                          </span>
                          <span className="chat-history-sub">
                            {linked
                              ? linked.key
                              : session.ticketId
                                ? "Ticket chat"
                                : "Empty chat"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="chat-stream" ref={streamRef}>
        {!viewTicket && (
          <div className="chat-empty">
            Start a conversation, or open a ticket chat from history.
          </div>
        )}
        {viewTicket && timeline.length === 0 && (
          <div className="chat-empty">
            {viewTicket.status === "idle"
              ? "No agent activity yet. Resolve the ticket to begin."
              : "No agent activity yet."}
          </div>
        )}
        {groupTimeline(timeline).map((group) => {
          if (group.type === "message") {
            const item = group.item;
            return (
              <div key={item.id} className={`message message-${item.role}`}>
                <div className="message-body">{item.content}</div>
              </div>
            );
          }

          if (group.type === "orphan-result") {
            const evidence = viewTicket?.run.evidence.find(
              (e) => e.id === group.item.evidenceId,
            );
            if (!evidence || !showsResultCard(evidence)) return null;
            return (
              <ResultItem
                key={group.item.id}
                evidence={evidence}
                selected={selectedEvidenceId === evidence.id}
                onSelect={() => onSelectEvidence(evidence.id)}
              />
            );
          }

          return (
            <div key={group.activity.id} className="activity-step">
              <ActivityItem item={group.activity} />
              {group.results.map((result) => {
                const evidence = viewTicket?.run.evidence.find(
                  (e) => e.id === result.evidenceId,
                );
                if (!evidence || !showsResultCard(evidence)) return null;
                return (
                  <ResultItem
                    key={result.id}
                    evidence={evidence}
                    selected={selectedEvidenceId === evidence.id}
                    onSelect={() => onSelectEvidence(evidence.id)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {viewTicket?.status === "succeeded" && viewTicket.run.performance && (
        <PerformanceSummary metrics={viewTicket.run.performance} />
      )}

      {blocked && (
        <div className="blocked-prompt">
          <p>
            <strong>Waiting on you.</strong> {blocked}
          </p>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer…"
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!answer.trim()}
            onClick={() => {
              onAnswerBlocked(answer.trim());
              setAnswer("");
            }}
          >
            Reply to agent
          </button>
        </div>
      )}

      <div className="chat-composer-wrap">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {viewTicket && composerPanel && (
          <div className="chat-hover-card" aria-live="polite">
            {composerPanel === "pr" && delivery && (
              <>
                <div className="chat-hover-card-head">
                  <span>Pull request</span>
                  <span className={`pr-chip pr-${delivery.prStatus}`}>
                    {delivery.prStatus === "none" ? "none" : delivery.prStatus}
                  </span>
                </div>
                {delivery.prNumber != null ? (
                  <>
                    <p className="chat-hover-card-title mono">
                      #{delivery.prNumber}
                    </p>
                    <p className="chat-hover-card-body">{viewTicket.title}</p>
                    <p className="chat-hover-card-meta mono">{viewTicket.branch}</p>
                  </>
                ) : (
                  <p className="chat-hover-card-body">
                    No pull request yet. Open a draft when changes land.
                  </p>
                )}
              </>
            )}

            {composerPanel === "commit" && delivery && (
              <>
                <div className="chat-hover-card-head">
                  <span>Commit</span>
                </div>
                {delivery.commitSha ? (
                  <>
                    <p className="chat-hover-card-title mono">
                      {delivery.commitSha}
                    </p>
                    <p className="chat-hover-card-body">
                      {delivery.commitMessage}
                    </p>
                    <p className="chat-hover-card-meta mono">{viewTicket.branch}</p>
                  </>
                ) : (
                  <p className="chat-hover-card-body">No commits yet.</p>
                )}
              </>
            )}

            {composerPanel === "usage" && runStats && (
              <>
                <div className="chat-hover-card-head">
                  <span>Usage</span>
                  {runStats.costUsd != null && (
                    <span className="mono">${runStats.costUsd.toFixed(2)}</span>
                  )}
                </div>
                <div className="chat-usage-grid">
                  <div>
                    <em>Time</em>
                    <strong>{formatDuration(runStats.elapsedMs)}</strong>
                  </div>
                  <div>
                    <em>Tokens</em>
                    <strong>{runStats.tokens.toLocaleString()}</strong>
                  </div>
                  <div>
                    <em>Files</em>
                    <strong>{runStats.filesChanged.length}</strong>
                  </div>
                </div>
                {runStats.filesChanged.length > 0 && (
                  <ul className="chat-usage-files">
                    {runStats.filesChanged.map((path) => (
                      <li key={path} className="mono">
                        {path}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        <div className="chat-composer-shell">
          {attachments.length > 0 && (
            <ul className="chat-attachments">
              {attachments.map((file) => (
                <li key={file.id}>
                  <span className="mono">{file.name}</span>
                  <button
                    type="button"
                    className="chat-attach-remove"
                    aria-label={`Remove ${file.name}`}
                    onClick={() =>
                      setAttachments((prev) =>
                        prev.filter((f) => f.id !== file.id),
                      )
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <textarea
            className="chat-composer-field"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message agent"
            disabled={!viewTicket || viewTicket.status === "idle"}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                (draft.trim() || attachments.length)
              ) {
                e.preventDefault();
                setDraft("");
                setAttachments([]);
              }
            }}
          />

          <div className="chat-composer-toolbar">
            <div className="chat-composer-tools">
              <button
                type="button"
                className="chat-icon-btn"
                title="Attach files"
                aria-label="Attach files"
                disabled={!viewTicket}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <div className="chat-model-menu" ref={modelMenuRef}>
                <button
                  type="button"
                  className={`chat-model-trigger${modelMenuOpen ? " open" : ""}`}
                  aria-haspopup="menu"
                  aria-expanded={modelMenuOpen}
                  aria-label="Model and effort"
                  onClick={() => {
                    setModelMenuOpen((open) => !open);
                    setComposerPanel(null);
                  }}
                >
                  <span className="mono">{config.model}</span>
                  <span className="chat-model-effort">{effortLabel}</span>
                </button>
                {modelMenuOpen && (
                  <div className="chat-model-popover" role="menu">
                    <div className="chat-model-section">
                      <div className="chat-model-section-label">Model</div>
                      {MODELS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={config.model === m.id}
                          className={
                            config.model === m.id
                              ? "chat-model-option active"
                              : "chat-model-option"
                          }
                          onClick={() =>
                            onConfigChange({ ...config, model: m.id })
                          }
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <div className="chat-model-section">
                      <div className="chat-model-section-label">Effort</div>
                      <div className="chat-effort-row" role="group" aria-label="Effort">
                        {EFFORTS.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            role="menuitemradio"
                            aria-checked={config.effort === e.id}
                            className={
                              config.effort === e.id
                                ? "chat-effort-option active"
                                : "chat-effort-option"
                            }
                            onClick={() =>
                              onConfigChange({
                                ...config,
                                effort: e.id,
                              })
                            }
                          >
                            {e.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="chat-composer-tools">
              {viewTicket && (
                <>
                  <button
                    type="button"
                    className={`chat-icon-btn${composerPanel === "pr" ? " active" : ""}`}
                    title={
                      delivery?.prStatus === "none"
                        ? "No pull request"
                        : `${prLabel} · ${delivery?.prStatus}`
                    }
                    aria-label="Pull request"
                    onClick={() => togglePanel("pr")}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle cx="6" cy="6" r="2.25" stroke="currentColor" strokeWidth="1.75" />
                      <circle cx="6" cy="18" r="2.25" stroke="currentColor" strokeWidth="1.75" />
                      <circle cx="18" cy="18" r="2.25" stroke="currentColor" strokeWidth="1.75" />
                      <path
                        d="M6 8.25v7.5M8.25 18H15.75a2.25 2.25 0 0 0 2.25-2.25V9"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className={`chat-icon-btn${composerPanel === "commit" ? " active" : ""}`}
                    title={delivery?.commitMessage ?? "No commit"}
                    aria-label="Commit"
                    onClick={() => togglePanel("commit")}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
                      <path
                        d="M12 3v6M12 15v6"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </>
              )}

              {runStats && (
                <button
                  type="button"
                  className={`chat-icon-btn${composerPanel === "usage" ? " active" : ""}`}
                  title="Usage"
                  aria-label="Usage"
                  onClick={() => togglePanel("usage")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M4 19V5M4 19h16"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8 15v-3M12 15V8M16 15v-5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}

              <button
                type="button"
                className="chat-send-btn"
                aria-label="Send"
                disabled={!draft.trim() && attachments.length === 0}
                onClick={() => {
                  setDraft("");
                  setAttachments([]);
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 19V5M6.5 10.5 12 5l5.5 5.5"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

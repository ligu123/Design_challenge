import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type {
  AgentConfig,
  ContextRef,
  Evidence,
  ModelEffort,
  Ticket,
  TimelineItem,
} from "../types";
import {
  buildContextPickerData,
  getMentionState,
  toContextRef,
  type ContextCategoryId,
  type ContextPickerItem,
} from "../lib/contextPicker";
import { ActivityItem } from "./ActivityItem";
import { ContextPicker } from "./chat/ContextPicker";
import { ResultItem } from "./ResultItem";
import { PendingDecisionCard } from "./PendingDecisionCard";
import { getPendingDecision } from "../lib/pendingDecision";

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
  onAnswerBlocked: (answer: string, optionId?: string) => void;
  onSendMessage: (payload: {
    text: string;
    attachments: { id: string; name: string; size: number }[];
    contextRefs: ContextRef[];
  }) => void;
  onOpenPullRequestTab?: () => void;
}

const COMPOSER_PLACEHOLDER =
  "Message the agent, @ to attach files, docs, or evidence.";

function contextRefIcon(kind: ContextRef["kind"]) {
  switch (kind) {
    case "file":
    case "folder":
    case "evidence":
      return "#";
    case "doc":
      return "Doc";
    case "terminal":
      return ">";
    case "past-chat":
      return "~";
    case "branch-diff":
      return "⎇";
    case "browser":
      return "Web";
    case "ticket":
      return "T";
    default:
      return "@";
  }
}

function ContextRefChip({
  ref: ctx,
  onRemove,
  onClick,
}: {
  ref: ContextRef;
  onRemove?: () => void;
  onClick?: () => void;
}) {
  return (
    <span className={`context-chip context-chip-${ctx.kind}`}>
      <button
        type="button"
        className="context-chip-main"
        onClick={onClick}
        disabled={!onClick}
        title={ctx.sublabel ?? ctx.label}
      >
        <span className="context-chip-icon">{contextRefIcon(ctx.kind)}</span>
        <span className="context-chip-label">{ctx.label}</span>
        {ctx.sublabel && ctx.kind !== "file" && (
          <span className="context-chip-sublabel">{ctx.sublabel}</span>
        )}
      </button>
      {onRemove && (
        <button
          type="button"
          className="context-chip-remove"
          aria-label={`Remove ${ctx.label}`}
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </span>
  );
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

interface TicketChatState {
  sessions: ChatSession[];
  openIds: string[];
  activeId: string;
}

function initialChatStateForTicket(t: Ticket): TicketChatState {
  const sessionId = `chat-${t.id}-default`;
  const session = makeSession({
    id: sessionId,
    title: chatTitleForTicket(t),
    ticketId: t.id,
  });
  return {
    sessions: [session],
    openIds: [sessionId],
    activeId: sessionId,
  };
}

function seedTicketChats(
  tickets: Ticket[],
  selectedId: string | null,
): Record<string, TicketChatState> {
  const map: Record<string, TicketChatState> = {};
  for (const t of tickets) {
    if (
      t.id === selectedId ||
      t.run.timeline.length > 0 ||
      t.status !== "idle"
    ) {
      map[t.id] = initialChatStateForTicket(t);
    }
  }
  if (selectedId && !map[selectedId]) {
    const selected = tickets.find((t) => t.id === selectedId);
    if (selected) map[selectedId] = initialChatStateForTicket(selected);
  }
  return map;
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
  onAnswerBlocked,
  onSendMessage,
  onOpenPullRequestTab,
}: ChatPanelProps) {
  const streamRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [chatByTicket, setChatByTicket] = useState<
    Record<string, TicketChatState>
  >(() => seedTicketChats(tickets, ticket?.id ?? null));

  const currentChatState = ticket ? chatByTicket[ticket.id] : null;
  const sessions = currentChatState?.sessions ?? [];
  const openIds = currentChatState?.openIds ?? [];
  const activeChatId = currentChatState?.activeId ?? "";

  const patchTicketChat = (
    ticketId: string,
    updater: (state: TicketChatState) => TicketChatState,
  ) => {
    setChatByTicket((prev) => {
      const t = tickets.find((x) => x.id === ticketId);
      if (!t) return prev;
      const current = prev[ticketId] ?? initialChatStateForTicket(t);
      return { ...prev, [ticketId]: updater(current) };
    });
  };
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<
    { id: string; name: string; size: number }[]
  >([]);
  const [composerPanel, setComposerPanel] = useState<
    "pr" | "commit" | "usage" | null
  >(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const [contextRefs, setContextRefs] = useState<ContextRef[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [pickerCategory, setPickerCategory] = useState<ContextCategoryId | null>(
    null,
  );
  const [pickerHighlight, setPickerHighlight] = useState(0);

  const viewTicket = ticket;

  const timeline = viewTicket?.run.timeline ?? [];
  const pendingDecision = viewTicket
    ? getPendingDecision(viewTicket.run)
    : null;

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

  const pickerData = useMemo(
    () =>
      buildContextPickerData(
        viewTicket,
        sessions,
        activeChatId,
        mentionQuery,
      ),
    [viewTicket, sessions, activeChatId, mentionQuery],
  );

  const pickerRowCount = useMemo(() => {
    if (pickerCategory) {
      const cat = pickerData.categories.find((c) => c.id === pickerCategory);
      return cat?.items.length ?? 0;
    }
    const visibleCategories = pickerData.categories.filter(
      (c) => c.items.length > 0,
    );
    return pickerData.quickPicks.length + visibleCategories.length;
  }, [pickerData, pickerCategory]);

  const closeMentionPicker = () => {
    setMentionOpen(false);
    setMentionStart(null);
    setMentionQuery("");
    setPickerCategory(null);
    setPickerHighlight(0);
  };

  const syncMentionFromDraft = (text: string, cursor: number) => {
    const mention = getMentionState(text, cursor);
    if (mention) {
      setMentionOpen(true);
      setMentionStart(mention.start);
      setMentionQuery(mention.query);
      setPickerCategory(null);
      setPickerHighlight(0);
    } else {
      closeMentionPicker();
    }
  };

  const selectContextItem = (item: ContextPickerItem) => {
    const ref = toContextRef(item);
    setContextRefs((prev) =>
      prev.some((r) => r.id === ref.id) ? prev : [...prev, ref],
    );

    if (mentionStart != null) {
      const cursor = textareaRef.current?.selectionStart ?? draft.length;
      const before = draft.slice(0, mentionStart);
      const after = draft.slice(cursor);
      const nextDraft = before + after;
      setDraft(nextDraft);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = mentionStart;
          textareaRef.current.selectionEnd = mentionStart;
        }
      });
    }

    closeMentionPicker();
    textareaRef.current?.focus();
  };

  const handleDecisionContext = (ref: ContextRef) => {
    if (
      (ref.kind === "file" ||
        ref.kind === "evidence" ||
        ref.kind === "terminal") &&
      ref.refId
    ) {
      onSelectEvidence(ref.refId);
    }
  };

  const submitDecision = (answer: string, optionId?: string) => {
    onAnswerBlocked(answer, optionId);
  };

  const handleContextRefClick = (ctx: ContextRef) => {
    if (ctx.kind === "past-chat" && ctx.refId) {
      focusChat(ctx.refId);
      return;
    }
    if (
      (ctx.kind === "file" ||
        ctx.kind === "evidence" ||
        ctx.kind === "terminal") &&
      ctx.refId
    ) {
      onSelectEvidence(ctx.refId);
    }
  };

  const canSend =
    Boolean(draft.trim()) ||
    attachments.length > 0 ||
    contextRefs.length > 0;

  const sendMessage = () => {
    if (!canSend) return;
    onSendMessage({
      text: draft.trim(),
      attachments,
      contextRefs,
    });
    setDraft("");
    setAttachments([]);
    setContextRefs([]);
    closeMentionPicker();
  };

  const focusChat = (sessionId: string) => {
    if (!ticket) return;
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    patchTicketChat(ticket.id, (state) => ({
      ...state,
      openIds: state.openIds.includes(sessionId)
        ? state.openIds
        : [...state.openIds, sessionId],
      activeId: sessionId,
    }));
    setHistoryOpen(false);
    setComposerPanel(null);
    setModelMenuOpen(false);
    setDraft("");
    setAttachments([]);
    setContextRefs([]);
  };

  const createChat = () => {
    if (!ticket) return;
    const session = makeSession({
      id: `chat-${ticket.id}-${Date.now()}`,
      title: "New chat",
      ticketId: ticket.id,
    });
    patchTicketChat(ticket.id, (state) => ({
      sessions: [session, ...state.sessions],
      openIds: [...state.openIds, session.id],
      activeId: session.id,
    }));
    setHistoryOpen(false);
    setDraft("");
    setAttachments([]);
    setContextRefs([]);
  };

  const closeChat = (sessionId: string, e?: MouseEvent) => {
    e?.stopPropagation();
    if (!ticket) return;
    patchTicketChat(ticket.id, (state) => {
      const remaining = state.openIds.filter((id) => id !== sessionId);
      if (state.activeId !== sessionId) {
        return { ...state, openIds: remaining };
      }
      const nextId = remaining[remaining.length - 1];
      if (nextId) {
        return { ...state, openIds: remaining, activeId: nextId };
      }
      const session = makeSession({
        id: `chat-${ticket.id}-${Date.now()}`,
        title: chatTitleForTicket(ticket),
        ticketId: ticket.id,
      });
      return {
        sessions: [session, ...state.sessions],
        openIds: [session.id],
        activeId: session.id,
      };
    });
    if (activeChatId === sessionId) {
      setDraft("");
      setAttachments([]);
      setContextRefs([]);
    }
  };

  useEffect(() => {
    if (!ticket) return;
    setChatByTicket((prev) => {
      if (prev[ticket.id]) return prev;
      return { ...prev, [ticket.id]: initialChatStateForTicket(ticket) };
    });
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
    setDraft("");
    setAttachments([]);
    setContextRefs([]);
    closeMentionPicker();
    setComposerPanel(null);
    setModelMenuOpen(false);
  }, [activeChatId]);

  useEffect(() => {
    if (!modelMenuOpen && !historyOpen && !mentionOpen) return;
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
      if (
        mentionOpen &&
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        closeMentionPicker();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [modelMenuOpen, historyOpen, mentionOpen]);

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
          {openSessions.map((session) => (
            <div
              key={session.id}
              className={`chat-tab${session.id === activeChatId ? " active" : ""}`}
            >
              <button
                type="button"
                role="tab"
                className="chat-tab-main"
                aria-selected={session.id === activeChatId}
                title={session.title}
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
          ))}
        </div>

        <button
          type="button"
          className="chat-icon-btn chat-new-btn"
          title="New chat"
          aria-label="New chat"
          disabled={!ticket}
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
                  {historySessions.map((session) => (
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
                            {session.id === activeChatId
                              ? "Active"
                              : "Past chat"}
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="chat-stream" ref={streamRef}>
        {!viewTicket && (
          <div className="chat-empty">
            Select a ticket to view its agent chats.
          </div>
        )}
        {viewTicket && timeline.length === 0 && viewTicket.status === "idle" && (
          <div className="chat-welcome">
            <h2 className="chat-welcome-title">
              <span className="mono">{viewTicket.key}</span> is ready for the
              agent
            </h2>
            <p className="chat-welcome-body">
              The agent will investigate the codebase, implement against the
              acceptance criteria, and run tests. You&apos;ll review the diff and
              open a PR when it&apos;s done.
            </p>
          </div>
        )}
        {viewTicket &&
          timeline.length === 0 &&
          viewTicket.status !== "idle" && (
            <div className="chat-empty">No agent activity yet.</div>
          )}
        {groupTimeline(timeline).map((group) => {
          if (group.type === "message") {
            const item = group.item;
            return (
              <div key={item.id} className={`message message-${item.role}`}>
                {item.contextRefs && item.contextRefs.length > 0 && (
                  <div className="message-context-refs">
                    {item.contextRefs.map((ctx) => (
                      <ContextRefChip
                        key={ctx.id}
                        ref={ctx}
                        onClick={
                          item.role === "user"
                            ? () => handleContextRefClick(ctx)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}
                {item.content ? (
                  <div className="message-body">{item.content}</div>
                ) : null}
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

      {pendingDecision && viewTicket?.status === "blocked" && (
        <div className="pending-decision-wrap">
          <PendingDecisionCard
            decision={pendingDecision}
            stages={viewTicket.run.stages}
            onSubmit={submitDecision}
            onContextClick={handleDecisionContext}
          />
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

        <div className="chat-composer-shell" ref={composerRef}>
          {(attachments.length > 0 || contextRefs.length > 0) && (
            <div className="chat-composer-meta">
              {contextRefs.length > 0 && (
                <div className="context-chip-row">
                  {contextRefs.map((ctx) => (
                    <ContextRefChip
                      key={ctx.id}
                      ref={ctx}
                      onClick={() => handleContextRefClick(ctx)}
                      onRemove={() =>
                        setContextRefs((prev) =>
                          prev.filter((r) => r.id !== ctx.id),
                        )
                      }
                    />
                  ))}
                </div>
              )}
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
            </div>
          )}

          <div className="chat-composer-input-wrap">
            {mentionOpen && (
              <div className="context-picker-wrap" ref={pickerRef}>
                <ContextPicker
                  quickPicks={pickerData.quickPicks}
                  categories={pickerData.categories}
                  activeCategory={pickerCategory}
                  highlightIndex={pickerHighlight}
                  onSelectItem={selectContextItem}
                  onOpenCategory={(id) => {
                    setPickerCategory(id);
                    setPickerHighlight(0);
                  }}
                  onBack={() => {
                    setPickerCategory(null);
                    setPickerHighlight(0);
                  }}
                  onHighlightChange={setPickerHighlight}
                />
              </div>
            )}

            <textarea
              ref={textareaRef}
              className="chat-composer-field"
              rows={1}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                syncMentionFromDraft(
                  e.target.value,
                  e.target.selectionStart ?? e.target.value.length,
                );
              }}
              onClick={(e) => {
                const target = e.currentTarget;
                syncMentionFromDraft(
                  target.value,
                  target.selectionStart ?? target.value.length,
                );
              }}
              placeholder={COMPOSER_PLACEHOLDER}
              disabled={!viewTicket}
              onKeyDown={(e) => {
                if (mentionOpen && pickerRowCount > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setPickerHighlight((i) =>
                      i + 1 >= pickerRowCount ? 0 : i + 1,
                    );
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setPickerHighlight((i) =>
                      i - 1 < 0 ? pickerRowCount - 1 : i - 1,
                    );
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    if (pickerCategory) {
                      setPickerCategory(null);
                      setPickerHighlight(0);
                    } else {
                      closeMentionPicker();
                    }
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    if (pickerCategory) {
                      const cat = pickerData.categories.find(
                        (c) => c.id === pickerCategory,
                      );
                      const item = cat?.items[pickerHighlight];
                      if (item) selectContextItem(item);
                    } else {
                      const visibleCategories = pickerData.categories.filter(
                        (c) => c.items.length > 0,
                      );
                      if (pickerHighlight < pickerData.quickPicks.length) {
                        const item = pickerData.quickPicks[pickerHighlight];
                        if (item) selectContextItem(item);
                      } else {
                        const catIdx =
                          pickerHighlight - pickerData.quickPicks.length;
                        const cat = visibleCategories[catIdx];
                        if (cat) {
                          setPickerCategory(cat.id);
                          setPickerHighlight(0);
                        }
                      }
                    }
                    return;
                  }
                  if (e.key === "ArrowRight" && !pickerCategory) {
                    const visibleCategories = pickerData.categories.filter(
                      (c) => c.items.length > 0,
                    );
                    if (pickerHighlight >= pickerData.quickPicks.length) {
                      e.preventDefault();
                      const catIdx =
                        pickerHighlight - pickerData.quickPicks.length;
                      const cat = visibleCategories[catIdx];
                      if (cat) {
                        setPickerCategory(cat.id);
                        setPickerHighlight(0);
                      }
                    }
                    return;
                  }
                  if (e.key === "ArrowLeft" && pickerCategory) {
                    e.preventDefault();
                    setPickerCategory(null);
                    setPickerHighlight(0);
                    return;
                  }
                }

                if (e.key === "Enter" && !e.shiftKey && canSend) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
          </div>

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
                        ? "Pull request"
                        : `${prLabel} · ${delivery?.prStatus}`
                    }
                    aria-label="Pull request"
                    onClick={() => {
                      if (onOpenPullRequestTab) {
                        onOpenPullRequestTab();
                        setComposerPanel(null);
                      } else {
                        togglePanel("pr");
                      }
                    }}
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
                disabled={!canSend}
                onClick={sendMessage}
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

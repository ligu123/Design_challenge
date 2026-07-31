import { useMemo, useState, type CSSProperties } from "react";
import {
  blockedResolution,
  defaultConfig,
  idleStartScripts,
  initialTickets,
  policyPlaybooks,
} from "../data/mock";
import type {
  AgentConfig,
  CenterTab,
  ContextRef,
  PlaceId,
  PolicyPlaybook,
  PrCheck,
  ReviewDecision,
  Ticket,
} from "../types";
import { TopNav } from "./TopNav";
import { ChatPanel } from "./ChatPanel";
import { ColumnResizeHandle, useColumnWidths } from "./ColumnResize";
import { DesignSystemPage } from "./DesignSystemPage";
import { OpsPage } from "./OpsPage";
import { SettingsPage } from "./SettingsPage";
import { TicketDetail } from "./TicketDetail";
import { TicketQueue, ShowQueueIcon } from "./TicketQueue";
import { TypefaceSwitcher } from "./TypefaceSwitcher";
import { DiffColorSwitcher } from "./DiffColorSwitcher";

function cloneTickets(tickets: Ticket[]): Ticket[] {
  return structuredClone(tickets);
}

function preferDiffEvidence(ticket: Ticket): string | null {
  const lastDiffResult = [...ticket.run.timeline].reverse().find((i) => {
    if (i.type !== "result") return false;
    const evidence = ticket.run.evidence.find((e) => e.id === i.evidenceId);
    return evidence?.kind === "diff";
  });
  if (lastDiffResult && lastDiffResult.type === "result") {
    return lastDiffResult.evidenceId;
  }

  const lastResult = [...ticket.run.timeline]
    .reverse()
    .find((i) => i.type === "result");
  if (lastResult && lastResult.type === "result") {
    return lastResult.evidenceId;
  }

  const diffs = ticket.run.evidence.filter((e) => e.kind === "diff");
  return diffs[diffs.length - 1]?.id ?? null;
}


function nextPrNumber(tickets: Ticket[]) {
  const max = tickets.reduce(
    (n, t) => Math.max(n, t.delivery.prNumber ?? 0),
    0,
  );
  return max + 1;
}

function deriveChecksFromTicket(ticket: Ticket): PrCheck[] {
  const testEvidence = ticket.run.evidence.find((e) => e.kind === "tests");
  if (testEvidence?.kind === "tests") {
    const failed = testEvidence.results.filter((r) => !r.passed);
    return [
      {
        name: "csv.stream.test",
        status: failed.length ? "fail" : "pass",
        detail: failed.length
          ? failed.map((r) => r.name).join(", ")
          : "All scenarios passed",
      },
      {
        name: "lint",
        status: "pass",
      },
    ];
  }
  if (ticket.run.performance) {
    const { testsPassed, testsTotal } = ticket.run.performance;
    return [
      {
        name: "Tests",
        status: testsPassed === testsTotal ? "pass" : "fail",
        detail: `${testsPassed}/${testsTotal} passed`,
      },
    ];
  }
  return [];
}


export function AppShell() {
  const initialEvidence = preferDiffEvidence(initialTickets[0]);
  const [tickets, setTickets] = useState(() => cloneTickets(initialTickets));
  const [selectedId, setSelectedId] = useState<string>(initialTickets[0].id);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(
    initialEvidence ?? "ev-diff-1",
  );
  const [place, setPlace] = useState<PlaceId>("tickets");
  const [config, setConfig] = useState<AgentConfig>(defaultConfig);
  const [activePolicyId, setActivePolicyId] = useState("pol-safe");
  const [selectedPolicyId, setSelectedPolicyId] = useState("pol-safe");
  const [reviewDecisions, setReviewDecisions] = useState<
    Record<string, ReviewDecision>
  >({
    t4: "todo",
    t3: "todo",
  });
  const [starting, setStarting] = useState(false);
  const [centerTab, setCenterTab] = useState<CenterTab>("ticket");
  const [queueVisible, setQueueVisible] = useState(true);

  const ticket = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );
  const isSettings =
    place === "memory" || place === "environments" || place === "policies";
  const isDesignSystem = place === "design-system";
  const showChat = place === "tickets";
  const hasQueue = place === "tickets" && queueVisible;
  const { queueWidth, chatWidth, startQueueResize, startChatResize } =
    useColumnWidths({ hasQueue: place === "tickets" && queueVisible, hasChat: showChat });

  const selectTicket = (id: string) => {
    setSelectedId(id);
    setCenterTab("ticket");
    const next = tickets.find((t) => t.id === id);
    if (!next) {
      setSelectedEvidenceId(null);
      return;
    }
    if (
      next.status === "running" ||
      next.status === "failed" ||
      next.status === "succeeded" ||
      next.status === "blocked"
    ) {
      setSelectedEvidenceId(preferDiffEvidence(next));
    } else {
      setSelectedEvidenceId(null);
    }
  };

  const navigate = (next: PlaceId) => {
    setPlace(next);
  };

  const openTicketPlace = (id: string) => {
    selectTicket(id);
    setPlace("tickets");
  };

  const openRunPlace = (id: string) => {
    openTicketPlace(id);
  };

  const updateTicket = (id: string, updater: (t: Ticket) => Ticket) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
  };

  const startAgent = () => {
    if (!ticket || starting) return;
    const script = idleStartScripts[ticket.id];
    if (!script) {
      return;
    }

    setStarting(true);
    setSelectedEvidenceId(null);

    const full = structuredClone(script);
    const steps = full.timeline;
    const revealed: typeof steps = [];

    updateTicket(ticket.id, (t) => ({
      ...t,
      status: "running",
      assignee: "agent",
      run: {
        ...full,
        status: "running",
        timeline: [],
        performance: undefined,
      },
    }));

    let i = 0;
    const tick = () => {
      if (i >= steps.length) {
        updateTicket(ticket.id, (t) => ({
          ...t,
          status: "succeeded",
          run: {
            ...t.run,
            status: "succeeded",
            timeline: revealed,
            performance: full.performance,
            filesChanged: full.filesChanged,
            evidence: full.evidence,
            stages: full.stages,
          },
        }));
        setSelectedEvidenceId(
          preferDiffEvidence({
            ...ticket,
            run: { ...full, timeline: revealed },
          }),
        );
        setStarting(false);
        return;
      }

      revealed.push(steps[i]);
      const current = steps[i];
      updateTicket(ticket.id, (t) => ({
        ...t,
        status: "running",
        run: {
          ...t.run,
          status: "running",
          timeline: [...revealed],
          evidence: full.evidence,
          filesChanged: full.filesChanged,
          stages: full.stages,
        },
      }));

      if (current.type === "result") {
        setSelectedEvidenceId(current.evidenceId);
      }

      i += 1;
      window.setTimeout(tick, 550);
    };

    window.setTimeout(tick, 400);
  };

  const answerBlocked = (answer: string, _optionId?: string) => {
    if (!ticket) return;

    const baseTimeline = ticket.run.timeline.map((item) =>
      item.type === "activity" && item.kind === "ask"
        ? { ...item, status: "done" as const }
        : item,
    );

    const continuation = structuredClone(blockedResolution);
    const extra = continuation.timeline.filter(
      (i) =>
        !(i.type === "message" && i.role === "user") &&
        !(i.type === "activity" && i.kind === "ask"),
    );

    const mergedEvidence = [
      ...ticket.run.evidence,
      ...continuation.evidence.filter(
        (e) => !ticket.run.evidence.some((x) => x.id === e.id),
      ),
    ];

    updateTicket(ticket.id, (t) => ({
      ...t,
      status: "succeeded",
      run: {
        ...continuation,
        status: "succeeded",
        pendingDecision: undefined,
        blockedQuestion: undefined,
        timeline: [
          ...baseTimeline,
          {
            id: `ans-${Date.now()}`,
            type: "message",
            role: "user",
            content: answer,
          },
          ...extra,
        ],
        evidence: mergedEvidence,
        filesChanged: continuation.filesChanged.length
          ? continuation.filesChanged
          : t.run.filesChanged,
      },
    }));

    const preferred = preferDiffEvidence({
      ...ticket,
      run: {
        ...continuation,
        evidence: mergedEvidence,
        timeline: [...baseTimeline, ...extra],
      },
    });
    setSelectedEvidenceId(preferred);
  };

  const sendMessage = (payload: {
    text: string;
    attachments: { id: string; name: string; size: number }[];
    contextRefs: ContextRef[];
  }) => {
    if (!ticket) return;
    if (
      !payload.text &&
      payload.attachments.length === 0 &&
      payload.contextRefs.length === 0
    ) {
      return;
    }

    updateTicket(ticket.id, (t) => ({
      ...t,
      run: {
        ...t.run,
        timeline: [
          ...t.run.timeline,
          {
            id: `msg-${Date.now()}`,
            type: "message",
            role: "user",
            content: payload.text,
            contextRefs:
              payload.contextRefs.length > 0
                ? payload.contextRefs
                : undefined,
          },
        ],
      },
    }));

    const evidenceRef = payload.contextRefs.find(
      (ref) =>
        (ref.kind === "file" ||
          ref.kind === "evidence" ||
          ref.kind === "terminal") &&
        ref.refId,
    );
    if (evidenceRef?.refId) {
      setSelectedEvidenceId(evidenceRef.refId);
    }
  };

  const applyPolicy = (policy: PolicyPlaybook) => {
    setConfig(structuredClone(policy.config));
    setActivePolicyId(policy.id);
  };

  return (
    <div
      className={`app-shell${showChat ? "" : " app-shell-no-chat"}${
        place === "ops" || isSettings || isDesignSystem ? " app-shell-ops" : ""
      }${place === "tickets" && !queueVisible ? " app-shell-queue-collapsed" : ""}`}
      style={
        {
          "--queue-width": `${place === "tickets" && !queueVisible ? 0 : queueWidth}px`,
          "--chat-width": `${chatWidth}px`,
        } as CSSProperties
      }
    >
      <TopNav place={place} onNavigate={navigate} tickets={tickets} />

      {hasQueue && (
        <ColumnResizeHandle side="queue" onPointerDown={startQueueResize} />
      )}
      {showChat && (
        <ColumnResizeHandle side="chat" onPointerDown={startChatResize} />
      )}

      {place === "tickets" && (
        <>
          {queueVisible && (
            <TicketQueue
              tickets={tickets}
              selectedId={selectedId}
              onSelect={selectTicket}
              onHide={() => setQueueVisible(false)}
            />
          )}
          <main className="center">
            {!queueVisible && (
              <button
                type="button"
                className="queue-show-trigger"
                aria-label="Show ticket list"
                title="Show ticket list"
                onClick={() => setQueueVisible(true)}
              >
                <ShowQueueIcon />
              </button>
            )}
            <div className="center-body">
              {ticket ? (
                <TicketDetail
                  ticket={ticket}
                  selectedEvidenceId={selectedEvidenceId}
                  onSelectEvidence={(id) => {
                    setSelectedEvidenceId(id);
                    if (id && ticket) {
                      const ev = ticket.run.evidence.find((e) => e.id === id);
                      if (ev?.kind === "diff") setCenterTab("evidence");
                    }
                  }}
                  onStart={startAgent}
                  starting={starting}
                  decision={reviewDecisions[ticket.id] ?? "todo"}
                  onDecide={(d) =>
                    setReviewDecisions((prev) => ({
                      ...prev,
                      [ticket.id]: d,
                    }))
                  }
                  onChangePriority={(priority) =>
                    updateTicket(ticket.id, (t) => ({ ...t, priority }))
                  }
                  onChangeAssignee={(assignee) =>
                    updateTicket(ticket.id, (t) => ({ ...t, assignee }))
                  }
                  onAddComment={(body, parentId) =>
                    updateTicket(ticket.id, (t) => ({
                      ...t,
                      delivery: {
                        ...t.delivery,
                        comments: [
                          ...t.delivery.comments,
                          {
                            id: `c-${Date.now()}`,
                            author: "maya",
                            body,
                            createdAt: "just now",
                            ...(parentId ? { parentId } : {}),
                          },
                        ],
                      },
                    }))
                  }
                  onDeleteComment={(commentId) =>
                    updateTicket(ticket.id, (t) => ({
                      ...t,
                      delivery: {
                        ...t.delivery,
                        comments: t.delivery.comments.filter(
                          (c) => c.id !== commentId && c.parentId !== commentId,
                        ),
                      },
                    }))
                  }
                  centerTab={centerTab}
                  onCenterTabChange={setCenterTab}
                  onOpenPullRequest={({ title, body, asDraft }) =>
                    updateTicket(ticket.id, (t) => {
                      const number = nextPrNumber(tickets);
                      return {
                        ...t,
                        delivery: {
                          ...t.delivery,
                          prNumber: number,
                          prStatus: asDraft ? "draft" : "open",
                          prUrl: `#pr-${number}`,
                          prTitle: title,
                          prBody: body,
                          baseBranch: t.delivery.baseBranch ?? "main",
                          checks: deriveChecksFromTicket(t),
                          comments: asDraft
                            ? t.delivery.comments
                            : [
                                ...t.delivery.comments,
                                {
                                  id: `c-pr-${Date.now()}`,
                                  author: "maya",
                                  body: `Opened pull request #${number} for review.`,
                                  createdAt: "just now",
                                },
                              ],
                        },
                      };
                    })
                  }
                  onMarkReadyForReview={() =>
                    updateTicket(ticket.id, (t) => ({
                      ...t,
                      delivery: {
                        ...t.delivery,
                        prStatus: "open",
                        comments: [
                          ...t.delivery.comments,
                          {
                            id: `c-pr-${Date.now()}`,
                            author: "maya",
                            body: "Marked pull request ready for review.",
                            createdAt: "just now",
                          },
                        ],
                      },
                    }))
                  }
                />
              ) : (
                <p style={{ color: "var(--muted)" }}>
                  Select a ticket from the queue.
                </p>
              )}
            </div>
          </main>
        </>
      )}

      {place === "ops" && (
        <main className="center center-span">
          <div className="center-body">
            <OpsPage
              tickets={tickets}
              onOpenTicket={openTicketPlace}
              onOpenRun={openRunPlace}
            />
          </div>
        </main>
      )}

      {isDesignSystem && <DesignSystemPage />}

      {isSettings && (
        <SettingsPage
          place={place}
          onNavigate={navigate}
          policies={policyPlaybooks}
          selectedPolicyId={selectedPolicyId}
          activePolicyId={activePolicyId}
          onSelectPolicy={setSelectedPolicyId}
          onApplyPolicy={applyPolicy}
          config={config}
        />
      )}

      {showChat && (
        <ChatPanel
          tickets={tickets}
          ticket={ticket}
          selectedEvidenceId={selectedEvidenceId}
          config={config}
          onConfigChange={setConfig}
          onSelectEvidence={(id) => {
                    setSelectedEvidenceId(id);
                    if (id && ticket) {
                      const ev = ticket.run.evidence.find((e) => e.id === id);
                      if (ev?.kind === "diff") setCenterTab("evidence");
                    }
                  }}
          onAnswerBlocked={answerBlocked}
          onSendMessage={sendMessage}
          onOpenPullRequestTab={() => setCenterTab("pr")}
        />
      )}

      <div className="dev-controllers">
        <TypefaceSwitcher />
        <DiffColorSwitcher />
      </div>
    </div>
  );
}

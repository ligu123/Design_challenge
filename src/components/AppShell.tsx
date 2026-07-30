import { useMemo, useState, type CSSProperties } from "react";
import {
  blockedResolution,
  defaultConfig,
  environmentTargets,
  idleStartScripts,
  initialTickets,
  memoryItems,
  policyPlaybooks,
} from "../data/mock";
import type {
  AgentConfig,
  PlaceId,
  PolicyPlaybook,
  ReviewDecision,
  Ticket,
} from "../types";
import { TopNav } from "./TopNav";
import { ChatPanel } from "./ChatPanel";
import { ColumnResizeHandle, useColumnWidths } from "./ColumnResize";
import { EnvironmentsPage } from "./EnvironmentsPage";
import { MemoryPage } from "./MemoryPage";
import { OpsPage } from "./OpsPage";
import { PoliciesPage } from "./PoliciesPage";
import { TicketDetail } from "./TicketDetail";
import { TicketQueue } from "./TicketQueue";
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
    t4: "awaiting",
    t3: "awaiting",
  });
  const [memoryId, setMemoryId] = useState(memoryItems[0].id);
  const [envId, setEnvId] = useState(environmentTargets[0].id);
  const [starting, setStarting] = useState(false);

  const ticket = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );
  const showChat = place === "tickets";
  const hasQueue = place !== "ops";
  const { queueWidth, chatWidth, startQueueResize, startChatResize } =
    useColumnWidths({ hasQueue, hasChat: showChat });

  const selectTicket = (id: string) => {
    setSelectedId(id);
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

  const answerBlocked = (answer: string) => {
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

  const applyPolicy = (policy: PolicyPlaybook) => {
    setConfig(structuredClone(policy.config));
    setActivePolicyId(policy.id);
  };

  return (
    <div
      className={`app-shell${showChat ? "" : " app-shell-no-chat"}${
        place === "ops" ? " app-shell-ops" : ""
      }`}
      style={
        {
          "--queue-width": `${queueWidth}px`,
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
          <TicketQueue
            tickets={tickets}
            selectedId={selectedId}
            onSelect={selectTicket}
          />
          <main className="center">
            <div className="center-body">
              {ticket ? (
                <TicketDetail
                  ticket={ticket}
                  selectedEvidenceId={selectedEvidenceId}
                  onSelectEvidence={(id) => setSelectedEvidenceId(id)}
                  onStart={startAgent}
                  starting={starting}
                  decision={reviewDecisions[ticket.id] ?? "awaiting"}
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

      {place === "policies" && (
        <PoliciesPage
          policies={policyPlaybooks}
          selectedId={selectedPolicyId}
          activePolicyId={activePolicyId}
          onSelect={setSelectedPolicyId}
          onApply={applyPolicy}
          config={config}
        />
      )}

      {place === "memory" && (
        <MemoryPage
          selectedId={memoryId}
          onSelect={setMemoryId}
          onNavigateSettings={navigate}
        />
      )}

      {place === "environments" && (
        <EnvironmentsPage
          selectedId={envId}
          onSelect={setEnvId}
          onNavigateSettings={navigate}
        />
      )}

      {showChat && (
        <ChatPanel
          tickets={tickets}
          ticket={ticket}
          selectedEvidenceId={selectedEvidenceId}
          config={config}
          onConfigChange={setConfig}
          onSelectEvidence={setSelectedEvidenceId}
          onSelectTicket={selectTicket}
          onAnswerBlocked={answerBlocked}
        />
      )}

      <div className="dev-controllers">
        <TypefaceSwitcher />
        <DiffColorSwitcher />
      </div>
    </div>
  );
}

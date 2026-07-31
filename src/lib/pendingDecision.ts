import type { AgentRun, PendingDecision, RunStage } from "../types";

export function getPendingDecision(run: AgentRun): PendingDecision | null {
  if (run.pendingDecision) return run.pendingDecision;
  if (run.status === "blocked" && run.blockedQuestion) {
    return {
      id: "legacy-blocked",
      kind: "clarification",
      title: "Waiting on you",
      prompt: run.blockedQuestion,
      suggestedReplies: [],
    };
  }
  return null;
}

export function formatDecisionWait(ms: number) {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`;
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export function decisionWaitMs(decision: PendingDecision, now = Date.now()) {
  if (!decision.waitingSince) return null;
  return Math.max(0, now - decision.waitingSince);
}

export function blockingStageLabel(
  stages: RunStage[] | undefined,
  stageId: PendingDecision["blockingStage"],
) {
  if (!stageId) return null;
  return stages?.find((s) => s.id === stageId)?.label ?? stageId;
}

export function decisionKindLabel(kind: PendingDecision["kind"]) {
  switch (kind) {
    case "choice":
      return "Choice";
    case "clarification":
      return "Clarification";
    case "approval":
      return "Approval";
    case "review":
      return "Review";
  }
}

export function decisionSummary(decision: PendingDecision) {
  return decision.title;
}

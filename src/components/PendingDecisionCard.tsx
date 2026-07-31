import { useEffect, useMemo, useState } from "react";
import type { ContextRef, PendingDecision, RunStage } from "../types";
import {
  blockingStageLabel,
  decisionKindLabel,
  decisionWaitMs,
  formatDecisionWait,
} from "../lib/pendingDecision";

export interface PendingDecisionCardProps {
  decision: PendingDecision;
  stages?: RunStage[];
  variant?: "full" | "compact";
  onSubmit: (answer: string, optionId?: string) => void;
  onSnooze?: () => void;
  onStop?: () => void;
  onContextClick?: (ref: ContextRef) => void;
}

function contextIcon(kind: ContextRef["kind"]) {
  switch (kind) {
    case "file":
    case "evidence":
      return "#";
    case "doc":
      return "Doc";
    case "terminal":
      return ">";
    default:
      return "@";
  }
}

export function PendingDecisionCard({
  decision,
  stages,
  variant = "full",
  onSubmit,
  onSnooze,
  onStop,
  onContextClick,
}: PendingDecisionCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setSelectedOptionId(null);
    setCustomOpen(decision.kind === "review" || decision.kind === "clarification");
    setDraft("");
  }, [decision.id, decision.kind]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const waitMs = decisionWaitMs(decision, nowMs);
  const stageLabel = blockingStageLabel(stages, decision.blockingStage);

  const selectedOption = useMemo(
    () => decision.options?.find((o) => o.id === selectedOptionId) ?? null,
    [decision.options, selectedOptionId],
  );

  const showCustomField =
    customOpen ||
    selectedOption?.isCustom ||
    decision.kind === "review" ||
    (decision.kind === "clarification" && !decision.options?.length);

  const canSubmit = (() => {
    if (showCustomField) return Boolean(draft.trim());
    if (decision.kind === "approval" && selectedOptionId) return true;
    if (decision.options?.length) return Boolean(selectedOptionId && !selectedOption?.isCustom);
    return Boolean(draft.trim());
  })();

  const submit = () => {
    if (!canSubmit) return;
    if (selectedOption && !selectedOption.isCustom) {
      onSubmit(selectedOption.label, selectedOption.id);
      return;
    }
    onSubmit(draft.trim(), selectedOptionId ?? undefined);
  };

  const pickSuggested = (reply: string) => {
    setDraft(reply);
    setCustomOpen(true);
    setSelectedOptionId(null);
  };

  const pickOption = (optionId: string) => {
    const option = decision.options?.find((o) => o.id === optionId);
    setSelectedOptionId(optionId);
    if (option?.isCustom) {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    setDraft("");
    if (decision.kind === "approval" && option) {
      onSubmit(option.label, option.id);
    }
  };

  if (variant === "compact") {
    return (
      <div className="pending-decision pending-decision-compact">
        <span className="pending-decision-kind">{decisionKindLabel(decision.kind)}</span>
        <span className="pending-decision-compact-title">{decision.title}</span>
      </div>
    );
  }

  return (
    <div className="pending-decision" role="region" aria-label="Pending decision">
      <div className="pending-decision-head">
        <div className="pending-decision-status">
          <span className="pending-decision-pause" aria-hidden>
            ⏸
          </span>
          <span>Blocked</span>
          {stageLabel && (
            <>
              <span className="pending-decision-dot">·</span>
              <span>{stageLabel}</span>
            </>
          )}
          {waitMs != null && (
            <>
              <span className="pending-decision-dot">·</span>
              <span className="mono">waiting {formatDecisionWait(waitMs)}</span>
            </>
          )}
        </div>
        <span className="pending-decision-kind-badge">
          {decisionKindLabel(decision.kind)}
        </span>
      </div>

      <h3 className="pending-decision-title">{decision.title}</h3>
      <p className="pending-decision-prompt">{decision.prompt}</p>

      {decision.contextRefs && decision.contextRefs.length > 0 && (
        <div className="pending-decision-context">
          {decision.contextRefs.map((ref) => (
            <button
              key={ref.id}
              type="button"
              className={`pending-decision-ctx pending-decision-ctx-${ref.kind}`}
              title={ref.sublabel ?? ref.label}
              onClick={() => onContextClick?.(ref)}
              disabled={!onContextClick}
            >
              <span className="pending-decision-ctx-icon">{contextIcon(ref.kind)}</span>
              <span className="pending-decision-ctx-label">{ref.label}</span>
              {ref.sublabel && (
                <span className="pending-decision-ctx-sub">{ref.sublabel}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {decision.kind === "approval" && decision.options && (
        <div className="pending-decision-approval-row">
          {decision.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`btn${option.id === "allow" || option.id === "approve" ? " btn-primary" : ""}${selectedOptionId === option.id ? " active" : ""}`}
              onClick={() => pickOption(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {decision.kind === "choice" && decision.options && (
        <div className="pending-decision-options" role="radiogroup" aria-label={decision.title}>
          {decision.options.map((option) => (
            <label
              key={option.id}
              className={`pending-decision-option${selectedOptionId === option.id ? " selected" : ""}`}
            >
              <input
                type="radio"
                name={`decision-${decision.id}`}
                checked={selectedOptionId === option.id}
                onChange={() => pickOption(option.id)}
              />
              <span className="pending-decision-option-body">
                <span className="pending-decision-option-label">{option.label}</span>
                {option.description && (
                  <span className="pending-decision-option-desc">{option.description}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}

      {decision.kind === "clarification" && decision.suggestedReplies && (
        <div className="pending-decision-suggestions">
          {decision.suggestedReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              className="pending-decision-suggestion"
              onClick={() => pickSuggested(reply)}
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {showCustomField && (
        <textarea
          className="pending-decision-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            decision.kind === "review"
              ? "Share your judgment…"
              : "Type your answer…"
          }
          rows={decision.kind === "review" ? 3 : 2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
              e.preventDefault();
              submit();
            }
          }}
        />
      )}

      <div className="pending-decision-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canSubmit}
          onClick={submit}
        >
          Submit decision
        </button>
        {onSnooze && (
          <button type="button" className="btn btn-ghost" onClick={onSnooze}>
            Snooze
          </button>
        )}
        {onStop && (
          <button type="button" className="btn btn-ghost" onClick={onStop}>
            Stop run
          </button>
        )}
      </div>
    </div>
  );
}

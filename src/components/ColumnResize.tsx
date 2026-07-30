import {
  useCallback,
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const QUEUE_DEFAULT = 240;
const CHAT_DEFAULT = 380;
const QUEUE_MIN = 180;
const QUEUE_MAX = 360;
const CHAT_MIN = 280;
const CHAT_MAX = 520;
const CENTER_MIN = 360;
const RAIL = 46;

const STORAGE_KEY = "design-challenge-column-widths";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { queue?: number; chat?: number };
    return {
      queue:
        typeof parsed.queue === "number"
          ? clamp(parsed.queue, QUEUE_MIN, QUEUE_MAX)
          : QUEUE_DEFAULT,
      chat:
        typeof parsed.chat === "number"
          ? clamp(parsed.chat, CHAT_MIN, CHAT_MAX)
          : CHAT_DEFAULT,
    };
  } catch {
    return null;
  }
}

export function useColumnWidths(opts: { hasQueue: boolean; hasChat: boolean }) {
  const stored = readStored();
  const [queueWidth, setQueueWidth] = useState(
    stored?.queue ?? QUEUE_DEFAULT,
  );
  const [chatWidth, setChatWidth] = useState(stored?.chat ?? CHAT_DEFAULT);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ queue: queueWidth, chat: chatWidth }),
    );
  }, [queueWidth, chatWidth]);

  const maxQueue = useCallback(() => {
    const chat = opts.hasChat ? chatWidth : 0;
    return Math.min(
      QUEUE_MAX,
      Math.max(QUEUE_MIN, window.innerWidth - RAIL - chat - CENTER_MIN),
    );
  }, [opts.hasChat, chatWidth]);

  const maxChat = useCallback(() => {
    const queue = opts.hasQueue ? queueWidth : 0;
    return Math.min(
      CHAT_MAX,
      Math.max(CHAT_MIN, window.innerWidth - RAIL - queue - CENTER_MIN),
    );
  }, [opts.hasQueue, queueWidth]);

  const startQueueResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const handle = event.currentTarget;
      const pointerId = event.pointerId;
      const startX = event.clientX;
      const startWidth = queueWidth;
      handle.setPointerCapture(pointerId);

      const onMove = (e: PointerEvent) => {
        const next = clamp(
          startWidth + (e.clientX - startX),
          QUEUE_MIN,
          maxQueue(),
        );
        setQueueWidth(next);
      };

      const onUp = () => {
        handle.releasePointerCapture(pointerId);
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onUp);
        document.body.classList.remove("is-col-resizing");
      };

      document.body.classList.add("is-col-resizing");
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onUp);
    },
    [queueWidth, maxQueue],
  );

  const startChatResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const handle = event.currentTarget;
      const pointerId = event.pointerId;
      const startX = event.clientX;
      const startWidth = chatWidth;
      handle.setPointerCapture(pointerId);

      const onMove = (e: PointerEvent) => {
        const next = clamp(
          startWidth - (e.clientX - startX),
          CHAT_MIN,
          maxChat(),
        );
        setChatWidth(next);
      };

      const onUp = () => {
        handle.releasePointerCapture(pointerId);
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onUp);
        document.body.classList.remove("is-col-resizing");
      };

      document.body.classList.add("is-col-resizing");
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onUp);
    },
    [chatWidth, maxChat],
  );

  return {
    queueWidth,
    chatWidth,
    startQueueResize,
    startChatResize,
  };
}

export function ColumnResizeHandle({
  side,
  onPointerDown,
}: {
  side: "queue" | "chat";
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`col-resize-handle col-resize-${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={side === "queue" ? "Resize ticket list" : "Resize chat"}
      onPointerDown={onPointerDown}
    />
  );
}

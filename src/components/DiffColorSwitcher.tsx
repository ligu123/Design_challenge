import { useEffect, useState } from "react";

export type DiffPaletteId =
  | "current"
  | "github"
  | "mint-coral"
  | "teal-rose"
  | "cyan-amber"
  | "quiet";

interface DiffPaletteOption {
  id: DiffPaletteId;
  label: string;
  vibe: string;
  add: string;
  del: string;
}

const OPTIONS: DiffPaletteOption[] = [
  {
    id: "current",
    label: "Current",
    vibe: "Muddy sage + salmon",
    add: "#7aab87",
    del: "#d17a73",
  },
  {
    id: "github",
    label: "Clear signal",
    vibe: "Bright emerald / rose",
    add: "#3fb950",
    del: "#f85149",
  },
  {
    id: "mint-coral",
    label: "Mint & coral",
    vibe: "Cooler add, warmer del",
    add: "#6ec9a8",
    del: "#e08a7a",
  },
  {
    id: "teal-rose",
    label: "Teal & rose",
    vibe: "Off traffic-light green/red",
    add: "#5eb8a8",
    del: "#e07a8c",
  },
  {
    id: "cyan-amber",
    label: "Cyan & amber",
    vibe: "Max hue distance",
    add: "#5bb8d4",
    del: "#d4a15c",
  },
  {
    id: "quiet",
    label: "Quiet wash",
    vibe: "Soft; markers carry meaning",
    add: "#a8d4b4",
    del: "#d9a8a8",
  },
];

const STORAGE_KEY = "diff-palette";

function isDiffPaletteId(value: string | null): value is DiffPaletteId {
  return OPTIONS.some((o) => o.id === value);
}

function readStored(): DiffPaletteId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isDiffPaletteId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "current";
}

function applyDiffPalette(id: DiffPaletteId) {
  document.documentElement.setAttribute("data-diff-palette", id);
}

export function DiffColorSwitcher() {
  const [active, setActive] = useState<DiffPaletteId>(() => {
    const id = readStored();
    applyDiffPalette(id);
    return id;
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyDiffPalette(active);
    try {
      localStorage.setItem(STORAGE_KEY, active);
    } catch {
      /* ignore */
    }
  }, [active]);

  const current = OPTIONS.find((o) => o.id === active) ?? OPTIONS[0];

  return (
    <div className={`diff-color-switcher${open ? " open" : ""}`}>
      <button
        type="button"
        className="diff-color-switcher-toggle"
        aria-expanded={open}
        aria-controls="diff-color-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="diff-color-swatches" aria-hidden>
          <span style={{ background: current.add }} />
          <span style={{ background: current.del }} />
        </span>
        Diff · {current.label}
      </button>
      {open && (
        <div
          id="diff-color-panel"
          className="diff-color-panel"
          role="listbox"
          aria-label="Diff color palettes"
        >
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={opt.id === active}
              className={`diff-color-option${opt.id === active ? " active" : ""}`}
              onClick={() => {
                setActive(opt.id);
                setOpen(false);
              }}
            >
              <span className="diff-color-option-swatches" aria-hidden>
                <span style={{ background: opt.add }} />
                <span style={{ background: opt.del }} />
              </span>
              <span className="diff-color-option-text">
                <span className="diff-color-option-label">{opt.label}</span>
                <span className="diff-color-option-meta">{opt.vibe}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

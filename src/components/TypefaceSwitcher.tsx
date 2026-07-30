import { useEffect, useState } from "react";

export type TypefaceId =
  | "plex"
  | "inter"
  | "source"
  | "space"
  | "contrast"
  | "manrope";

interface TypefaceOption {
  id: TypefaceId;
  label: string;
  sans: string;
  mono: string;
}

const OPTIONS: TypefaceOption[] = [
  {
    id: "plex",
    label: "Plex",
    sans: "IBM Plex Sans",
    mono: "IBM Plex Mono",
  },
  {
    id: "inter",
    label: "Inter",
    sans: "Inter",
    mono: "JetBrains Mono",
  },
  {
    id: "source",
    label: "Source",
    sans: "Source Sans 3",
    mono: "Source Code Pro",
  },
  {
    id: "space",
    label: "Space",
    sans: "Space Grotesk",
    mono: "IBM Plex Mono",
  },
  {
    id: "contrast",
    label: "Contrast",
    sans: "IBM Plex Sans",
    mono: "JetBrains Mono",
  },
  {
    id: "manrope",
    label: "Manrope",
    sans: "Manrope",
    mono: "IBM Plex Mono",
  },
];

const STORAGE_KEY = "typeface";

function isTypefaceId(value: string | null): value is TypefaceId {
  return OPTIONS.some((o) => o.id === value);
}

function readStored(): TypefaceId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isTypefaceId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "plex";
}

function applyTypeface(id: TypefaceId) {
  document.documentElement.setAttribute("data-typeface", id);
}

export function TypefaceSwitcher() {
  const [active, setActive] = useState<TypefaceId>(() => {
    const id = readStored();
    applyTypeface(id);
    return id;
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyTypeface(active);
    try {
      localStorage.setItem(STORAGE_KEY, active);
    } catch {
      /* ignore */
    }
  }, [active]);

  const current = OPTIONS.find((o) => o.id === active) ?? OPTIONS[0];

  return (
    <div className={`typeface-switcher${open ? " open" : ""}`}>
      <button
        type="button"
        className="typeface-switcher-toggle"
        aria-expanded={open}
        aria-controls="typeface-panel"
        onClick={() => setOpen((v) => !v)}
      >
        Aa · {current.label}
      </button>
      {open && (
        <div
          id="typeface-panel"
          className="typeface-panel"
          role="listbox"
          aria-label="Typeface pairings"
        >
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={opt.id === active}
              className={`typeface-option${opt.id === active ? " active" : ""}`}
              onClick={() => {
                setActive(opt.id);
                setOpen(false);
              }}
            >
              <span className="typeface-option-label">{opt.label}</span>
              <span className="typeface-option-meta">
                <span style={{ fontFamily: `"${opt.sans}", sans-serif` }}>
                  {opt.sans}
                </span>
                <span aria-hidden> + </span>
                <span
                  className="mono"
                  style={{ fontFamily: `"${opt.mono}", monospace` }}
                >
                  {opt.mono}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

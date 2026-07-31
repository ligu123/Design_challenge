import type { ReactNode } from "react";
import type {
  ContextCategoryId,
  ContextPickerCategory,
  ContextPickerItem,
} from "../../lib/contextPicker";

const CATEGORY_ICONS: Record<ContextCategoryId, ReactNode> = {
  files: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5A1.5 1.5 0 0 1 5.5 6H9l2 2h7.5A1.5 1.5 0 0 1 20 9.5v9A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-11Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  docs: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 4.5h8l4 4V19.5A1.5 1.5 0 0 1 16.5 21h-10A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3H6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14 3.5V8h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  terminals: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6.5h16M4 12h16M4 17.5h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="m16 15.5 2 2-2 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "past-chats": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v8A2.5 2.5 0 0 1 16.5 17H9l-4 3v-3H7.5A2.5 2.5 0 0 1 5 14.5v-8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  branch: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="18" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 8.25v7.5M8.25 18H15.75a2.25 2.25 0 0 0 2.25-2.25V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  browser: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 12h17M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

function PickerRow({
  entry,
  highlighted,
  onSelect,
  onHover,
  showChevron,
}: {
  entry: ContextPickerItem | ContextPickerCategory;
  highlighted: boolean;
  onSelect: () => void;
  onHover: () => void;
  showChevron?: boolean;
}) {
  const isCategory = "items" in entry;
  const label = entry.label;
  const sublabel = isCategory ? undefined : entry.sublabel;
  const icon = isCategory ? CATEGORY_ICONS[entry.id] : null;

  return (
    <button
      type="button"
      role="option"
      aria-selected={highlighted}
      className={`context-picker-row${highlighted ? " highlighted" : ""}${isCategory ? " category" : ""}`}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      {icon && <span className="context-picker-icon">{icon}</span>}
      {!isCategory && entry.kind === "file" && (
        <span className="context-picker-hash">#</span>
      )}
      <span className="context-picker-label">{label}</span>
      {sublabel && <span className="context-picker-sublabel">{sublabel}</span>}
      {showChevron && (
        <span className="context-picker-chevron" aria-hidden>
          ›
        </span>
      )}
    </button>
  );
}

export interface ContextPickerProps {
  quickPicks: ContextPickerItem[];
  categories: ContextPickerCategory[];
  activeCategory: ContextCategoryId | null;
  highlightIndex: number;
  onSelectItem: (item: ContextPickerItem) => void;
  onOpenCategory: (categoryId: ContextCategoryId) => void;
  onBack: () => void;
  onHighlightChange: (index: number) => void;
}

export function ContextPicker({
  quickPicks,
  categories,
  activeCategory,
  highlightIndex,
  onSelectItem,
  onOpenCategory,
  onBack,
  onHighlightChange,
}: ContextPickerProps) {
  const category = activeCategory
    ? categories.find((c) => c.id === activeCategory)
    : null;

  if (category) {
    return (
      <div className="context-picker" role="listbox" aria-label="Context references">
        <button type="button" className="context-picker-back" onClick={onBack}>
          ‹ {category.label}
        </button>
        {category.items.length === 0 ? (
          <p className="context-picker-empty">No matches.</p>
        ) : (
          category.items.map((entry, i) => (
            <PickerRow
              key={entry.id}
              entry={entry}
              highlighted={highlightIndex === i}
              onHover={() => onHighlightChange(i)}
              onSelect={() => onSelectItem(entry)}
            />
          ))
        )}
      </div>
    );
  }

  const visibleCategories = categories.filter((c) => c.items.length > 0);
  let rowIndex = 0;

  return (
    <div className="context-picker" role="listbox" aria-label="Context references">
      {quickPicks.length > 0 && (
        <div className="context-picker-section">
          {quickPicks.map((entry) => {
            const idx = rowIndex++;
            return (
              <PickerRow
                key={entry.id}
                entry={entry}
                highlighted={highlightIndex === idx}
                onHover={() => onHighlightChange(idx)}
                onSelect={() => onSelectItem(entry)}
              />
            );
          })}
        </div>
      )}
      {visibleCategories.length > 0 && (
        <div className="context-picker-section">
          {visibleCategories.map((cat) => {
            const idx = rowIndex++;
            return (
              <PickerRow
                key={cat.id}
                entry={cat}
                highlighted={highlightIndex === idx}
                onHover={() => onHighlightChange(idx)}
                onSelect={() => onOpenCategory(cat.id)}
                showChevron
              />
            );
          })}
        </div>
      )}
      {quickPicks.length === 0 && visibleCategories.length === 0 && (
        <p className="context-picker-empty">No context available.</p>
      )}
    </div>
  );
}

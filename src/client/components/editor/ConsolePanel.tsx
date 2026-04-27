import type { ConsoleEntry } from "./types";

export function ConsolePanel({ entries, onClear }: { entries: ConsoleEntry[]; onClear: () => void }) {
  return (
    <div className="console-panel">
      <div className="console-header">
        <span>{entries.length === 0 ? "No console output" : `${entries.length} console entries`}</span>
        <button type="button" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="console-list">
        {entries.map((entry) => (
          <div className={`console-entry ${entry.level}`} key={entry.id}>
            <span>{entry.level}</span>
            <code>{entry.values.join(" ")}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Terminal } from "lucide-react";
import type { Pen } from "../../lib/types";
import { ConsolePanel } from "./ConsolePanel";
import type { ConsoleEntry } from "./types";
import { relativeTime } from "./utils";

type UtilityBarProps = {
  consoleOpen: boolean;
  hasConsoleErrors: boolean;
  currentPen: Pen | null;
  consoleEntries: ConsoleEntry[];
  onToggleConsole: () => void;
  onClearConsole: () => void;
};

export function UtilityBar({ consoleOpen, hasConsoleErrors, currentPen, consoleEntries, onToggleConsole, onClearConsole }: UtilityBarProps) {
  return (
    <footer className="utility-bar">
      <div className="utility-tabs">
        <button
          className={`utility-tab ${consoleOpen ? "active" : ""} ${hasConsoleErrors ? "error" : "default"}`}
          type="button"
          onClick={onToggleConsole}
          aria-expanded={consoleOpen}
        >
          <Terminal size={15} />
          Console
        </button>
      </div>
      <div className="utility-status">
        <span>{currentPen ? `Last saved ${relativeTime(currentPen.updated_at)}` : "Not saved yet"}</span>
      </div>
      {consoleOpen && (
        <div className="utility-panel">
          <ConsolePanel entries={consoleEntries} onClear={onClearConsole} />
        </div>
      )}
    </footer>
  );
}

import Editor from "@monaco-editor/react";
import { ChevronDown, ChevronsLeft, Settings } from "lucide-react";

type CodePaneProps = {
  title: string;
  tone: "html" | "css" | "js" | "ts";
  language: string;
  footerLabel?: string;
  value: string;
  onChange: (value: string) => void;
  languageOptions?: Array<{ label: string; value: string }>;
  onLanguageChange?: (value: string) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function CodePane({
  title,
  tone,
  language,
  footerLabel,
  value,
  onChange,
  languageOptions,
  onLanguageChange,
  collapsed,
  onToggleCollapsed
}: CodePaneProps) {
  const badgeText = title.length > 2 ? title.slice(0, 2) : title;

  if (collapsed) {
    return (
      <section className={`code-pane collapsed ${tone}`}>
        <button
          className="pane-rail"
          type="button"
          onClick={onToggleCollapsed}
          title={`Expand ${title}`}
          aria-label={`Expand ${title} pane`}
          aria-expanded={false}
        >
          <span className={`language-badge ${tone}`}>{badgeText}</span>
          <span className="pane-rail-label">{title}</span>
        </button>
      </section>
    );
  }

  return (
    <section className="code-pane">
      <div className="pane-title">
        <span className={`language-badge ${tone}`}>{badgeText}</span>
        {languageOptions && onLanguageChange ? (
          <label className="language-select-wrap">
            <select className="language-select" value={language} onChange={(event) => onLanguageChange(event.target.value)} aria-label="Script language">
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
        ) : (
          <span className="pane-title-text">{title}</span>
        )}
        <span className="toolbar-spacer" />
        {onToggleCollapsed && (
          <button
            className="plain-icon"
            type="button"
            onClick={onToggleCollapsed}
            title={`Collapse ${title}`}
            aria-label={`Collapse ${title} pane`}
            aria-expanded={true}
          >
            <ChevronsLeft size={14} />
          </button>
        )}
        <Settings size={14} />
      </div>
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        value={value}
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true
        }}
        onChange={(next) => onChange(next ?? "")}
      />
      <div className="pane-footer">
        <span>Ln {lineCount(value)}, Col 1</span>
        <span>Spaces: 2</span>
        <span>{footerLabel ?? title}</span>
      </div>
    </section>
  );
}

function lineCount(value: string): number {
  return value.split("\n").length;
}

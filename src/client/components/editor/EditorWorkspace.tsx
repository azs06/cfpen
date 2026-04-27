import { Maximize2, RefreshCw } from "lucide-react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { getPreviewFrameKey } from "../../lib/preview";
import { CodePane } from "./CodePane";
import type { CollapsedPanes, Draft, PaneKey, ScriptLanguage } from "./types";

type EditorWorkspaceProps = {
  draft: Draft;
  scriptLanguage: ScriptLanguage;
  collapsedPanes: CollapsedPanes;
  paneRatios: Record<PaneKey, number>;
  preview: string;
  previewNonce: number;
  onDraftChange: (patch: Partial<Draft>) => void;
  onTogglePaneCollapsed: (pane: PaneKey) => void;
  onBeginPaneResize: (event: ReactMouseEvent, leftKey: PaneKey, rightKey: PaneKey) => void;
  onScriptLanguageChange: (value: ScriptLanguage) => void;
  onRefreshPreview: () => void;
  onOpenFullscreenPreview: () => void;
};

export function EditorWorkspace({
  draft,
  scriptLanguage,
  collapsedPanes,
  paneRatios,
  preview,
  previewNonce,
  onDraftChange,
  onTogglePaneCollapsed,
  onBeginPaneResize,
  onScriptLanguageChange,
  onRefreshPreview,
  onOpenFullscreenPreview
}: EditorWorkspaceProps) {
  const previewFrameKey = getPreviewFrameKey(preview, previewNonce);

  return (
    <div className="surface-grid">
      <div className="editor-grid">
        <div className="editor-row">
          <div
            className={`code-pane-shell ${collapsedPanes.html ? "collapsed" : ""}`}
            data-pane-key="html"
            style={collapsedPanes.html ? undefined : { flex: `${paneRatios.html} 1 0` }}
          >
            <CodePane
              title="HTML"
              tone="html"
              language="html"
              value={draft.html}
              onChange={(html) => onDraftChange({ html })}
              collapsed={collapsedPanes.html}
              onToggleCollapsed={() => onTogglePaneCollapsed("html")}
            />
          </div>
          <div className="pane-divider" role="separator" aria-orientation="vertical" onMouseDown={(event) => onBeginPaneResize(event, "html", "css")} />
          <div
            className={`code-pane-shell ${collapsedPanes.css ? "collapsed" : ""}`}
            data-pane-key="css"
            style={collapsedPanes.css ? undefined : { flex: `${paneRatios.css} 1 0` }}
          >
            <CodePane
              title="CSS"
              tone="css"
              language="css"
              value={draft.css}
              onChange={(css) => onDraftChange({ css })}
              collapsed={collapsedPanes.css}
              onToggleCollapsed={() => onTogglePaneCollapsed("css")}
            />
          </div>
          <div className="pane-divider" role="separator" aria-orientation="vertical" onMouseDown={(event) => onBeginPaneResize(event, "css", "js")} />
          <div
            className={`code-pane-shell ${collapsedPanes.js ? "collapsed" : ""}`}
            data-pane-key="js"
            style={collapsedPanes.js ? undefined : { flex: `${paneRatios.js} 1 0` }}
          >
            <CodePane
              title={scriptLanguage === "typescript" ? "TS" : "JS"}
              tone={scriptLanguage === "typescript" ? "ts" : "js"}
              language={scriptLanguage}
              footerLabel={scriptLanguage === "typescript" ? "TypeScript" : "JavaScript"}
              value={draft.js}
              onChange={(js) => onDraftChange({ js })}
              languageOptions={[
                { label: "JS", value: "javascript" },
                { label: "TS", value: "typescript" }
              ]}
              onLanguageChange={(language) => onScriptLanguageChange(language as ScriptLanguage)}
              collapsed={collapsedPanes.js}
              onToggleCollapsed={() => onTogglePaneCollapsed("js")}
            />
          </div>
        </div>
        <section className="preview-pane">
          <div className="preview-toolbar">
            <div className="pane-title-text">Preview</div>
            <button className="plain-icon" type="button" onClick={onRefreshPreview} title="Refresh preview">
              <RefreshCw size={15} />
            </button>
            <span className="toolbar-spacer" />
            <button className="plain-icon" type="button" onClick={onOpenFullscreenPreview} title="Open fullscreen preview">
              <Maximize2 size={15} />
            </button>
          </div>
          <div className="preview-canvas auto-preview">
            <div className="preview-auto-frame">
              <iframe className="preview-frame" key={previewFrameKey} title="Preview" sandbox="allow-scripts allow-forms allow-modals allow-popups" srcDoc={preview} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

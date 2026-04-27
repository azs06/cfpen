import { ChevronDown, FilePlus2, LayoutPanelTop, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import cfpenLogoUrl from "../../assets/cfpen-logo-imagegen.png";
import type { Pen } from "../../lib/types";
import { relativeTime } from "./utils";

type EditorSidebarProps = {
  collapsed: boolean;
  pens: Pen[];
  currentId: string | null;
  penSearch: string;
  onToggleCollapsed: () => void;
  onCreate: () => void;
  onSearch: (value: string) => void;
  onLoadPen: (id: string) => void;
};

export function EditorSidebar({ collapsed, pens, currentId, penSearch, onToggleCollapsed, onCreate, onSearch, onLoadPen }: EditorSidebarProps) {
  return (
    <aside className="sidebar" aria-label="Pen navigation">
      <div className="brand-row">
        <div className="brand-lockup">
          <img className="brand-logo" src={cfpenLogoUrl} alt="CFPen logo" />
          <div className="brand-copy">
            <div className="brand">CFPen</div>
            <div className="muted small">Personal pens</div>
          </div>
        </div>
        <button
          className="icon-button ghost"
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <div className="sidebar-main">
        <button className="new-pen-button" type="button" onClick={onCreate}>
          <FilePlus2 size={17} />
          <span>New Pen</span>
          <ChevronDown size={16} />
        </button>

        <label className="search-field">
          <Search size={15} />
          <input value={penSearch} onChange={(event) => onSearch(event.target.value)} placeholder="Search pens..." />
        </label>

        <div className="sidebar-section-label">Pens</div>
        <div className="pen-list">
          {pens.map((pen) => (
            <button className={`pen-item ${pen.id === currentId ? "active" : ""}`} key={pen.id} type="button" onClick={() => onLoadPen(pen.id)}>
              <span className="pen-icon" aria-hidden="true">
                <LayoutPanelTop size={15} />
              </span>
              <span className="pen-copy">
                <strong>{pen.title}</strong>
                <time>{relativeTime(pen.updated_at)}</time>
              </span>
              <span className="status-dot" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

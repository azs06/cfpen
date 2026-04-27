import { Check, Copy, ExternalLink, ImagePlus, MoreHorizontal, Share2, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import cfpenLogoUrl from "../../assets/cfpen-logo-imagegen.png";
import type { SaveState } from "../../lib/types";

type EditorTopbarProps = {
  title: string;
  description: string;
  saveState: SaveState;
  shareUrl: string;
  copied: string | null;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDuplicate: () => void;
  onOpenAssets: () => void;
  onShare: () => void;
  onDelete: () => void;
};

export function EditorTopbar({
  title,
  description,
  saveState,
  shareUrl,
  copied,
  onTitleChange,
  onDescriptionChange,
  onDuplicate,
  onOpenAssets,
  onShare,
  onDelete
}: EditorTopbarProps) {
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    if (!actionsOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActionsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actionsOpen]);

  const closeAndRun = (action: () => void) => {
    setActionsOpen(false);
    action();
  };

  return (
    <header className="topbar">
      <div className="title-cluster">
        <img className="command-logo" src={cfpenLogoUrl} alt="" aria-hidden="true" />
        <div className="title-stack">
          <input aria-label="Pen title" className="title-input" value={title} onChange={(event) => onTitleChange(event.target.value)} />
          <input aria-label="Pen description" className="description-input" value={description} onChange={(event) => onDescriptionChange(event.target.value)} />
        </div>
      </div>

      <div className="topbar-actions">
        <div className={`save-state ${saveState}`}>
          {saveState === "saving" ? <UploadCloud size={16} /> : <Check size={16} />}
          <span>{saveState}</span>
        </div>
        <div className="actions-menu-wrap">
          <button
            className="toolbar-button"
            type="button"
            onClick={() => setActionsOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={actionsOpen}
            aria-label="Pen actions"
            title="Pen actions"
          >
            <MoreHorizontal size={16} />
          </button>
          {actionsOpen && (
            <>
              <button className="menu-dismiss-layer" type="button" aria-label="Close actions menu" onClick={() => setActionsOpen(false)} />
              <div className="actions-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => closeAndRun(onDuplicate)}>
                  <Copy size={16} />
                  Duplicate
                </button>
                <button type="button" role="menuitem" onClick={() => closeAndRun(onOpenAssets)}>
                  <ImagePlus size={16} />
                  Assets
                </button>
                <button type="button" role="menuitem" onClick={() => closeAndRun(onShare)} disabled={!shareUrl}>
                  <Share2 size={16} />
                  {copied === "Share link" ? "Copied" : "Share"}
                </button>
                <a role="menuitem" href={shareUrl || "#"} target="_blank" rel="noreferrer" onClick={() => setActionsOpen(false)}>
                  <ExternalLink size={16} />
                  View
                </a>
                <button className="danger-menu-item" type="button" role="menuitem" onClick={() => closeAndRun(onDelete)}>
                  <Trash2 size={16} />
                  Delete Pen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

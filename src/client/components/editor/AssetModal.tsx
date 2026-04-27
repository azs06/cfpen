import { ImagePlus, X } from "lucide-react";
import { useEffect } from "react";
import type { Asset } from "../../lib/types";
import { AssetLibrary } from "./AssetLibrary";
import type { AssetFilter } from "./types";

type AssetModalProps = {
  assetCount: number;
  assets: Asset[];
  assetSearch: string;
  assetFilter: AssetFilter;
  copied: string | null;
  onClose: () => void;
  onUpload: (file: File | null) => void;
  onSearch: (value: string) => void;
  onFilter: (value: AssetFilter) => void;
  onCopy: (value: string, label: string) => void;
  onRename: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
};

export function AssetModal({
  assetCount,
  assets,
  assetSearch,
  assetFilter,
  copied,
  onClose,
  onUpload,
  onSearch,
  onFilter,
  onCopy,
  onRename,
  onDelete
}: AssetModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="asset-modal" role="dialog" aria-modal="true" aria-labelledby="asset-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="asset-modal-header">
          <div>
            <span className="dock-kicker">Assets</span>
            <h2 id="asset-modal-title">Asset Library</h2>
            <p>{assetCount} resources available for this pen</p>
          </div>
          <div className="asset-modal-actions">
            <label className="toolbar-button primary">
              <ImagePlus size={16} />
              Upload
              <input type="file" hidden onChange={(event) => onUpload(event.target.files?.[0] ?? null)} />
            </label>
            <button className="icon-button ghost" type="button" onClick={onClose} aria-label="Close assets">
              <X size={18} />
            </button>
          </div>
        </header>
        <AssetLibrary
          assets={assets}
          assetSearch={assetSearch}
          assetFilter={assetFilter}
          copied={copied}
          onSearch={onSearch}
          onFilter={onFilter}
          onCopy={onCopy}
          onRename={onRename}
          onDelete={onDelete}
        />
      </section>
    </div>
  );
}

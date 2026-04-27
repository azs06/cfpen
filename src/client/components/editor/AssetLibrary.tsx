import { Folder, Search } from "lucide-react";
import type { Asset } from "../../lib/types";
import type { AssetFilter } from "./types";
import { formatBytes } from "./utils";

type AssetLibraryProps = {
  assets: Asset[];
  assetSearch: string;
  assetFilter: AssetFilter;
  copied: string | null;
  onSearch: (value: string) => void;
  onFilter: (value: AssetFilter) => void;
  onCopy: (value: string, label: string) => void;
  onRename: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
};

export function AssetLibrary({ assets, assetSearch, assetFilter, copied, onSearch, onFilter, onCopy, onRename, onDelete }: AssetLibraryProps) {
  return (
    <div className="asset-library">
      <div className="asset-library-controls">
        <label className="search-field asset-search">
          <Search size={15} />
          <input value={assetSearch} onChange={(event) => onSearch(event.target.value)} placeholder="Search assets..." />
        </label>

        <select className="asset-filter" value={assetFilter} onChange={(event) => onFilter(event.target.value as AssetFilter)}>
          <option value="all">All Assets</option>
          <option value="images">Images</option>
          <option value="svg">SVG</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="asset-list modal-asset-list">
        {assets.length > 0 ? (
          assets.map((asset) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              copied={copied}
              onCopy={onCopy}
              onRename={() => onRename(asset)}
              onDelete={() => onDelete(asset)}
            />
          ))
        ) : (
          <span className="empty-assets">No matching assets</span>
        )}
      </div>
    </div>
  );
}

function AssetRow({
  asset,
  copied,
  onCopy,
  onRename,
  onDelete
}: {
  asset: Asset;
  copied: string | null;
  onCopy: (value: string, label: string) => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const absoluteUrl = new URL(asset.url, window.location.origin).toString();
  const isImage = asset.contentType.startsWith("image/");
  const isSvg = asset.contentType.includes("svg") || asset.filename.toLowerCase().endsWith(".svg");

  return (
    <article className="asset-row">
      <a className="asset-thumb" href={asset.url} target="_blank" rel="noreferrer" title="Open asset">
        {isImage ? <img src={asset.url} alt="" /> : <Folder size={20} />}
      </a>
      <div className="asset-meta">
        <strong>{asset.filename}</strong>
        <span>
          {isSvg ? "SVG" : asset.contentType || "File"} · {formatBytes(asset.size)}
        </span>
        <small>{new Date(asset.createdAt).toLocaleDateString()}</small>
      </div>
      <div className="asset-row-actions">
        <button type="button" onClick={() => onCopy(absoluteUrl, `url:${asset.id}`)}>
          {copied === `url:${asset.id}` ? "Copied" : "URL"}
        </button>
        <button type="button" onClick={() => onCopy(`<img src="${absoluteUrl}" alt="">`, `html:${asset.id}`)}>
          HTML
        </button>
        <button type="button" onClick={() => onCopy(`url("${absoluteUrl}")`, `css:${asset.id}`)}>
          CSS
        </button>
        <button type="button" onClick={onRename}>
          Rename
        </button>
        <button className="danger-text" type="button" onClick={onDelete}>
          Delete
        </button>
      </div>
    </article>
  );
}

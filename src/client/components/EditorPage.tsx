import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  createPen,
  deleteAsset,
  deletePen,
  getPen,
  listPenAssets,
  listPens,
  renameAsset,
  updatePen,
  uploadAsset
} from "../lib/api";
import { buildPreviewDocument } from "../lib/preview";
import type { Asset, Pen, SaveState } from "../lib/types";
import { AssetModal } from "./editor/AssetModal";
import { STARTER } from "./editor/constants";
import { EditorSidebar } from "./editor/EditorSidebar";
import { EditorTopbar } from "./editor/EditorTopbar";
import { EditorWorkspace } from "./editor/EditorWorkspace";
import { FullscreenPreviewModal } from "./editor/FullscreenPreviewModal";
import type { AssetFilter, CollapsedPanes, ConsoleEntry, Draft, PaneKey, PreviewMode, ScriptLanguage } from "./editor/types";
import { UtilityBar } from "./editor/UtilityBar";
import { compileScript, parsePreviewMessage, readScriptLanguage, upsertPen, writeScriptLanguage } from "./editor/utils";

export function EditorPage({ initialPenId }: { initialPenId: string | null }) {
  const [pens, setPens] = useState<Pen[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(initialPenId);
  const [draft, setDraft] = useState<Draft>(STARTER);
  const [description, setDescription] = useState("No description");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const [scriptLanguage, setScriptLanguage] = useState<ScriptLanguage>("javascript");
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedPanes, setCollapsedPanes] = useState<CollapsedPanes>({
    html: false,
    css: false,
    js: false
  });
  const [paneRatios, setPaneRatios] = useState<Record<PaneKey, number>>({
    html: 1,
    css: 1,
    js: 1
  });
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [fullscreenPreviewOpen, setFullscreenPreviewOpen] = useState(false);
  const [penSearch, setPenSearch] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");
  const saveTimer = useRef<number | null>(null);
  const latestDraft = useRef(draft);

  const currentPen = pens.find((pen) => pen.id === currentId) ?? null;
  const shareUrl = currentPen ? `${window.location.origin}/p/${currentPen.slug}` : "";
  const hasConsoleErrors = consoleEntries.some((entry) => entry.level === "error");

  const filteredPens = useMemo(() => {
    const query = penSearch.trim().toLowerCase();
    if (!query) return pens;
    return pens.filter((pen) => pen.title.toLowerCase().includes(query));
  }, [penSearch, pens]);

  const filteredAssets = useMemo(() => {
    const query = assetSearch.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesQuery = !query || asset.filename.toLowerCase().includes(query);
      const isSvg = asset.contentType.includes("svg") || asset.filename.toLowerCase().endsWith(".svg");
      const isImage = asset.contentType.startsWith("image/");
      const matchesType =
        assetFilter === "all" ||
        (assetFilter === "svg" && isSvg) ||
        (assetFilter === "images" && isImage && !isSvg) ||
        (assetFilter === "other" && !isImage && !isSvg);
      return matchesQuery && matchesType;
    });
  }, [assetFilter, assetSearch, assets]);

  useEffect(() => {
    latestDraft.current = draft;
  }, [draft]);

  useEffect(() => {
    const handlePreviewMessage = (event: MessageEvent) => {
      const data = parsePreviewMessage(event.data);
      if (data.source !== "cfpen-preview" || data.type !== "console") return;
      setConsoleEntries((previous) => [
        ...previous.slice(-99),
        {
          id: crypto.randomUUID(),
          level: data.level ?? "log",
          values: data.values ?? [],
          timestamp: data.timestamp ?? Date.now()
        }
      ]);
    };

    window.addEventListener("message", handlePreviewMessage);
    return () => window.removeEventListener("message", handlePreviewMessage);
  }, []);

  useEffect(() => {
    let isCurrent = true;
    setConsoleEntries([]);
    compileScript(draft.js, scriptLanguage)
      .then((script) => {
        if (isCurrent) {
          setPreview(buildPreviewDocument(draft, script));
        }
      })
      .catch((previewError) => {
        if (isCurrent) {
          setPreview(String(previewError instanceof Error ? previewError.message : previewError));
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [draft, previewNonce, scriptLanguage]);

  useEffect(() => {
    void refreshPens(initialPenId);
  }, [initialPenId]);

  const loadPen = useCallback(async (id: string) => {
    setError(null);
    const pen = await getPen(id);
    setCurrentId(pen.id);
    setDraft({ title: pen.title, html: pen.html, css: pen.css, js: pen.js });
    setScriptLanguage(readScriptLanguage(pen.id));
    setDescription("No description");
    setSaveState("saved");
    window.history.replaceState(null, "", `/editor/${pen.id}`);
    setPens((previous) => upsertPen(previous, pen));
    setAssets(await listPenAssets(pen.id));
  }, []);

  const scheduleSave = useCallback(
    (nextDraft: Draft) => {
      if (!currentId) return;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      setSaveState("dirty");
      saveTimer.current = window.setTimeout(async () => {
        setSaveState("saving");
        try {
          const saved = await updatePen(currentId, nextDraft);
          setPens((previous) => upsertPen(previous, saved));
          setSaveState("saved");
          setError(null);
        } catch (saveError) {
          setSaveState("error");
          setError(saveError instanceof Error ? saveError.message : "Unable to save pen.");
        }
      }, 700);
    },
    [currentId]
  );

  const patchDraft = (patch: Partial<Draft>) => {
    const next = { ...latestDraft.current, ...patch };
    setDraft(next);
    scheduleSave(next);
  };

  const togglePaneCollapsed = useCallback((pane: PaneKey) => {
    setCollapsedPanes((previous) => ({ ...previous, [pane]: !previous[pane] }));
  }, []);

  const beginPaneResize = useCallback((event: ReactMouseEvent, leftKey: PaneKey, rightKey: PaneKey) => {
    event.preventDefault();
    const startX = event.clientX;
    const row = (event.currentTarget as HTMLElement).parentElement;
    if (!row) return;
    const leftEl = row.querySelector<HTMLElement>(`[data-pane-key="${leftKey}"]`);
    const rightEl = row.querySelector<HTMLElement>(`[data-pane-key="${rightKey}"]`);
    if (!leftEl || !rightEl) return;
    const startLeftPx = leftEl.getBoundingClientRect().width;
    const startRightPx = rightEl.getBoundingClientRect().width;
    const totalPx = startLeftPx + startRightPx;
    const minPx = 80;
    const collapseThreshold = 50;
    const expandThreshold = 60;

    const wasLeftCollapsed = leftEl.classList.contains("collapsed");
    const wasRightCollapsed = rightEl.classList.contains("collapsed");

    const cleanup = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    const onMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startX;

      if (wasLeftCollapsed && deltaPx > expandThreshold) {
        setCollapsedPanes((previous) => ({ ...previous, [leftKey]: false }));
        cleanup();
        return;
      }
      if (wasRightCollapsed && deltaPx < -expandThreshold) {
        setCollapsedPanes((previous) => ({ ...previous, [rightKey]: false }));
        cleanup();
        return;
      }
      if (wasLeftCollapsed || wasRightCollapsed) {
        return;
      }

      const projectedLeftPx = startLeftPx + deltaPx;
      const projectedRightPx = totalPx - projectedLeftPx;

      if (projectedLeftPx < collapseThreshold) {
        setCollapsedPanes((previous) => ({ ...previous, [leftKey]: true }));
        cleanup();
        return;
      }
      if (projectedRightPx < collapseThreshold) {
        setCollapsedPanes((previous) => ({ ...previous, [rightKey]: true }));
        cleanup();
        return;
      }

      const newLeftPx = Math.max(minPx, Math.min(totalPx - minPx, projectedLeftPx));
      setPaneRatios((previous) => {
        const sum = previous[leftKey] + previous[rightKey];
        const nextLeft = sum * (newLeftPx / totalPx);
        const nextRight = sum - nextLeft;
        return { ...previous, [leftKey]: nextLeft, [rightKey]: nextRight };
      });
    };

    const onUp = () => {
      cleanup();
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  async function refreshPens(preferredId: string | null = currentId) {
    setError(null);
    try {
      const allPens = await listPens();
      setPens(allPens);

      const target = preferredId ? allPens.find((pen) => pen.id === preferredId) : allPens[0];
      if (target) {
        await loadPen(target.id);
      } else {
        await handleCreate();
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load pens.");
    }
  }

  async function handleCreate() {
    setError(null);
    const pen = await createPen(STARTER);
    setPens((previous) => upsertPen(previous, pen));
    setCurrentId(pen.id);
    setDraft({ title: pen.title, html: pen.html, css: pen.css, js: pen.js });
    setScriptLanguage("javascript");
    writeScriptLanguage(pen.id, "javascript");
    setDescription("No description");
    setSaveState("saved");
    window.history.replaceState(null, "", `/editor/${pen.id}`);
  }

  async function handleDuplicate() {
    setError(null);
    const pen = await createPen({
      title: `${draft.title} Copy`,
      html: draft.html,
      css: draft.css,
      js: draft.js
    });
    setPens((previous) => upsertPen(previous, pen));
    await loadPen(pen.id);
  }

  async function handleDelete() {
    if (!currentId || !window.confirm("Delete this pen?")) return;
    await deletePen(currentId);
    const remaining = pens.filter((pen) => pen.id !== currentId);
    setPens(remaining);
    if (remaining[0]) {
      await loadPen(remaining[0].id);
    } else {
      await handleCreate();
    }
  }

  async function handleUpload(file: File | null) {
    if (!file || !currentId) return;
    setError(null);
    try {
      const asset = await uploadAsset(currentId, file);
      setAssets((previous) => [asset, ...previous]);
      setAssetModalOpen(true);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload asset.");
    }
  }

  async function handleRenameAsset(asset: Asset) {
    if (!currentId) return;
    const nextFilename = window.prompt("Rename asset", asset.filename);
    if (nextFilename === null) return;
    setError(null);
    try {
      const renamed = await renameAsset(currentId, asset.id, nextFilename);
      setAssets((previous) => previous.map((item) => (item.id === renamed.id ? renamed : item)));
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Unable to rename asset.");
    }
  }

  async function handleDeleteAsset(asset: Asset) {
    if (!currentId || !window.confirm(`Delete ${asset.filename}?`)) return;
    setError(null);
    try {
      await deleteAsset(currentId, asset.id);
      setAssets((previous) => previous.filter((item) => item.id !== asset.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete asset.");
    }
  }

  async function copyText(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1400);
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    await copyText(shareUrl, "Share link");
  }

  function refreshPreview() {
    setConsoleEntries([]);
    setPreviewNonce((value) => value + 1);
  }

  function handleScriptLanguageChange(nextLanguage: ScriptLanguage) {
    setScriptLanguage(nextLanguage);
    if (currentId) {
      writeScriptLanguage(currentId, nextLanguage);
    }
  }

  return (
    <main className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <EditorSidebar
        collapsed={sidebarCollapsed}
        pens={filteredPens}
        currentId={currentId}
        penSearch={penSearch}
        onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
        onCreate={() => void handleCreate()}
        onSearch={setPenSearch}
        onLoadPen={(id) => void loadPen(id)}
      />

      <section className="workspace">
        <EditorTopbar
          title={draft.title}
          description={description}
          saveState={saveState}
          shareUrl={shareUrl}
          copied={copied}
          onTitleChange={(title) => patchDraft({ title })}
          onDescriptionChange={setDescription}
          onDuplicate={() => void handleDuplicate()}
          onOpenAssets={() => setAssetModalOpen(true)}
          onShare={() => void copyShareUrl()}
          onDelete={() => void handleDelete()}
        />

        {error && <div className="error-banner">{error}</div>}

        <EditorWorkspace
          draft={draft}
          scriptLanguage={scriptLanguage}
          collapsedPanes={collapsedPanes}
          paneRatios={paneRatios}
          preview={preview}
          previewNonce={previewNonce}
          onDraftChange={patchDraft}
          onTogglePaneCollapsed={togglePaneCollapsed}
          onBeginPaneResize={beginPaneResize}
          onScriptLanguageChange={handleScriptLanguageChange}
          onRefreshPreview={refreshPreview}
          onOpenFullscreenPreview={() => setFullscreenPreviewOpen(true)}
        />

        {fullscreenPreviewOpen && (
          <FullscreenPreviewModal
            preview={preview}
            previewNonce={previewNonce}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
            onClose={() => setFullscreenPreviewOpen(false)}
          />
        )}

        <UtilityBar
          consoleOpen={consoleOpen}
          hasConsoleErrors={hasConsoleErrors}
          currentPen={currentPen}
          consoleEntries={consoleEntries}
          onToggleConsole={() => setConsoleOpen((open) => !open)}
          onClearConsole={() => setConsoleEntries([])}
        />

        {assetModalOpen && (
          <AssetModal
            assetCount={assets.length}
            assets={filteredAssets}
            assetSearch={assetSearch}
            assetFilter={assetFilter}
            copied={copied}
            onClose={() => setAssetModalOpen(false)}
            onUpload={(file) => void handleUpload(file)}
            onSearch={setAssetSearch}
            onFilter={setAssetFilter}
            onCopy={(value, label) => void copyText(value, label)}
            onRename={(asset) => void handleRenameAsset(asset)}
            onDelete={(asset) => void handleDeleteAsset(asset)}
          />
        )}
      </section>
    </main>
  );
}

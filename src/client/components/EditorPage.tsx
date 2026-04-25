import Editor from "@monaco-editor/react";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  FilePlus2,
  Folder,
  ImagePlus,
  Laptop,
  LayoutPanelTop,
  Maximize2,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Smartphone,
  Tablet,
  Terminal,
  Trash2,
  UploadCloud,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import cfpenLogoUrl from "../assets/cfpen-logo-imagegen.png";
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
import { compileTypeScript } from "../lib/monacoTypeScript";
import { buildPreviewDocument } from "../lib/preview";
import type { Asset, Pen, SaveState } from "../lib/types";

const STARTER = {
  title: "Untitled Pen",
  html: "<main class=\"card\">\n  <span>2026</span>\n  <h1>Design with Code.</h1>\n  <p>A modern, lightweight editor for building beautiful web experiences.</p>\n  <button id=\"action\">Explore Features</button>\n</main>",
  css: ":root {\n  --bg: #0f1115;\n  --card: #15171c;\n  --text: #f7fafc;\n  --muted: #9aa4b2;\n  --accent: #22d3ee;\n  --accent-2: #ff725e;\n}\n\n* { box-sizing: border-box; }\n\nbody {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  font-family: Inter, system-ui, sans-serif;\n  background:\n    radial-gradient(800px 420px at 0% 100%, rgba(34, 211, 238, .42), transparent),\n    radial-gradient(720px 360px at 100% 0%, rgba(255, 114, 94, .38), transparent),\n    var(--bg);\n  color: var(--text);\n}\n\n.card {\n  width: min(560px, calc(100vw - 32px));\n  border: 1px solid rgba(255,255,255,.12);\n  border-radius: 18px;\n  padding: 38px;\n  background: rgba(21, 23, 28, .82);\n  box-shadow: 0 24px 80px rgba(0,0,0,.35);\n}\n\nspan { color: var(--accent); font-weight: 800; }\nh1 { margin: 12px 0; font-size: clamp(32px, 6vw, 56px); }\np { color: var(--muted); line-height: 1.6; }\nbutton {\n  border: 0;\n  border-radius: 999px;\n  padding: .8rem 1rem;\n  background: var(--accent);\n  color: #061012;\n  font-weight: 800;\n}",
  js: "console.log('CFPen preview ready');\n\ndocument.querySelector('#action')?.addEventListener('click', () => {\n  console.warn('Exploring features');\n});"
};

type Draft = Pick<Pen, "title" | "html" | "css" | "js">;
type PreviewMode = "desktop" | "laptop" | "tablet" | "mobile";
type AssetFilter = "all" | "images" | "svg" | "other";
type ConsoleLevel = "log" | "warn" | "error";
type ScriptLanguage = "javascript" | "typescript";

type ConsoleEntry = {
  id: string;
  level: ConsoleLevel;
  values: string[];
  timestamp: number;
};

type PreviewModeConfig = {
  label: string;
  width: number;
  height: number;
  icon: typeof Laptop;
  frame: "browser" | "tablet" | "mobile";
};

const PREVIEW_MODES: Record<
  PreviewMode,
  PreviewModeConfig
> = {
  desktop: { label: "1440px", width: 1440, height: 900, icon: Laptop, frame: "browser" },
  laptop: { label: "1200px", width: 1200, height: 780, icon: Laptop, frame: "browser" },
  tablet: { label: "768px", width: 768, height: 1024, icon: Tablet, frame: "tablet" },
  mobile: { label: "390px", width: 390, height: 844, icon: Smartphone, frame: "mobile" }
};

const PREVIEW_CANVAS_PADDING = 18;
const PREVIEW_MIN_SCALE = 0.35;
const BROWSER_CHROME_HEIGHT = 32;
const DEVICE_PADDING = 18;
const DEVICE_HARDWARE_HEIGHT = 13;
const DEVICE_HOME_INDICATOR_HEIGHT = 17;

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
  const [previewCanvasSize, setPreviewCanvasSize] = useState({ width: 0, height: 0 });
  const [previewNonce, setPreviewNonce] = useState(0);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [fullscreenPreviewOpen, setFullscreenPreviewOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [penSearch, setPenSearch] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");
  const fullscreenPreviewCanvasRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<number | null>(null);
  const latestDraft = useRef(draft);

  const currentPen = pens.find((pen) => pen.id === currentId) ?? null;
  const shareUrl = currentPen ? `${window.location.origin}/p/${currentPen.slug}` : "";
  const previewModeConfig = previewMode ? PREVIEW_MODES[previewMode] : null;
  const previewOuterSize = previewModeConfig ? getPreviewOuterSize(previewModeConfig) : null;
  const previewScale = previewOuterSize ? getPreviewScale(previewCanvasSize, previewOuterSize) : 1;
  const previewScaleLabel = `${Math.round(previewScale * 100)}%`;
  const previewScaleWrapStyle = previewOuterSize
    ? ({
        width: `${previewOuterSize.width * previewScale}px`,
        height: `${previewOuterSize.height * previewScale}px`
      } as CSSProperties)
    : undefined;
  const previewDeviceStyle =
    previewModeConfig && previewOuterSize
      ? ({
          "--preview-scale": previewScale,
          "--device-width": `${previewOuterSize.width}px`,
          "--device-height": `${previewOuterSize.height}px`,
          "--viewport-width": `${previewModeConfig.width}px`,
          "--viewport-height": `${previewModeConfig.height}px`
        } as CSSProperties)
      : undefined;
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

  useEffect(() => {
    if (!fullscreenPreviewOpen) return;
    const canvas = fullscreenPreviewCanvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      setPreviewCanvasSize({ width: canvas.clientWidth, height: canvas.clientHeight });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [fullscreenPreviewOpen]);

  useEffect(() => {
    if (!fullscreenPreviewOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreenPreviewOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenPreviewOpen]);

  useEffect(() => {
    if (!assetModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAssetModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [assetModalOpen]);

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
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <div className="sidebar-main">
          <button className="new-pen-button" type="button" onClick={() => void handleCreate()}>
            <FilePlus2 size={17} />
            <span>New Pen</span>
            <ChevronDown size={16} />
          </button>

          <label className="search-field">
            <Search size={15} />
            <input value={penSearch} onChange={(event) => setPenSearch(event.target.value)} placeholder="Search pens..." />
          </label>

          <div className="sidebar-section-label">Pens</div>
          <div className="pen-list">
            {filteredPens.map((pen) => (
              <button
                className={`pen-item ${pen.id === currentId ? "active" : ""}`}
                key={pen.id}
                type="button"
                onClick={() => void loadPen(pen.id)}
              >
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

      <section className="workspace">
        <header className="topbar">
          <div className="title-cluster">
            <img className="command-logo" src={cfpenLogoUrl} alt="" aria-hidden="true" />
            <div className="title-stack">
              <input
                aria-label="Pen title"
                className="title-input"
                value={draft.title}
                onChange={(event) => patchDraft({ title: event.target.value })}
              />
              <input
                aria-label="Pen description"
                className="description-input"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
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
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActionsOpen(false);
                        void handleDuplicate();
                      }}
                    >
                      <Copy size={16} />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActionsOpen(false);
                        setAssetModalOpen(true);
                      }}
                    >
                      <ImagePlus size={16} />
                      Assets
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActionsOpen(false);
                        void copyShareUrl();
                      }}
                      disabled={!shareUrl}
                    >
                      <Share2 size={16} />
                      {copied === "Share link" ? "Copied" : "Share"}
                    </button>
                    <a role="menuitem" href={shareUrl || "#"} target="_blank" rel="noreferrer" onClick={() => setActionsOpen(false)}>
                      <ExternalLink size={16} />
                      View
                    </a>
                    <button
                      className="danger-menu-item"
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActionsOpen(false);
                        void handleDelete();
                      }}
                    >
                      <Trash2 size={16} />
                      Delete Pen
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <div className="surface-grid">
          <div className="editor-grid">
            <CodePane title="HTML" tone="html" language="html" value={draft.html} onChange={(html) => patchDraft({ html })} />
            <CodePane title="CSS" tone="css" language="css" value={draft.css} onChange={(css) => patchDraft({ css })} />
            <CodePane
              title={scriptLanguage === "typescript" ? "TS" : "JS"}
              tone={scriptLanguage === "typescript" ? "ts" : "js"}
              language={scriptLanguage}
              footerLabel={scriptLanguage === "typescript" ? "TypeScript" : "JavaScript"}
              value={draft.js}
              onChange={(js) => patchDraft({ js })}
              languageOptions={[
                { label: "JS", value: "javascript" },
                { label: "TS", value: "typescript" }
              ]}
              onLanguageChange={(language) => handleScriptLanguageChange(language as ScriptLanguage)}
            />
            <section className="preview-pane">
              <div className="preview-toolbar">
                <div className="pane-title-text">Preview</div>
                <button className="plain-icon" type="button" onClick={refreshPreview} title="Refresh preview">
                  <RefreshCw size={15} />
                </button>
                <span className="toolbar-spacer" />
                <button className="plain-icon" type="button" onClick={() => setFullscreenPreviewOpen(true)} title="Open fullscreen preview">
                  <Maximize2 size={15} />
                </button>
              </div>
              <div className="preview-canvas auto-preview">
                <div className="preview-auto-frame">
                  <iframe
                    className="preview-frame"
                    key={previewNonce}
                    title="Preview"
                    sandbox="allow-scripts allow-forms allow-modals allow-popups"
                    srcDoc={preview}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        {fullscreenPreviewOpen && (
          <div className="modal-backdrop fullscreen-preview-backdrop" role="presentation" onMouseDown={() => setFullscreenPreviewOpen(false)}>
            <section
              className="fullscreen-preview-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="fullscreen-preview-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header className="fullscreen-preview-header">
                <div className="preview-toolbar-title">
                  <h2 id="fullscreen-preview-title">Preview</h2>
                  <span>{previewModeConfig?.label ?? "Auto"}</span>
                </div>
                <div className="preview-size-controls" aria-label="Preview size">
                  {(Object.entries(PREVIEW_MODES) as Array<[PreviewMode, (typeof PREVIEW_MODES)[PreviewMode]]>).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        className={previewMode === key ? "active" : ""}
                        type="button"
                        key={key}
                        onClick={() => setPreviewMode((currentMode) => (currentMode === key ? null : key))}
                        title={config.label}
                      >
                        <Icon size={16} />
                      </button>
                    );
                  })}
                  <span>{previewModeConfig?.label ?? "Auto"}</span>
                </div>
                <button className="icon-button ghost" type="button" onClick={() => setFullscreenPreviewOpen(false)} aria-label="Close fullscreen preview">
                  <X size={18} />
                </button>
              </header>
              <div className={`preview-canvas fullscreen-preview-canvas ${previewModeConfig ? "" : "auto-preview"}`} ref={fullscreenPreviewCanvasRef}>
                {previewModeConfig && previewScaleWrapStyle && previewDeviceStyle ? (
                  <div className="preview-scale-wrap" style={previewScaleWrapStyle}>
                    <div className={`preview-device ${previewModeConfig.frame}`} style={previewDeviceStyle}>
                      {previewModeConfig.frame === "browser" && (
                        <div className="browser-chrome" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                          <strong>
                            {previewModeConfig.width} x {previewModeConfig.height} · {previewScaleLabel}
                          </strong>
                        </div>
                      )}
                      {previewModeConfig.frame !== "browser" && (
                        <div className="device-hardware" aria-hidden="true">
                          <span />
                          <strong>
                            {previewModeConfig.width} x {previewModeConfig.height} · {previewScaleLabel}
                          </strong>
                        </div>
                      )}
                      <div className="preview-frame-wrap">
                        <iframe
                          className="preview-frame"
                          key={previewNonce}
                          title={`${previewModeConfig.width} by ${previewModeConfig.height} preview`}
                          sandbox="allow-scripts allow-forms allow-modals allow-popups"
                          srcDoc={preview}
                        />
                      </div>
                      {previewModeConfig.frame === "mobile" && <span className="device-home-indicator" aria-hidden="true" />}
                    </div>
                  </div>
                ) : (
                  <div className="preview-auto-frame">
                    <iframe
                      className="preview-frame"
                      key={previewNonce}
                      title="Preview"
                      sandbox="allow-scripts allow-forms allow-modals allow-popups"
                      srcDoc={preview}
                    />
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        <footer className="utility-bar">
          <div className="utility-tabs">
            <button
              className={`utility-tab ${consoleOpen ? "active" : ""} ${hasConsoleErrors ? "error" : "default"}`}
              type="button"
              onClick={() => setConsoleOpen((open) => !open)}
              aria-expanded={consoleOpen}
            >
              <Terminal size={15} />
              Console {consoleEntries.length}
            </button>
          </div>
          <div className="utility-status">
            <span>{currentPen ? `Last saved ${relativeTime(currentPen.updated_at)}` : "Not saved yet"}</span>
          </div>
          {consoleOpen && (
            <div className="utility-panel">
              <ConsolePanel entries={consoleEntries} onClear={() => setConsoleEntries([])} />
            </div>
          )}
        </footer>

        {assetModalOpen && (
          <div className="modal-backdrop" role="presentation" onMouseDown={() => setAssetModalOpen(false)}>
            <section className="asset-modal" role="dialog" aria-modal="true" aria-labelledby="asset-modal-title" onMouseDown={(event) => event.stopPropagation()}>
              <header className="asset-modal-header">
                <div>
                  <span className="dock-kicker">Assets</span>
                  <h2 id="asset-modal-title">Asset Library</h2>
                  <p>{assets.length} resources available for this pen</p>
                </div>
                <div className="asset-modal-actions">
                  <label className="toolbar-button primary">
                    <ImagePlus size={16} />
                    Upload
                    <input type="file" hidden onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)} />
                  </label>
                  <button className="icon-button ghost" type="button" onClick={() => setAssetModalOpen(false)} aria-label="Close assets">
                    <X size={18} />
                  </button>
                </div>
              </header>
              <AssetLibrary
                assets={filteredAssets}
                assetSearch={assetSearch}
                assetFilter={assetFilter}
                copied={copied}
                onSearch={setAssetSearch}
                onFilter={setAssetFilter}
                onCopy={(value, label) => void copyText(value, label)}
                onRename={(asset) => void handleRenameAsset(asset)}
                onDelete={(asset) => void handleDeleteAsset(asset)}
              />
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function CodePane({
  title,
  tone,
  language,
  footerLabel,
  value,
  onChange,
  languageOptions,
  onLanguageChange
}: {
  title: string;
  tone: "html" | "css" | "js" | "ts";
  language: string;
  footerLabel?: string;
  value: string;
  onChange: (value: string) => void;
  languageOptions?: Array<{ label: string; value: string }>;
  onLanguageChange?: (value: string) => void;
}) {
  const badgeText = title.length > 2 ? title.slice(0, 2) : title;

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

function AssetLibrary({
  assets,
  assetSearch,
  assetFilter,
  copied,
  onSearch,
  onFilter,
  onCopy,
  onRename,
  onDelete
}: {
  assets: Asset[];
  assetSearch: string;
  assetFilter: AssetFilter;
  copied: string | null;
  onSearch: (value: string) => void;
  onFilter: (value: AssetFilter) => void;
  onCopy: (value: string, label: string) => void;
  onRename: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}) {
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

function ConsolePanel({ entries, onClear }: { entries: ConsoleEntry[]; onClear: () => void }) {
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

function getPreviewOuterSize(config: PreviewModeConfig): { width: number; height: number } {
  if (config.frame === "browser") {
    return { width: config.width, height: config.height + BROWSER_CHROME_HEIGHT };
  }

  const height = config.height + DEVICE_PADDING * 2 + DEVICE_HARDWARE_HEIGHT + (config.frame === "mobile" ? DEVICE_HOME_INDICATOR_HEIGHT : 0);
  return { width: config.width + DEVICE_PADDING * 2, height };
}

function getPreviewScale(canvasSize: { width: number; height: number }, outerSize: { width: number; height: number }): number {
  if (canvasSize.width <= 0 || canvasSize.height <= 0) {
    return 1;
  }

  const availableWidth = Math.max(1, canvasSize.width - PREVIEW_CANVAS_PADDING * 2);
  const availableHeight = Math.max(1, canvasSize.height - PREVIEW_CANVAS_PADDING * 2);
  const fitScale = Math.min(1, availableWidth / outerSize.width, availableHeight / outerSize.height);
  return Math.max(PREVIEW_MIN_SCALE, fitScale);
}

function lineCount(value: string): number {
  return value.split("\n").length;
}

async function compileScript(source: string, language: ScriptLanguage): Promise<string> {
  if (language === "typescript") {
    return compileTypeScript(source);
  }

  return source;
}

function readScriptLanguage(penId: string): ScriptLanguage {
  return window.localStorage.getItem(scriptLanguageStorageKey(penId)) === "typescript" ? "typescript" : "javascript";
}

function writeScriptLanguage(penId: string, language: ScriptLanguage) {
  window.localStorage.setItem(scriptLanguageStorageKey(penId), language);
}

function scriptLanguageStorageKey(penId: string): string {
  return `cfpen:script-language:${penId}`;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

function parsePreviewMessage(value: unknown): {
  source?: string;
  type?: string;
  level?: ConsoleLevel;
  values?: string[];
  timestamp?: number;
} {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as ReturnType<typeof parsePreviewMessage>;
    } catch {
      return {};
    }
  }

  if (typeof value === "object" && value !== null) {
    return value as ReturnType<typeof parsePreviewMessage>;
  }

  return {};
}

function upsertPen(pens: Pen[], pen: Pen): Pen[] {
  const next = pens.filter((existing) => existing.id !== pen.id);
  next.unshift(pen);
  return next.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

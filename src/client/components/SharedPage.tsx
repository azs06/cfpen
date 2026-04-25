import { Copy, GitFork, Laptop, Smartphone, Tablet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import cfpenLogoUrl from "../assets/cfpen-logo-imagegen.png";
import { forkPen, getSharedPen } from "../lib/api";
import { compileTypeScript } from "../lib/monacoTypeScript";
import { buildPreviewDocument } from "../lib/preview";
import type { Asset, Pen } from "../lib/types";

type PreviewMode = "desktop" | "laptop" | "tablet" | "mobile";

type PreviewModeConfig = {
  label: string;
  width: number;
  height: number;
  icon: typeof Laptop;
  frame: "browser" | "tablet" | "mobile";
};

const PREVIEW_MODES: Record<PreviewMode, PreviewModeConfig> = {
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

export function SharedPage({ slug }: { slug: string }) {
  const [pen, setPen] = useState<Pen | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null);
  const [previewCanvasSize, setPreviewCanvasSize] = useState({ width: 0, height: 0 });
  const previewCanvasRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    getSharedPen(slug)
      .then((data) => {
        setPen(data.pen);
        setAssets(data.assets);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load shared pen.");
      });
  }, [slug]);

  useEffect(() => {
    if (!pen) {
      setPreview("");
      return;
    }

    let isCurrent = true;
    compileTypeScript(pen.js)
      .then((script) => {
        if (isCurrent) {
          setPreview(buildPreviewDocument(pen, script));
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
  }, [pen]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      setPreviewCanvasSize({ width: canvas.clientWidth, height: canvas.clientHeight });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  async function handleFork() {
    if (!pen) return;
    const fork = await forkPen(pen.id);
    window.location.href = `/editor/${fork.id}`;
  }

  if (error) {
    return <main className="center-state">{error}</main>;
  }

  if (!pen) {
    return <main className="center-state">Loading pen...</main>;
  }

  return (
    <main className="shared-shell">
      <header className="shared-header">
        <div className="shared-title-cluster">
          <img className="command-logo" src={cfpenLogoUrl} alt="" aria-hidden="true" />
          <div>
            <div className="brand">CFPen</div>
            <h1>{pen.title}</h1>
          </div>
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
        <div className="shared-actions">
          <button className="toolbar-button" type="button" onClick={() => void navigator.clipboard.writeText(window.location.href)}>
            <Copy size={16} />
            Copy link
          </button>
          <button className="toolbar-button" type="button" onClick={() => void handleFork()}>
            <GitFork size={16} />
            Fork
          </button>
        </div>
      </header>

      <section className="shared-preview">
        <div className={`preview-canvas shared-preview-canvas ${previewModeConfig ? "" : "auto-preview"}`} ref={previewCanvasRef}>
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
              <iframe className="preview-frame" title={pen.title} sandbox="allow-scripts allow-forms allow-modals allow-popups" srcDoc={preview} />
            </div>
          )}
        </div>
      </section>

      {assets.length > 0 && (
        <section className="shared-assets">
          {assets.map((asset) => (
            <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer">
              {asset.filename}
            </a>
          ))}
        </section>
      )}
    </main>
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

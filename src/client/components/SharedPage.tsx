import { Copy, GitFork } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import cfpenLogoUrl from "../assets/cfpen-logo-imagegen.png";
import { forkPen, getSharedPen } from "../lib/api";
import { compileTypeScript } from "../lib/monacoTypeScript";
import { buildPreviewDocument } from "../lib/preview";
import type { Asset, Pen } from "../lib/types";
import { PREVIEW_MODES } from "./editor/constants";
import { PreviewFrame } from "./editor/PreviewFrame";
import { PreviewSizeControls } from "./editor/PreviewSizeControls";
import { formatPreviewScale, getOrientedPreviewModeConfig, getPreviewOuterSize, getPreviewScale } from "./editor/previewSizing";
import type { PreviewMode, PreviewOrientation, PreviewScaleSetting } from "./editor/types";

export function SharedPage({ slug }: { slug: string }) {
  const [pen, setPen] = useState<Pen | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null);
  const [previewOrientation, setPreviewOrientation] = useState<PreviewOrientation>("portrait");
  const [previewScaleSetting, setPreviewScaleSetting] = useState<PreviewScaleSetting>("fit");
  const [previewCanvasSize, setPreviewCanvasSize] = useState({ width: 0, height: 0 });
  const previewCanvasRef = useRef<HTMLDivElement | null>(null);

  const previewModeConfig = previewMode ? getOrientedPreviewModeConfig(PREVIEW_MODES[previewMode], previewOrientation) : null;
  const previewLayout = useMemo(() => {
    if (!previewModeConfig) return null;
    const outerSize = getPreviewOuterSize(previewModeConfig);
    const scale = getPreviewScale(previewCanvasSize, outerSize, previewScaleSetting);
    return {
      scaleLabel: formatPreviewScale(scale),
      scaleWrapStyle: {
        width: `${outerSize.width * scale}px`,
        height: `${outerSize.height * scale}px`
      } as CSSProperties,
      deviceStyle: {
        "--preview-scale": scale,
        "--device-width": `${outerSize.width}px`,
        "--device-height": `${outerSize.height}px`,
        "--viewport-width": `${previewModeConfig.width}px`,
        "--viewport-height": `${previewModeConfig.height}px`
      } as CSSProperties
    };
  }, [previewCanvasSize, previewModeConfig, previewScaleSetting]);

  useEffect(() => {
    if (previewModeConfig?.frame !== "tablet" && previewModeConfig?.frame !== "mobile") {
      setPreviewOrientation("portrait");
    }
  }, [previewModeConfig?.frame]);

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
        <PreviewSizeControls
          previewMode={previewMode}
          previewModeConfig={previewModeConfig}
          previewOrientation={previewOrientation}
          previewScaleSetting={previewScaleSetting}
          previewScaleLabel={previewLayout?.scaleLabel ?? "100%"}
          onPreviewModeChange={setPreviewMode}
          onPreviewOrientationChange={setPreviewOrientation}
          onPreviewScaleChange={setPreviewScaleSetting}
        />
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
          <PreviewFrame
            preview={preview}
            previewNonce={0}
            previewModeConfig={previewModeConfig}
            previewScaleWrapStyle={previewLayout?.scaleWrapStyle}
            previewDeviceStyle={previewLayout?.deviceStyle}
            previewScaleLabel={previewLayout?.scaleLabel ?? "100%"}
          />
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

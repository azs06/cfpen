import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { PREVIEW_MODES } from "./constants";
import { PreviewFrame } from "./PreviewFrame";
import { PreviewSizeControls } from "./PreviewSizeControls";
import { formatPreviewScale, getOrientedPreviewModeConfig, getPreviewOuterSize, getPreviewScale } from "./previewSizing";
import type { PreviewMode, PreviewOrientation, PreviewScaleSetting } from "./types";

type FullscreenPreviewModalProps = {
  preview: string;
  previewNonce: number;
  previewMode: PreviewMode | null;
  onPreviewModeChange: (value: PreviewMode | null) => void;
  onClose: () => void;
};

export function FullscreenPreviewModal({ preview, previewNonce, previewMode, onPreviewModeChange, onClose }: FullscreenPreviewModalProps) {
  const [previewCanvasSize, setPreviewCanvasSize] = useState({ width: 0, height: 0 });
  const [previewOrientation, setPreviewOrientation] = useState<PreviewOrientation>("portrait");
  const [previewScaleSetting, setPreviewScaleSetting] = useState<PreviewScaleSetting>("fit");
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
    <div className="modal-backdrop fullscreen-preview-backdrop" role="presentation" onMouseDown={onClose}>
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
          <PreviewSizeControls
            previewMode={previewMode}
            previewModeConfig={previewModeConfig}
            previewOrientation={previewOrientation}
            previewScaleSetting={previewScaleSetting}
            previewScaleLabel={previewLayout?.scaleLabel ?? "100%"}
            onPreviewModeChange={onPreviewModeChange}
            onPreviewOrientationChange={setPreviewOrientation}
            onPreviewScaleChange={setPreviewScaleSetting}
          />
          <button className="icon-button ghost" type="button" onClick={onClose} aria-label="Close fullscreen preview">
            <X size={18} />
          </button>
        </header>
        <div className={`preview-canvas fullscreen-preview-canvas ${previewModeConfig ? "" : "auto-preview"}`} ref={previewCanvasRef}>
          <PreviewFrame
            preview={preview}
            previewNonce={previewNonce}
            previewModeConfig={previewModeConfig}
            previewScaleWrapStyle={previewLayout?.scaleWrapStyle}
            previewDeviceStyle={previewLayout?.deviceStyle}
            previewScaleLabel={previewLayout?.scaleLabel ?? "100%"}
          />
        </div>
      </section>
    </div>
  );
}

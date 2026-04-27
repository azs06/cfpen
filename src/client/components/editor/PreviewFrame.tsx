import type { CSSProperties } from "react";
import { getPreviewFrameKey } from "../../lib/preview";
import type { PreviewModeConfig } from "./types";

type PreviewFrameProps = {
  preview: string;
  previewNonce: number;
  previewModeConfig: PreviewModeConfig | null;
  previewScaleWrapStyle?: CSSProperties;
  previewDeviceStyle?: CSSProperties;
  previewScaleLabel: string;
};

export function PreviewFrame({
  preview,
  previewNonce,
  previewModeConfig,
  previewScaleWrapStyle,
  previewDeviceStyle,
  previewScaleLabel
}: PreviewFrameProps) {
  const previewFrameKey = getPreviewFrameKey(preview, previewNonce);

  if (!previewModeConfig || !previewScaleWrapStyle || !previewDeviceStyle) {
    return (
      <div className="preview-auto-frame">
        <iframe className="preview-frame" key={previewFrameKey} title="Preview" sandbox="allow-scripts allow-forms allow-modals allow-popups" srcDoc={preview} />
      </div>
    );
  }

  return (
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
            key={previewFrameKey}
            title={`${previewModeConfig.width} by ${previewModeConfig.height} preview`}
            sandbox="allow-scripts allow-forms allow-modals allow-popups"
            srcDoc={preview}
          />
        </div>
        {previewModeConfig.frame === "mobile" && <span className="device-home-indicator" aria-hidden="true" />}
      </div>
    </div>
  );
}

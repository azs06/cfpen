import { RotateCw, X } from "lucide-react";
import { PREVIEW_MODES } from "./constants";
import { PREVIEW_SCALE_OPTIONS, formatPreviewScale } from "./previewSizing";
import type { PreviewMode, PreviewModeConfig, PreviewOrientation, PreviewScaleSetting } from "./types";

type PreviewSizeControlsProps = {
  previewMode: PreviewMode | null;
  previewModeConfig: PreviewModeConfig | null;
  previewOrientation: PreviewOrientation;
  previewScaleSetting: PreviewScaleSetting;
  previewScaleLabel: string;
  onPreviewModeChange: (value: PreviewMode | null) => void;
  onPreviewOrientationChange: (value: PreviewOrientation) => void;
  onPreviewScaleChange: (value: PreviewScaleSetting) => void;
};

export function PreviewSizeControls({
  previewMode,
  previewModeConfig,
  previewOrientation,
  previewScaleSetting,
  previewScaleLabel,
  onPreviewModeChange,
  onPreviewOrientationChange,
  onPreviewScaleChange
}: PreviewSizeControlsProps) {
  const canRotate = previewModeConfig?.frame === "tablet" || previewModeConfig?.frame === "mobile";

  return (
    <div className="preview-size-controls" aria-label="Preview size">
      {(Object.entries(PREVIEW_MODES) as Array<[PreviewMode, (typeof PREVIEW_MODES)[PreviewMode]]>).map(([key, config]) => {
        const Icon = config.icon;
        return (
          <button
            className={previewMode === key ? "active" : ""}
            type="button"
            key={key}
            onClick={() => onPreviewModeChange(previewMode === key ? null : key)}
            title={config.label}
          >
            <Icon size={16} />
          </button>
        );
      })}
      <span className="preview-size-label">{previewModeConfig?.label ?? "Auto"}</span>
      {previewMode && (
        <>
          {canRotate && (
            <button
              className="preview-rotate-button"
              type="button"
              onClick={() => onPreviewOrientationChange(previewOrientation === "portrait" ? "landscape" : "portrait")}
              title={`Rotate to ${previewOrientation === "portrait" ? "landscape" : "portrait"}`}
              aria-label={`Rotate preview to ${previewOrientation === "portrait" ? "landscape" : "portrait"}`}
            >
              <RotateCw size={15} />
            </button>
          )}
          <select
            aria-label="Preview scale"
            title="Preview scale"
            value={String(previewScaleSetting)}
            onChange={(event) => {
              const value = event.target.value;
              onPreviewScaleChange(value === "fit" ? "fit" : (Number(value) as PreviewScaleSetting));
            }}
          >
            {PREVIEW_SCALE_OPTIONS.map((option) => (
              <option key={option} value={String(option)}>
                {option === "fit" ? `Fit (${previewScaleLabel})` : formatPreviewScale(option)}
              </option>
            ))}
          </select>
          <button className="preview-exit-button" type="button" onClick={() => onPreviewModeChange(null)} title="Exit responsive preview" aria-label="Exit responsive preview">
            <X size={15} />
          </button>
        </>
      )}
    </div>
  );
}

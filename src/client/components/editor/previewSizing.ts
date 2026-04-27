import type { PreviewModeConfig, PreviewOrientation, PreviewScaleSetting } from "./types";

const PREVIEW_CANVAS_PADDING = 18;
const PREVIEW_MIN_SCALE = 0.35;
const BROWSER_CHROME_HEIGHT = 32;
const DEVICE_PADDING = 18;
const DEVICE_HARDWARE_HEIGHT = 13;
const DEVICE_HOME_INDICATOR_HEIGHT = 17;

export const PREVIEW_SCALE_OPTIONS: PreviewScaleSetting[] = ["fit", 0.25, 0.5, 0.75, 1, 1.25, 1.5];

export function getOrientedPreviewModeConfig(config: PreviewModeConfig, orientation: PreviewOrientation): PreviewModeConfig {
  if (orientation === "portrait" || (config.frame !== "tablet" && config.frame !== "mobile")) {
    return config;
  }

  return {
    ...config,
    label: `${config.height}px`,
    width: config.height,
    height: config.width
  };
}

export function getPreviewOuterSize(config: PreviewModeConfig): { width: number; height: number } {
  if (config.frame === "browser") {
    return { width: config.width, height: config.height + BROWSER_CHROME_HEIGHT };
  }

  const height = config.height + DEVICE_PADDING * 2 + DEVICE_HARDWARE_HEIGHT + (config.frame === "mobile" ? DEVICE_HOME_INDICATOR_HEIGHT : 0);
  return { width: config.width + DEVICE_PADDING * 2, height };
}

export function getPreviewScale(
  canvasSize: { width: number; height: number },
  outerSize: { width: number; height: number },
  scaleSetting: PreviewScaleSetting
): number {
  if (scaleSetting !== "fit") {
    return scaleSetting;
  }

  if (canvasSize.width <= 0 || canvasSize.height <= 0) {
    return 1;
  }

  const availableWidth = Math.max(1, canvasSize.width - PREVIEW_CANVAS_PADDING * 2);
  const availableHeight = Math.max(1, canvasSize.height - PREVIEW_CANVAS_PADDING * 2);
  const fitScale = Math.min(1, availableWidth / outerSize.width, availableHeight / outerSize.height);
  return Math.max(PREVIEW_MIN_SCALE, fitScale);
}

export function formatPreviewScale(value: number): string {
  return `${Math.round(value * 100)}%`;
}

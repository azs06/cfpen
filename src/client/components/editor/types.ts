import type { Laptop } from "lucide-react";
import type { Pen } from "../../lib/types";

export type Draft = Pick<Pen, "title" | "html" | "css" | "js">;
export type PreviewMode = "desktop" | "laptop" | "tablet" | "mobile";
export type PreviewOrientation = "portrait" | "landscape";
export type PreviewScaleSetting = "fit" | 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5;
export type AssetFilter = "all" | "images" | "svg" | "other";
export type ConsoleLevel = "log" | "warn" | "error";
export type ScriptLanguage = "javascript" | "typescript";
export type PaneKey = "html" | "css" | "js";
export type CollapsedPanes = Record<PaneKey, boolean>;

export type ConsoleEntry = {
  id: string;
  level: ConsoleLevel;
  values: string[];
  timestamp: number;
};

export type PreviewModeConfig = {
  label: string;
  width: number;
  height: number;
  icon: typeof Laptop;
  frame: "browser" | "tablet" | "mobile";
};

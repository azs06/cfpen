import type { Pen } from "../../lib/types";
import { compileTypeScript } from "../../lib/monacoTypeScript";
import type { ConsoleLevel, ScriptLanguage } from "./types";

export async function compileScript(source: string, language: ScriptLanguage): Promise<string> {
  if (language === "typescript") {
    return compileTypeScript(source);
  }

  return source;
}

export function readScriptLanguage(penId: string): ScriptLanguage {
  return window.localStorage.getItem(scriptLanguageStorageKey(penId)) === "typescript" ? "typescript" : "javascript";
}

export function writeScriptLanguage(penId: string, language: ScriptLanguage) {
  window.localStorage.setItem(scriptLanguageStorageKey(penId), language);
}

function scriptLanguageStorageKey(penId: string): string {
  return `cfpen:script-language:${penId}`;
}

export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function relativeTime(value: string): string {
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

export function parsePreviewMessage(value: unknown): {
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

export function upsertPen(pens: Pen[], pen: Pen): Pen[] {
  const next = pens.filter((existing) => existing.id !== pen.id);
  next.unshift(pen);
  return next.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

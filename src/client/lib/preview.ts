import type { Pen } from "./types";

export function buildPreviewDocument(pen: Pick<Pen, "html" | "css">, script: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
${pen.css}
    </style>
  </head>
  <body>
${pen.html}
    <script>
${CONSOLE_BRIDGE}
    </script>
    <script>
      try {
${script}
      } catch (error) {
        window.__cfpenReportError(error);
        document.body.insertAdjacentHTML("beforeend", "<pre style='color:#b00020;background:#fff0f0;padding:12px;white-space:pre-wrap;'>" + String(error && error.stack || error) + "</pre>");
      }
    </script>
  </body>
</html>`;
}

const CONSOLE_BRIDGE = `
      window.__cfpenSerializeConsoleValue = function(value) {
        try {
          if (value instanceof Error) return value.stack || value.message;
          if (typeof value === "string") return value;
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      };
      window.__cfpenPostConsole = function(level, values) {
        window.parent.postMessage(JSON.stringify({
          source: "cfpen-preview",
          type: "console",
          level,
          values: Array.prototype.map.call(values, window.__cfpenSerializeConsoleValue),
          timestamp: Date.now()
        }), "*");
      };
      window.__cfpenReportError = function(error) {
        window.__cfpenPostConsole("error", [error && (error.stack || error.message) || error]);
      };
      ["log", "warn", "error"].forEach(function(level) {
        var original = console[level];
        console[level] = function() {
          window.__cfpenPostConsole(level, arguments);
          return original.apply(console, arguments);
        };
      });
      window.addEventListener("error", function(event) {
        window.__cfpenReportError(event.error || event.message);
      });
      window.addEventListener("unhandledrejection", function(event) {
        window.__cfpenReportError(event.reason || "Unhandled promise rejection");
      });
`;

import { Laptop, Smartphone, Tablet } from "lucide-react";
import type { Draft, PreviewMode, PreviewModeConfig } from "./types";

export const STARTER: Draft = {
  title: "Untitled Pen",
  html: "<main class=\"card\">\n  <span>2026</span>\n  <h1>Design with Code.</h1>\n  <p>A modern, lightweight editor for building beautiful web experiences.</p>\n  <button id=\"action\">Explore Features</button>\n</main>",
  css: ":root {\n  --bg: #0f1115;\n  --card: #15171c;\n  --text: #f7fafc;\n  --muted: #9aa4b2;\n  --accent: #22d3ee;\n  --accent-2: #ff725e;\n}\n\n* { box-sizing: border-box; }\n\nbody {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  font-family: Inter, system-ui, sans-serif;\n  background:\n    radial-gradient(800px 420px at 0% 100%, rgba(34, 211, 238, .42), transparent),\n    radial-gradient(720px 360px at 100% 0%, rgba(255, 114, 94, .38), transparent),\n    var(--bg);\n  color: var(--text);\n}\n\n.card {\n  width: min(560px, calc(100vw - 32px));\n  border: 1px solid rgba(255,255,255,.12);\n  border-radius: 18px;\n  padding: 38px;\n  background: rgba(21, 23, 28, .82);\n  box-shadow: 0 24px 80px rgba(0,0,0,.35);\n}\n\nspan { color: var(--accent); font-weight: 800; }\nh1 { margin: 12px 0; font-size: clamp(32px, 6vw, 56px); }\np { color: var(--muted); line-height: 1.6; }\nbutton {\n  border: 0;\n  border-radius: 999px;\n  padding: .8rem 1rem;\n  background: var(--accent);\n  color: #061012;\n  font-weight: 800;\n}",
  js: "console.log('CFPen preview ready');\n\ndocument.querySelector('#action')?.addEventListener('click', () => {\n  console.warn('Exploring features');\n});"
};

export const PREVIEW_MODES: Record<PreviewMode, PreviewModeConfig> = {
  desktop: { label: "1440px", width: 1440, height: 900, icon: Laptop, frame: "browser" },
  laptop: { label: "1200px", width: 1200, height: 780, icon: Laptop, frame: "browser" },
  tablet: { label: "768px", width: 768, height: 1024, icon: Tablet, frame: "tablet" },
  mobile: { label: "390px", width: 390, height: 844, icon: Smartphone, frame: "mobile" }
};

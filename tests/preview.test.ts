import { describe, expect, it } from "vitest";
import { buildPreviewDocument } from "../src/client/lib/preview";

describe("buildPreviewDocument", () => {
  it("injects compiled scripts into preview documents", () => {
    const document = buildPreviewDocument(
      {
      html: "<button id=\"action\">Run</button>",
      css: ""
      },
      "const button = document.querySelector('#action');\nbutton?.click();"
    );

    expect(document).toContain("document.querySelector('#action')");
    expect(document).toContain('source: "cfpen-preview"');
    expect(document).toContain("unhandledrejection");
  });
});

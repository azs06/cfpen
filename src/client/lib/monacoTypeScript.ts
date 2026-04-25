import ts from "typescript";

export async function compileTypeScript(source: string): Promise<string> {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.None,
      noEmitOnError: false,
      strict: true,
      target: ts.ScriptTarget.ES2020
    },
    reportDiagnostics: true
  });

  const diagnostics = result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) ?? [];
  if (diagnostics.length > 0) {
    return errorScript(formatDiagnostics(diagnostics));
  }

  return result.outputText;
}

function formatDiagnostics(diagnostics: readonly ts.Diagnostic[]): string {
  return diagnostics.map(formatDiagnostic).filter(Boolean).join("\n");
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  const location = typeof diagnostic.start === "number" ? `preview.ts:${diagnostic.start}` : "preview.ts";
  return `${location} - TS${diagnostic.code}: ${formatMessage(diagnostic.messageText)}`;
}

function formatMessage(message: string | ts.DiagnosticMessageChain): string {
  if (typeof message === "string") {
    return message;
  }

  const next = message.next?.map((child) => formatMessage(child.messageText)).join("\n") ?? "";
  return next ? `${message.messageText}\n${next}` : message.messageText;
}

function errorScript(message: string): string {
  return `throw new Error(${JSON.stringify(message)});`;
}
